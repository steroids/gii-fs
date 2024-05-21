import * as path from 'path';
import {IGiiFile, loadFile} from '../file';
import {generateDto, IGiiDto, parseDto} from './dto';
import {findInProjectStructure, findManyInProjectStructure, IGiiProject} from '../project';
import {PARSER_NEST_MODULE} from './module';
import {IGiiDtoField} from './dtoFields';
import {IGiiPermissions, parsePermissions} from './permissions';
import {findModuleDtos, findRelativeDtos} from './helpers';

export const PARSER_NEST_MODEL = 'model';

export interface IGiiModelField extends IGiiDtoField {
    dtos?: Record<string, boolean>,
}

export interface IGiiModel extends IGiiDto {
    fields: IGiiModelField[],
    dtoNames: string[],
    modulePermissions?: IGiiPermissions,
}

export function parseModel(project: IGiiProject, file: IGiiFile): IGiiModel {
    const [dtos, fieldsDtosMap] = findRelativeDtos(project, file.id);

    const module = findManyInProjectStructure(project.structure, ({type}) => type === PARSER_NEST_MODULE)
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
