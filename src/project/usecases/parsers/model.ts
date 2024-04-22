import * as path from 'path';
import {IGiiFile, loadFile} from './file';
import {generateDto, IGiiDto, parseDto, PARSER_DTO} from './dto';
import {findInProjectStructure, findManyInProjectStructure, IGiiProject, IGiiStructureItem} from './project';
import {PARSER_MODULE} from './module';
import {IGiiDtoField} from './dtoField';
import {basename} from '../helpers';
import {IGiiPermissions, parsePermissions} from './permissions';

export const PARSER_MODEL = 'model';

export interface IGiiModelField extends IGiiDtoField {
    dtos?: Record<string, boolean>,
}

export interface IGiiModel extends IGiiDto {
    fields: IGiiModelField[],
    dtoNames: string[],
    modulePermissions?: IGiiPermissions,
}

export const findModuleDtos = (project, fileId: string): IGiiStructureItem[] => {
    const module = findManyInProjectStructure(project.structure, ({type}) => type === PARSER_MODULE)
        .find(({items}) => findInProjectStructure(items, fileId));
    return findManyInProjectStructure(module.items, ({type}) => type === PARSER_DTO);
};

// Ищем dto, в которых поля наследуются от текущей модели
export const findRelativeDtos = (project, fileId): [IGiiDto[], any] => {
    const dtos = findModuleDtos(project, fileId)
        .map(({id}) => parseDto(project, loadFile(project.path, id)))
        .filter(({fieldsExtend}) => fieldsExtend === fileId);
    const fieldsDtosMap = {};
    for (const dto of dtos) {
        for (const field of dto.fields) {
            if (!fieldsDtosMap[field.name]) {
                fieldsDtosMap[field.name] = {};
            }
            fieldsDtosMap[field.name][dto.name] = true;
        }
    }

    return [dtos, fieldsDtosMap];
};

export const findRelatedDtoForModelRelationField = (
    project: IGiiProject,
    originalDtoName: string,
    originalModelName: string,
    relativeModelName: string,
) => {
    // Находим имя модели без "Model", по этому префиксу будем искать другие dto

    // Наиболее приоритетные суффиксы dto/scheme, которые будем искать
    const prioritySuffixes = basename(originalDtoName).endsWith('Schema')
        ? [
            'Schema',
            'DetailSchema',
            'EnumSchema',
        ]
        : [
            'SaveDto',
            'Dto',
        ];

    // Находим приоритетный суффикс по переданному имени dto
    const originalModelBaseName = originalModelName.replace(/Model$/, '');
    if (basename(originalDtoName).startsWith(originalModelBaseName)) {
        prioritySuffixes.unshift(basename(originalDtoName).substring(originalModelBaseName.length));
    }

    // Находим все похожие dto
    const relatedDtos = findManyInProjectStructure(
        project.structure,
        item => item.type === PARSER_DTO
            && basename(item.name) !== originalDtoName,
    ).filter(dto => {
        const dtoFile = loadFile(project.path, dto.id);
        const fieldsExtend = parseDto(project, dtoFile)?.fieldsExtend;
        return fieldsExtend && basename(fieldsExtend) === relativeModelName;
    });

    // Если похожих нет
    if (!relatedDtos) {
        return null;
    }

    let relatedDto = null;

    // Ищем сначала dto по приоритетным суффиксам
    for (const prioritySuffix of prioritySuffixes) {
        relatedDto = relatedDtos.find(item => basename(item.id).endsWith(prioritySuffix));
        if (relatedDto) {
            return relatedDto;
        }
    }

    // Если не нашли среди приоритетных — берём первую попавшуюся
    return relatedDtos?.[0];
};

export function parseModel(project: IGiiProject, file: IGiiFile): IGiiModel {
    const [dtos, fieldsDtosMap] = findRelativeDtos(project, file.id);

    const module = findManyInProjectStructure(project.structure, ({type}) => type === PARSER_MODULE)
        .find(({items}) => findInProjectStructure(items, file.id));
    const modulePermissionsFile = loadFile(project.path, path.join(module.id, 'infrastructure/permissions.ts'));
    const modulePermissions = parsePermissions(project, modulePermissionsFile);

    const model = parseDto(project, file);
    return {
        ...model,
        fields: (model.fields || []).map(field => ({
            ...field,
            dtos: fieldsDtosMap[field.name] || {},
        })),
        dtoNames: dtos.map(dto => dto.name),
        modulePermissions,
    };
}

export function generateModel(project: IGiiProject, file: IGiiFile, model: IGiiModel): IGiiFile[] {
    const result: IGiiFile[] = [];
    const structureDtos = findModuleDtos(project, file.id);

    for (const structureDto of structureDtos) {
        const dtoFile = loadFile(project.path, structureDto.id);
        const dto = parseDto(project, dtoFile);

        if (!dto.fieldsExtend || dto.fieldsExtend !== file.id) {
            continue;
        }

        let hasChanges = false;

        for (const modelField of model.fields) {
            const dtoField = dto.fields.find(({name}) => name === modelField.oldName);
            const isSelected = !!modelField.dtos?.[dto.name];

            // Not field and select? - add field
            if (!dtoField && isSelected) {
                dto.fields.push({
                    name: modelField.name,
                    oldName: modelField.name,
                    type: 'ExtendField',
                    extend: model.id,
                });
                hasChanges = true;
            } else if (dtoField && !isSelected) {
                // Has field and not select? - remove field
                dto.fields = dto.fields.filter(({name}) => name !== modelField.name);
                hasChanges = true;
            } else if (dtoField && isSelected && modelField.name !== modelField.oldName) {
                // Change field name?
                dtoField.name = modelField.name;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            result.push(...generateDto(project, dtoFile, dto));
        }
    }

    result.unshift(...generateDto(project, file, model));

    return result;
}
