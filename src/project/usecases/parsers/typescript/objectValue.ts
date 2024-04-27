import {SyntaxKind} from 'typescript';
import * as path from 'path';
import {IGeneratedCode} from '../../helpers';
import {parseImports} from './imports';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';

export function parseObjectValue(project: IGiiProject, file: IGiiFile, initializer) {
    if (initializer?.kind === SyntaxKind.FalseKeyword) {
        return false;
    }

    if (initializer?.kind === SyntaxKind.TrueKeyword) {
        return true;
    }

    if (initializer?.kind === SyntaxKind.StringLiteral && !initializer?.text) {
        return '';
    }

    if (initializer?.kind === SyntaxKind.PropertyAccessExpression) {
        return initializer.expression?.escapedText;
    }

    if (initializer?.kind === SyntaxKind.NumericLiteral) {
        return Number(initializer.text);
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

    return initializer;
}

export function generateObjectValue(project: IGiiProject, optionName: string, fieldValue: any): IGeneratedCode {
    return [
        typeof fieldValue === 'string'
            ? fieldValue
            : String(fieldValue),
        [],
    ];
}
