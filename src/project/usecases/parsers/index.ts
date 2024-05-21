import {generateModel, parseModel, PARSER_NEST_MODEL} from './nest/model';
import {generateDto, parseDto, PARSER_NEST_DTO} from './nest/dto';
import {generateEnum, parseEnum, PARSER_NEST_ENUM} from './nest/enum';
import {generatePermissions, parsePermissions, PARSER_NEST_PERMISSIONS} from './nest/permissions';
import {IGiiFile} from './file';
import {IGiiProject} from './project';

const parsers = {
    [PARSER_NEST_MODEL]: [parseModel, generateModel],
    [PARSER_NEST_DTO]: [parseDto, generateDto],
    [PARSER_NEST_ENUM]: [parseEnum, generateEnum],
    [PARSER_NEST_PERMISSIONS]: [parsePermissions, generatePermissions],
};

export const parse = (project: IGiiProject, type: string, file: IGiiFile) => {
    const parser: (project: IGiiProject, file: IGiiFile) => any = parsers[type]?.[0];
    if (!parser) {
        throw new Error('Not found parser for parse, type: ' + type);
    }
    return parser(project, file);
};

export const generate = (project: IGiiProject, type: string, file: IGiiFile, dto: any): IGiiFile[] => {
    const generator: (project: IGiiProject, file: IGiiFile, dto: any) => any = parsers[type]?.[1];
    if (!generator) {
        throw new Error('Not found parser for generate, type: ' + type);
    }

    return generator(project, file, dto);
};
