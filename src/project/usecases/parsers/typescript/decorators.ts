import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {IGeneratedCode, tab} from '../../helpers';

export interface IGiiTsClassDecorator {
    name: string,
    oldName?: string,
    arguments: (string | Record<string, any>)[],
}

export const parseDecorators = (project: IGiiProject, file: IGiiFile, modifiers: any): IGiiTsClassDecorator[] => {
    const result: IGiiTsClassDecorator[] = [];
    for (const modifier of modifiers) {
        if (!modifier.expression) {
            continue;
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
        result.push({
            name: modifier.expression.expression.escapedText,
            oldName: modifier.expression.expression.escapedText,
            arguments: decoratorArgs,
        });
    }
    return result;
};

export const generateDecorators = (project: IGiiProject, file: IGiiFile, decorators: IGiiTsClassDecorator[]): IGeneratedCode => {
    const imports = [];
    const argumentsCode = [];
    for (const argument of decorator.arguments) {
        const [argumentCode, argumentImports] = generateObjectValue(project, null, argument);
        if (argumentCode) {
            argumentsCode.push(argumentCode);
        }
        imports.push(...argumentImports);
    }

    return [
        tab() + '@' + decorator.name + '('
        + argumentsCode.filter(Boolean).join(', ')
        + ')',
        imports,
    ];
};
