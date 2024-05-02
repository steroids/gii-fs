import * as ts from 'typescript';
import * as path from 'path';
import {ScriptTarget, SyntaxKind} from 'typescript';
import {IGiiFile} from '../parsers/file';
import {IGiiImport} from '../parsers/imports';
import {IGiiProject} from '../parsers/project';
import {generateObjectValue} from '../parsers/typescript/objectValue';
import {IGiiTsConstant} from '../parsers/typescript/constants';

export type IGeneratedCode = [string, IGiiImport[]];

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
export function updateFileContent(fileContent, fragmentsToUpdate: IFragmentToUpdate | IFragmentToUpdate[]) {
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

export const generateItemsByConfig = (
    nodes,
    dataList,
    config: {
        endPos: number,
        selectNameByNode: (node) => string,
        nameKey: string,
        oldNameKey: string,
    },
): IGeneratedCode => {
    config = {
        endPos: 0,
        nameKey: 'name',
        oldNameKey: 'oldName',
        ...config,
    };

    const imports = [];
    const fragments = [];

    // Удаляем старые поля
    const oldNames = dataList.map(data => data[config.oldNameKey]);
    fragments.push(
        ...nodes
            .filter(item => !oldNames.includes(config.selectNameByNode(item)))
            .map(item => ({
                start: item.pos,
                end: item.end,
                replacement: '',
            })),
    );

    // Обновляем существующие поля
    for (const data of dataList) {
        const node = nodes.find(node => data[config.oldNameKey] === config.selectNameByNode(node));
        const oldConstant = node ? parseConstant(project, file, node) : null;

        if (!oldConstant || !_isEqual(oldConstant, data)) {
            const [valueCode, valueImports] = generateObjectValue(project, data.name, data.value);

            imports.push(...valueImports);
            fragments.push({
                start: node ? node.pos : endPos,
                end: node ? node.end : endPos,
                replacement: '\n' + [
                    data.isExport && 'export',
                    data.type,
                    data.name,
                    '=',
                    valueCode + ';',
                ].filter(Boolean).join(' '),
            });
        }
    }

    return [
        updateFileContent(file.code, fragments),
        imports,
    ];
};
