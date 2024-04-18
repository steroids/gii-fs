import {generateModel, parseModel, PARSER_MODEL} from './model';
import {generateDto, parseDto, PARSER_DTO} from './dto';
import {generateEnum, parseEnum, PARSER_ENUM} from './enum';
import {IGiiFile} from './file';
import {IGiiProject} from './project';

const parsers = {
    [PARSER_MODEL]: [parseModel, generateModel],
    [PARSER_DTO]: [parseDto, generateDto],
    [PARSER_ENUM]: [parseEnum, generateEnum],
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
