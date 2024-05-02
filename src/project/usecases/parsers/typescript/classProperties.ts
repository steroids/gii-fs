import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject, findInProjectStructure} from '../project';
import {IGiiTsClassDecorator, parseDecorator} from './decorators';

export interface IGiiTsClassProperty {
    name: string,
    oldName?: string,
    jsType?: string,
    isArray?: boolean,
    decorators: IGiiTsClassDecorator[],
}

const ARRAY_SYMBOL = '[]';

const normalizeItemName = (itemName: string) => itemName + '.ts';

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
        case SyntaxKind.TypeReference:
            return '';
        default:
            return null;
    }
};

export const parseClassProperty = (project: IGiiProject, file: IGiiFile, tsMember: any): IGiiTsClassProperty => {
    const decorators = tsMember.decorators || tsMember.modifiers || [];

    const isArray = tsMember.type.kind === SyntaxKind.ArrayType;

    let jsType = '';
    if (tsMember.type.kind === SyntaxKind.TypeReference) {
        jsType = findInProjectStructure(
            project.structure,
            item => item.name === normalizeItemName(tsMember.type.typeName.escapedText),
        ).id;
    } else {
        jsType = isArray
            ? getTypeNameByKind(tsMember.type.elementType.kind) + ARRAY_SYMBOL
            : getTypeNameByKind(tsMember.type.kind);
    }

    return {
        name: tsMember.name.escapedText,
        oldName: tsMember.name.escapedText,
        jsType,
        isArray,
        decorators: decorators.map(decorator => parseDecorator(project, file, decorator)),
    };
};
