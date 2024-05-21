import {loadFile} from '../file';
import {IGiiDto, parseDto, PARSER_NEST_DTO} from './dto';
import {findInProjectStructure, findManyInProjectStructure, IGiiProject, IGiiStructureItem} from '../project';
import {PARSER_NEST_MODULE} from './module';
import {basename} from '../../helpers';

export const findExtendField = (project, extendClassFileId, fieldName) => {
    const modelFile = loadFile(project.path, extendClassFileId);
    const model = parseDto(project, modelFile);
    return model.fields.find(({name}) => fieldName === name);
};

export const findModuleDtos = (project, fileId: string): IGiiStructureItem[] => {
    const module = findManyInProjectStructure(project.structure, ({type}) => type === PARSER_NEST_MODULE)
        .find(({items}) => findInProjectStructure(items, fileId));
    return findManyInProjectStructure(module?.items || [], ({type}) => type === PARSER_NEST_DTO);
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
        item => item.type === PARSER_NEST_DTO
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
