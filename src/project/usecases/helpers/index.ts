import * as ts from 'typescript';
import * as path from 'path';
import {ScriptTarget} from 'typescript';
import {IGiiFile} from '../parsers/file';
import {IGiiImport} from '../parsers/imports';

export type IGeneratedCode = [string, IGiiImport[]];

export function tab(count = 1) {
    return '    '.repeat(count);
}

export function basename(name) {
    return path.basename(name).replace(/\.[^.]+$/, '');
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
        sizeOffset += (fragmentToUpdate.replacement.length - (end - start - 1));
    }
    return fileContent;
}
