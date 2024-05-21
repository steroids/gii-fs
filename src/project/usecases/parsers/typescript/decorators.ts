import {SyntaxKind} from 'typescript';
import {max as _max} from 'lodash';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {findNonSpaceSymbolFrom, generateItemsByConfig, IGeneratedFragments, tab} from '../../helpers';

export interface IGiiTsDecorator {
    name: string,
    oldName?: string,
    arguments: (string | Record<string, any>)[],
}

const parseDecoratorName = modifier => modifier?.expression?.expression?.escapedText;

const parseDecorator = (project: IGiiProject, file: IGiiFile, modifier: any): IGiiTsDecorator => {
    if (!modifier.expression) {
        return null;
    }

    const decoratorArgs = [];
    for (const argument of modifier.expression.arguments) {
        switch (argument.kind) {
            case SyntaxKind.Identifier:
                decoratorArgs.push(parseObjectValue(project, file, argument));
                break;

            case SyntaxKind.StringLiteral:
                decoratorArgs.push(parseObjectValue(project, file, argument));
                break;

            case SyntaxKind.ObjectLiteralExpression:
                const argumentObject = {};
                for (const property of argument.properties || []) {
                    const key = property.name?.escapedText;
                    const value = parseObjectValue(project, file, property.initializer);
                    if (key) {
                        argumentObject[key] = value;
                    }
                }
                decoratorArgs.push(argumentObject);
                break;

            default:
                decoratorArgs.push(file.code.substring(argument.pos, argument.end));
                break;
        }
    }

    const name = parseDecoratorName(modifier);
    return {
        name,
        oldName: name,
        arguments: decoratorArgs,
    };
};

export const parseDecorators = (
    project: IGiiProject,
    file: IGiiFile,
    modifiers: any,
): IGiiTsDecorator[] => modifiers
    .map(modifier => parseDecorator(project, file, modifier)).filter(Boolean);

export const generateDecorators = (
    project: IGiiProject,
    file: IGiiFile,
    decorators: IGiiTsDecorator[],
    classNode = null,
    identLevel = 0,
): IGeneratedFragments => {
    const modifiers = (classNode?.modifiers || []).filter(modifier => !!parseDecoratorName(modifier));
    const endPos = findNonSpaceSymbolFrom(
        file.code,
        _max(modifiers.map(({end}) => end)) || 0,
    );

    return generateItemsByConfig(
        modifiers,
        decorators,
        {
            endPos,
            parseName: parseDecoratorName,
            parseItem: (node) => parseDecorator(project, file, node),
            itemsSeparator: '',
            renderCode: (decorator: IGiiTsDecorator) => {
                const imports = [];
                const argumentsCode = [];
                for (const argument of decorator.arguments) {
                    const [argumentCode, argumentImports] = generateObjectValue(project, null, argument, identLevel);
                    if (argumentCode) {
                        argumentsCode.push(argumentCode);
                    }
                    imports.push(...argumentImports);
                }

                return [
                    tab(identLevel) + '@' + decorator.name + '('
                    + argumentsCode.filter(Boolean).join(', ')
                    + ')\n',
                    imports,
                ];
            },
        },
    );
};
