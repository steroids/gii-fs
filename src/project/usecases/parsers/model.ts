import {IGiiFile, loadFile} from './file';
import {generateDto, IGiiDto, parseDto, PARSER_DTO} from './dto';
import {findInProjectStructure, findManyInProjectStructure, IGiiProject, IGiiStructureItem} from './project';
import {PARSER_MODULE} from './module';
import {IGiiDtoField} from './dtoField';

export const PARSER_MODEL = 'model';

export interface IGiiModelField extends IGiiDtoField {
    dtos?: Record<string, boolean>,
}

export interface IGiiModel extends IGiiDto {
    fields: IGiiModelField[],
    dtoNames: string[],
}

const findModuleDtos = (project, file): IGiiStructureItem[] => {
    const module = findManyInProjectStructure(project.structure, ({type}) => type === PARSER_MODULE)
        .find(({items}) => findInProjectStructure(items, file.id));
    return findManyInProjectStructure(module.items, ({type}) => type === PARSER_DTO);
};

// Ищем dto, в которых поля наследуются от текущей модели
const findRelativeDtos = (project, file): [IGiiDto[], any] => {
    const dtos = findModuleDtos(project, file)
        .map(({id}) => parseDto(project, loadFile(project.path, id)))
        .filter(({fieldsExtend}) => fieldsExtend === file.id);
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

export function parseModel(project: IGiiProject, file: IGiiFile): IGiiModel {
    const [dtos, fieldsDtosMap] = findRelativeDtos(project, file);

    const model = parseDto(project, file);
    return {
        ...model,
        fields: (model.fields || []).map(field => ({
            ...field,
            dtos: fieldsDtosMap[field.name] || {},
        })),
        dtoNames: dtos.map(dto => dto.name),
    };
}

export function generateModel(project: IGiiProject, file: IGiiFile, model: IGiiModel): IGiiFile[] {
    const result: IGiiFile[] = [];
    const structureDtos = findModuleDtos(project, file);

    for (const structureDto of structureDtos) {
        const dtoFile = loadFile(project.path, structureDto.id);
        const dto = parseDto(project, dtoFile);

        if (!dto.fieldsExtend || dto.fieldsExtend !== file.id) {
            continue;
        }

        let hasChanges = false;

        for (const modelField of model.fields) {
            const dtoField = dto.fields.find(({name}) => name === modelField.oldName);
            const isSelected = modelField.dtos[dto.name];

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
