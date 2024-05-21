import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateDecorators, IGiiTsDecorator, parseDecorators} from './decorators';
import {generateItemsByConfig, IGeneratedFragments, tab} from '../../helpers';
import {parseObjectValue} from './objectValue';

export interface IGiiTsProperty {
    name: string,
    oldName?: string,
    jsType?: string,
    isArray?: boolean,
    isStatic?: boolean,
    decorators?: IGiiTsDecorator[],
    defaultValue?: string,
    // _raw?: string,
}

const getTypeNameByKind = (tsType: any) => {
    switch (tsType?.kind) {
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
            }[tsType?.kind] || '';
    }
};

const parsePropertyName = member => [SyntaxKind.PropertyDeclaration, SyntaxKind.Parameter].includes(member.kind) ? member.name.escapedText : null;

const parseProperty = (project: IGiiProject, file: IGiiFile, member: any): IGiiTsProperty => {
    const name = parsePropertyName(member);
    if (!name) {
        return null;
    }

    const decorators = member.decorators || member.modifiers || [];

    const isArray = member?.type?.kind === SyntaxKind.ArrayType;
    const isStatic = !!member?.modifiers?.find(modifier => modifier.kind === SyntaxKind.StaticKeyword);
    const jsType = getTypeNameByKind(member?.type);

    return {
        name,
        oldName: name,
        jsType,
        isArray,
        isStatic,
        decorators: parseDecorators(project, file, decorators),
        defaultValue: member.initializer
            ? JSON.stringify(parseObjectValue(project, file, member.initializer))
            : null,
        // _raw: file.code.substring(findNonSpaceSymbolFrom(file.code, member.pos), member.end),
    };
};

export const parseProperties = (
    project: IGiiProject,
    file: IGiiFile,
    members: any,
): IGiiTsProperty[] => members
    .map(member => parseProperty(project, file, member))
    .filter(Boolean);

export const generateProperties = (
    project: IGiiProject,
    file: IGiiFile,
    properties: IGiiTsProperty[],
    node = null,
    options?: {
        identLevel?: number,
        inline?: boolean,
        nodeItemsKey?: string,
        itemsSeparator?: string,
        endSeparator?: string,
    },
): IGeneratedFragments => {
    options = {
        identLevel: 0,
        inline: false,
        nodeItemsKey: 'members',
        itemsSeparator: '\n',
        endSeparator: ';',
        ...options,
    };

    // Detect end position
    const endPos = node?.[options.nodeItemsKey]
        .filter(member => member.kind === SyntaxKind.PropertyDeclaration)
        .at(-1)
        ?.end
        || node?.[options.nodeItemsKey]?.[0]?.end
        || (node?.heritageClauses?.end ? node?.heritageClauses.end + 3 : null)
        || node?.name.end + 3
        || 0;

    return generateItemsByConfig(
        (node?.[options.nodeItemsKey] || []).filter(member => !!parsePropertyName(member)),
        properties,
        {
            endPos,
            parseName: parsePropertyName,
            parseItem: (itemNode) => parseProperty(project, file, itemNode),
            itemsSeparator: options.itemsSeparator,
            renderCode: (property: IGiiTsProperty, itemNode) => {
                const type = property.jsType
                    ? property.jsType + (property.isArray ? '[]' : '')
                    : null;

                const [decoratorsFragments, decoratorsImports] = generateDecorators(
                    project,
                    file,
                    property.decorators || [],
                    itemNode?.modifiers || null,
                    options.identLevel,
                );
                let decoratorsCode = (decoratorsFragments || []).map(({replacement}) => replacement).join('');
                if (options.inline) {
                    decoratorsCode = decoratorsCode.replace(/\n$/, '');
                }

                return [
                    // @Decor()
                    decoratorsCode
                    // myProp: number = 100,
                    + (options.inline && decoratorsCode ? ' ' : tab(options.identLevel))
                    + (property.isStatic ? 'static ' : '')
                    + property.name
                    + (type ? ': ' + type : '')
                    + (typeof property.defaultValue !== 'undefined' && property.defaultValue !== null
                        ? ' = ' + property.defaultValue
                        : '')
                    + options.endSeparator + '\n',
                    decoratorsImports,
                ];
            },
        },
    );
};
