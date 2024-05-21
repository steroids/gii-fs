import {SyntaxKind} from 'typescript';
import {max as _max} from 'lodash';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {
    generateObjectValue,
    parseObjectValue,
    toObjectKeyExpression,
    toObjectValueExpression,
} from './objectValue';
import {findNonSpaceSymbolFrom, generateItemsByConfig, IGeneratedFragments, tab} from '../../helpers';
import {generateDecorators, IGiiTsDecorator, parseDecorators} from './decorators';
import {generateProperties, IGiiTsProperty, parseProperties} from './properties';

export interface IGiiTsClassMethodReturn {
    value: any, // {foo: new ObjectValueExpression('this.MY_CONST'), ...}
}

export interface IGiiTsClassMethod {
    name: string,
    oldName?: string,
    isAsync?: boolean,
    isStatic?: boolean,
    decorators?: IGiiTsDecorator[],
    arguments?: IGiiTsProperty[],
    bodyReturn?: IGiiTsClassMethodReturn,
}

const parseMethodName = member => member.kind === SyntaxKind.MethodDeclaration ? member?.name?.escapedText : null;

const parseMethodBodyReturn = (project: IGiiProject, file: IGiiFile, body): IGiiTsClassMethodReturn => {
    const statement = body?.statements?.find(({kind}) => kind === SyntaxKind.ReturnStatement);

    if (statement.expression.kind === SyntaxKind.ObjectLiteralExpression) {
        const value = {};
        for (const property of statement.expression.properties) {
            if (property.kind === SyntaxKind.PropertyAssignment) {
                const key = toObjectKeyExpression(file.code.substring(findNonSpaceSymbolFrom(file.code, property.name.pos), property.name.end));
                value[key] = parseObjectValue(project, file, property.initializer);
            }
        }

        return {value};
    }

    return {
        value: toObjectValueExpression(
            file.code.substring(findNonSpaceSymbolFrom(file.code, statement.expression.pos), statement.expression.end),
        ),
    };
};
const parseMethod = (project: IGiiProject, file: IGiiFile, member: any): IGiiTsClassMethod => {
    const name = parseMethodName(member);
    if (!name) {
        return null;
    }

    return {
        name,
        oldName: name,
        isAsync: !!member.modifiers.find(({kind}) => kind === SyntaxKind.AsyncKeyword),
        isStatic: !!member.modifiers.find(({kind}) => kind === SyntaxKind.StaticKeyword),
        decorators: parseDecorators(project, file, member.modifiers),
        arguments: parseProperties(project, file, member.parameters || []),
        bodyReturn: parseMethodBodyReturn(project, file, member.body),
    };
};

export const parseMethods = (
    project: IGiiProject,
    file: IGiiFile,
    members: any,
): IGiiTsClassMethod[] => members
    .map(member => parseMethod(project, file, member)).filter(Boolean);

export const generateMethods = (
    project: IGiiProject,
    file: IGiiFile,
    methods: IGiiTsClassMethod[],
    classNode = null,
    identLevel = 0,
): IGeneratedFragments => {
    const members = (classNode?.members || []).filter(member => !!parseMethodName(member));
    const endPos = members.at(-1)?.end
        || members?.[0]?.end
        || (classNode?.heritageClauses?.end ? classNode?.heritageClauses.end + 3 : null)
        || classNode?.name.end + 3
        || 0;

    return generateItemsByConfig(
        members,
        methods,
        {
            endPos,
            parseName: parseMethodName,
            parseItem: (node) => parseMethod(project, file, node),
            itemsSeparator: '',
            renderCode: (method: IGiiTsClassMethod, node) => {
                const [decoratorsFragments, decoratorsImports] = generateDecorators(
                    project,
                    file,
                    method.decorators || [],
                    null,
                    identLevel,
                );
                const decoratorsCode = (decoratorsFragments || []).map(({replacement}) => replacement).join('');

                const isMultilineArguments = method.arguments?.length > 1;
                const [argumentsFragments, argumentsImports] = generateProperties(
                    project,
                    file,
                    method.arguments || [],
                    null,
                    {
                        identLevel: isMultilineArguments ? identLevel + 1 : 0,
                        inline: true,
                        itemsSeparator: '',
                        endSeparator: ',',
                    },
                );
                const argumentsCode = (argumentsFragments || []).map(({replacement}) => replacement).join('');

                const [bodyCode, bodyImports] = generateObjectValue(
                    project,
                    null,
                    method.bodyReturn?.value,
                    identLevel + 1,
                );

                return [
                    decoratorsCode
                    + tab(identLevel) + (method.isStatic ? 'static ' : '') + (method.isAsync ? 'async ' : '') + method.name + '('
                    + (isMultilineArguments ? '\n' : '')
                    + argumentsCode
                    + (argumentsCode ? tab(identLevel) : '') + ') {\n'
                    + (bodyCode
                        ? tab(identLevel + 1) + 'return ' + bodyCode + ';\n'
                        : '')
                    + tab(identLevel) + '}\n',
                    [
                        ...decoratorsImports,
                        ...argumentsImports,
                        ...bodyImports,
                    ],
                ];
            },
        },
    );
};
