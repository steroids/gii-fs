import {basename, updateFileContent} from '../../helpers';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateClass, IGiiTsClass, parseClass} from '../typescript/class';
import {generateDtoFields, IGiiDtoField, parseDtoFields} from './dtoFields';
import {replaceImports} from '../typescript/imports';

export interface IGiiDto {
    id: string,
    name: string,
    oldName: string,
    description?: string,
    fields: IGiiDtoField[],
    fieldsExtend?: string,
}

export const PARSER_NEST_DTO = 'dto';
const DTO_TAG_EXTEND_MODEL = 'extend-model';

export function parseDto(project: IGiiProject, file: IGiiFile): IGiiDto {
    const data = parseClass(project, file);

    const dto: IGiiDto = {
        id: file.id,
        name: data.name,
        oldName: data.oldName,
        description: data.description,
        fields: parseDtoFields(project, file, data.properties),
    };

    dto.fieldsExtend = data.descriptionTags
        ?.find(tag => tag.name === DTO_TAG_EXTEND_MODEL)
        ?.value
    || dto.fields
        ?.find(field => field.type === 'ExtendField' && !!field.extend)
        ?.extend
    || null;

    return dto;
}

export function generateDto(project: IGiiProject, file: IGiiFile, dto: IGiiDto): IGiiFile[] {
    const prevData = parseClass(project, file);

    const [properties, propertiesImports] = generateDtoFields(
        project,
        file,
        dto.fields || [],
        prevData?.properties,
    );

    const data: IGiiTsClass = {
        ...prevData,
        name: dto.name,
        oldName: dto.oldName,
        description: dto.description,
        properties,
        descriptionTags: dto.fieldsExtend
            ? [{
                name: DTO_TAG_EXTEND_MODEL,
                value: basename(dto.fieldsExtend),
            }]
            : [],
    };

    const [fragments, classImports] = generateClass(project, file, data);
    const newFile = {...file};
    newFile.code = updateFileContent(newFile.code, fragments);
    newFile.code = replaceImports(
        project,
        newFile,
        [
            ...propertiesImports,
            ...classImports,
        ],
    );

    return [
        newFile,
    ];
}
