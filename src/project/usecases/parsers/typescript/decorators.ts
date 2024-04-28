import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {parseObjectValue} from '../objectValue';

export interface IGiiTsClassDecorator {
    name: string,
    oldName?: string,
    arguments: (string | Record<string, any>)[],
}

export const parseDecorator = (project: IGiiProject, file: IGiiFile, decorator: any): IGiiTsClassDecorator => {
    const decoratorArgs = [];

    if (!decorator.expression) {
        return null;
    }

    for (const argument of decorator.expression.arguments) {
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
                break;
        }
    }
    return {
        name: decorator.expression.expression.escapedText,
        oldName: decorator.expression.expression.escapedText,
        arguments: decoratorArgs,
    };
};
