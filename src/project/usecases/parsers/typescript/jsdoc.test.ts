import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {createAst, updateFileContent} from '../../helpers';
import {generateJsdoc, IGiiTsJsdoc, parseJsdoc} from './jsdoc';

export const project: IGiiProject = {
    name: 'test',
    path: process.cwd(),
    structure: [],
};

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/typescript/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/typescript/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

const file: IGiiFile = {
    ...emptyFile,
    code: `
/**
 * Вызов метода get
 * second line...
 * @param url URL для HTTP-запроса.
 * @param params Параметры для запроса.
 */
@Api('auth')
export class AuthConfirmLoginDto {}`,
};

describe('jsdoc test', () => {
    it('parse', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(parseJsdoc(project, file, node))
            .toEqual({
                description: 'Вызов метода get\nsecond line...',
                tags: [
                    {
                        content: 'URL для HTTP-запроса.',
                        name: 'param',
                        value: 'url',
                    },
                    {
                        content: 'Параметры для запроса.',
                        name: 'param',
                        value: 'params',
                    },
                ],
            } as IGiiTsJsdoc);
    });

    it('generate', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);
        const jsdoc = parseJsdoc(project, file, node);
        expect(
            updateFileContent(
                emptyFile.code,
                generateJsdoc(
                    project,
                    emptyFile,
                    jsdoc,
                    null,
                )[0],
            ),
        )
            .toEqual(`/**
 * Вызов метода get
 * second line...
 * @param url URL для HTTP-запроса.
 * @param params Параметры для запроса.
 */
`);
    });
});
