import {SyntaxKind} from 'typescript';
import {has as _has} from 'lodash';
import * as path from 'path';
import {IGeneratedCode, tab} from '../../helpers';
import {parseImports} from './imports';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';

export class ObjectValueExpression {
    public value;

    constructor(value) {
        this.value = value;
    }

    toJSON() {
        return {__valueExpression: this.value};
    }
}

export function parseObjectValue(project: IGiiProject, file: IGiiFile, initializer) {
    switch (initializer?.kind) {
        case SyntaxKind.FalseKeyword:
            return false;

        case SyntaxKind.TrueKeyword:
            return true;

        case SyntaxKind.PropertyAccessExpression:
            return initializer.expression?.escapedText;

        case SyntaxKind.NumericLiteral:
            return Number(initializer.text);

        case SyntaxKind.StringLiteral:
            return initializer.text || '';

        case SyntaxKind.ObjectLiteralExpression:
            return initializer.properties.reduce(
                (obj, item) => {
                    obj[item.name.escapedText] = parseObjectValue(project, file, item.initializer);
                    return obj;
                },
                {},
            );

        default:
            break;
    }

    // Пока что inverseSide получается как строка, нужно подумать, как с ней работать в дальнейшем
    if (initializer?.kind === SyntaxKind.ArrowFunction || initializer?.kind === SyntaxKind.Identifier) {
        let className;
        switch (initializer?.kind) {
            case SyntaxKind.Identifier:
                className = initializer.escapedText;
                break;
            case SyntaxKind.ArrowFunction:
                if (initializer.body.kind === SyntaxKind.Identifier) {
                    className = initializer.body.escapedText;
                }
                break;
            default:
                break;
        }
        if (className) {
            if (file.name === className) {
                return file.path;
            }
            const importItem = parseImports(file)
                .find(item => item.names.includes(className) || item.default === className);
            if (importItem) {
                const basePath = path.join(project.path, '/');
                if (importItem.path.startsWith(basePath)) {
                    return importItem.path.substring(basePath.length);
                }
                return importItem.path;
            }
            throw new Error('Not found path for Identifier: ' + className + '. File: ' + file.path);
        }
        return null;
    }

    if (initializer?.text) {
        return initializer.text;
    }

    throw new Error('Cannot parse object value (kind ' + initializer.kind + '): ' + JSON.stringify(initializer));
}

export function generateObjectValue(project: IGiiProject, optionName: string, fieldValue: any): IGeneratedCode {
    let code;
    if (fieldValue instanceof ObjectValueExpression
        || (typeof fieldValue === 'object' && _has(fieldValue, '__valueExpression'))) {
        code = fieldValue.__valueExpression || fieldValue.value;
    } else if (typeof fieldValue === 'string') {
        code = "'" + fieldValue + "'";
    } else if (fieldValue && typeof fieldValue === 'object') {
        code = JSON.stringify(fieldValue, null, tab(2))
            .replace(/"([a-z0-9_]+)":/gi, '$1:')
            .replace(/"/g, "'"); // TODO generate object as js code (not json with quotes)
    } else {
        code = String(fieldValue);
    }

    return [
        code,
        [],
    ];
}
