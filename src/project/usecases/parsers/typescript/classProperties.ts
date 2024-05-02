import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {IGiiTsClassDecorator, parseDecorators} from './decorators';

export interface IGiiTsClassProperty {
    name: string,
    oldName?: string,
    jsType?: string,
    isArray?: boolean,
    decorators: IGiiTsClassDecorator[],
}

const getTypeNameByKind = (tsType: any) => {
    switch (tsType.kind) {
        case SyntaxKind.ArrayType:
            return getTypeNameByKind(tsType.elementType);

        case SyntaxKind.TypeReference:
            return tsType.typeName.escapedText;

        default:
            return {
                [SyntaxKind.StringKeyword]: 'string',
                [SyntaxKind.NumberKeyword]: 'number',
                [SyntaxKind.BooleanKeyword]: 'boolean',
                [SyntaxKind.ObjectKeyword]: 'object',
            }[tsType.kind] || 'any';
    }
};

export const parseClassProperty = (project: IGiiProject, file: IGiiFile, tsMember: any): IGiiTsClassProperty => {
    const decorators = tsMember.decorators || tsMember.modifiers || [];

    const isArray = tsMember.type.kind === SyntaxKind.ArrayType;
    const jsType = getTypeNameByKind(tsMember.type);

    return {
        name: tsMember.name.escapedText,
        oldName: tsMember.name.escapedText,
        jsType,
        isArray,
        decorators: parseDecorators(project, file, decorators),
    };
};
