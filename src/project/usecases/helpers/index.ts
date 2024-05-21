import * as ts from 'typescript';
import * as path from 'path';
import {isEqual as _isEqual} from 'lodash';
import {ScriptTarget} from 'typescript';
import {IGiiFile} from '../parsers/file';
import {IGiiTsImport} from '../parsers/typescript/imports';

export interface IGiiReplacementFragment {
    start: number,
    end: number,
    replacement: string,
}

export type IGeneratedCode = [string, IGiiTsImport[]];
export type IGeneratedFragments = [IGiiReplacementFragment[], IGiiTsImport[]];

export function tab(count = 1) {
    return '    '.repeat(count);
}

export function basename(name) {
    return path.basename(name).replace(/\.[^.]+$/, '');
}

export function trimFileExtension(value) {
    return value.replace(/\.[^.]+$/, '');
}

export function strReplaceAt(str: string, indexStart: number, indexEnd: number, replacement: string) {
    return str.substring(0, indexStart) + replacement + str.substring(indexEnd);
}

export function createAst(file: IGiiFile, target: ScriptTarget = ts.ScriptTarget.Latest) {
    return ts.createSourceFile(
        `thisFileWillNotBeCreated${Date.now()}.ts`,
        file.code,
        target,
    ).statements;
}

interface IFragmentToUpdate {
    start: number,
    end: number,
    replacement: string,
}
export function updateFileContent(fileContent: string, fragmentsToUpdate: IFragmentToUpdate | IFragmentToUpdate[]) {
    if (!Array.isArray(fragmentsToUpdate)) {
        fragmentsToUpdate = [fragmentsToUpdate];
    }
    fragmentsToUpdate = fragmentsToUpdate.sort((a, b) => +a.start - b.start);
    let sizeOffset = 0;
    for (const fragmentToUpdate of fragmentsToUpdate) {
        const start = fragmentToUpdate.start;
        const end = fragmentToUpdate.end;

        fileContent = strReplaceAt(
            fileContent,
            start + sizeOffset,
            end + sizeOffset,
            fragmentToUpdate.replacement,
        );
        sizeOffset += (fragmentToUpdate.replacement.length - (end - start));
    }
    return fileContent;
}

export function findNonSpaceSymbolFrom(content, startPos) {
    for (let i = startPos; i < content.length; i += 1) {
        if (!/\s/.test(content.substring(i, i + 1))) {
            return i;
        }
    }
    return content.length - 1;
}

export const generateItemsByConfig = (
    nodes,
    dataList,
    config: {
        endPos?: number,
        parseName: (node) => string,
        parseItem: (node) => any,
        renderCode: (item, node) => IGeneratedCode,
        itemsSeparator?: string,
        nameKey?: string,
        oldNameKey?: string,
    },
): IGeneratedFragments => {
    config = {
        // Detect pos for new decorators
        endPos: nodes.length > 0 ? nodes[nodes.length - 1].end : 0,
        itemsSeparator: '\n',
        nameKey: 'name',
        oldNameKey: 'oldName',
        ...config,
    };

    const imports: IGiiTsImport[] = [];
    const fragments: IGiiReplacementFragment[] = [];

    // Удаляем старые поля
    const oldNames = dataList.map(data => data[config.oldNameKey]);
    fragments.push(
        ...nodes
            .filter(item => !oldNames.includes(config.parseName(item)))
            .map(item => ({
                start: item.pos,
                end: item.end,
                replacement: '',
            })),
    );

    // Обновляем существующие поля
    for (const data of dataList) {
        const node = nodes.find(item => data[config.oldNameKey] === config.parseName(item));
        const oldData = node ? config.parseItem(node) : null;

        if (!oldData || !_isEqual(oldData, data)) {
            const [valueCode, valueImports] = config.renderCode(data, node);

            const start = node ? node.pos : config.endPos;
            const end = node ? node.end : config.endPos;
            const replacement = (nodes.length > 0 || fragments.length > 0 ? config.itemsSeparator : '') + valueCode;

            fragments.push({
                start,
                end,
                replacement,
            });
            imports.push(...valueImports);
        }
    }

    return [
        fragments,
        imports,
    ];
};
