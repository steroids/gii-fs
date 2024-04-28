import {SyntaxKind} from 'typescript';
import e from 'express';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {IGiiTsClassDecorator, parseDecorator} from './decorators';

export interface IGiiTsClassProperty {
    name: string,
    oldName?: string,
    jsType?: string,
    isArray?: boolean,
    decorators: IGiiTsClassDecorator[],
}

// возможно есть решение лучше, чем так перебирать типы, тогда можно его здесь применить
const getTypeNameByKind = (kind: number) => {
    switch (kind) {
        case SyntaxKind.StringKeyword:
            return 'string';
        case SyntaxKind.NumberKeyword:
            return 'number';
        case SyntaxKind.BooleanKeyword:
            return 'boolean';
        case SyntaxKind.AnyKeyword:
            return 'any';
        case SyntaxKind.UnknownKeyword:
            return 'unknown';
        case SyntaxKind.ObjectKeyword:
            return 'object';
        default:
            return null;
    }
};

export const parseClassProperty = (project: IGiiProject, file: IGiiFile, tsMember: any): IGiiTsClassProperty => {
    const decorators = tsMember.decorators || tsMember.modifiers || [];

    const isArray = tsMember.type.kind === SyntaxKind.ArrayType;
    const jsType = getTypeNameByKind(isArray ? tsMember.type.elementType.kind : tsMember.type.kind);

    return {
        name: tsMember.name.escapedText,
        oldName: tsMember.name.escapedText,
        jsType,
        isArray,
        decorators: decorators.map(decorator => parseDecorator(project, file, decorator)),
    };
};
