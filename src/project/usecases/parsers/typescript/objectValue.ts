import {SyntaxKind} from 'typescript';
import {has as _has} from 'lodash';
import * as path from 'path';
import {IGeneratedCode, tab} from '../../helpers';
import {parseImports} from './imports';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';

export const OBJECT_KEY_EXPRESSION_START = '__keyExpressionStart__';
export const OBJECT_KEY_EXPRESSION_END = '__keyExpressionEnd__';

class ObjectValueExpression {
    public __valueExpression;

    constructor(value) {
        this.__valueExpression = value;
    }

    getValue() {
        return this.__valueExpression;
    }

    toJSON() {
        return {__valueExpression: this.__valueExpression};
    }
}

export const toObjectKeyExpression = value => OBJECT_KEY_EXPRESSION_START + value + OBJECT_KEY_EXPRESSION_END;
export const toObjectValueExpression = value => new ObjectValueExpression(value);

export function isObjectValueExpression(value) {
    return value && typeof value === 'object' && (value instanceof ObjectValueExpression || _has(value, '__valueExpression'));
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
        let initializerName;
        switch (initializer?.kind) {
            case SyntaxKind.Identifier:
                initializerName = initializer.escapedText;
                break;
            case SyntaxKind.ArrowFunction:
                if (initializer.body.kind === SyntaxKind.Identifier) {
                    initializerName = initializer.body.escapedText;
                }
                break;
            default:
                break;
        }

        // is class name?
        if (/^[A-Z][a-zA-Z0-9]+$/.test(initializerName)) {
            if (file.name === initializerName) {
                return file.path;
            }
            const importItem = parseImports(project, file)
                .find(item => item.names.includes(initializerName) || item.default === initializerName);
            if (importItem) {
                const basePath = path.join(project.path, '/');
                return importItem.giiId;
            }
        }

        return new ObjectValueExpression(initializerName);
    }

    if (initializer?.text) {
        return initializer.text;
    }

    throw new Error('Cannot parse object value (kind ' + initializer.kind + '): ' + JSON.stringify(initializer));
}

export function generateObjectValue(project: IGiiProject, optionName: string, fieldValue: any, identLevel = 0): IGeneratedCode {
    let code;
    if (fieldValue instanceof ObjectValueExpression
        || (typeof fieldValue === 'object' && _has(fieldValue, '__valueExpression'))) {
        code = fieldValue.__valueExpression;
    } else if (typeof fieldValue === 'string') {
        code = "'" + fieldValue + "'";
    } else if (fieldValue && typeof fieldValue === 'object') {
        code = JSON.stringify(fieldValue, null, tab(1))
            .replace(/"([a-z0-9_]+)":/gi, '$1:')
            .replace(/(\s+)}$/, ',$1}')
            .replace(/\n/g, '\n' + tab(identLevel))
            .replace(/"/g, "'")
            .replace(new RegExp("'" + OBJECT_KEY_EXPRESSION_START, 'g'), '')
            .replace(new RegExp(OBJECT_KEY_EXPRESSION_END + "'", 'g'), '')
            .replace(/{\s+__valueExpression: '([^']+)'\s+}/g, '$1'); // TODO generate object as js code (not json with quotes)
    } else {
        code = String(fieldValue);
    }

    return [
        code,
        [],
    ];
}
