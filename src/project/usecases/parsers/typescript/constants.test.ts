import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateConstants, IGiiTsConstant, parseConstants} from './constants';
import {IGeneratedCode} from '../../helpers';

export const project: IGiiProject = {
    name: 'test',
    path: process.cwd(),
    structure: [],
};

const file: IGiiFile = {
    id: 'src/project/usecases/parsers/typescript/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/typescript/test.ts'),
    name: 'test',
    ext: 'ts',
    code: `
export let testConst1 = false;
export const testConst2 = 123;
export const testConst3 = 'testConst';
    `,
};

describe('constants test', () => {
    it('parse', () => {
        expect(parseConstants(project, file)).toEqual([
            {
                name: 'testConst1',
                oldName: 'testConst1',
                value: false,
                type: 'let',
                isExport: true,
            },
            {
                name: 'testConst2',
                oldName: 'testConst2',
                value: 123,
                type: 'const',
                isExport: true,
            },
            {
                name: 'testConst3',
                oldName: 'testConst3',
                value: 'testConst',
                type: 'const',
                isExport: true,
            },
        ] as IGiiTsConstant[]);
    });

    it('generate del all', () => {
        expect(generateConstants(project, file, []))
            .toEqual([
                '\n    ',
                [],
            ] as IGeneratedCode);
    });

    it('generate upd', () => {
        expect(
            generateConstants(
                project,
                file,
                [
                    {
                        name: 'testConst1',
                        oldName: 'testConst1',
                        value: false,
                        type: 'const',
                        isExport: true,
                    },
                    {
                        name: 'testConst2',
                        oldName: 'testNEWNEWConst1',
                        value: 123,
                        type: 'let',
                        isExport: true,
                    },
                    {
                        name: 'testConst5',
                        oldName: 'testConst5',
                        value: 'asd',
                        type: 'let',
                        isExport: true,
                    },
                ],
            ),
        ).toEqual([
            "\nexport const testConst1 = false;\nexport let testConst2 = 123;\nexport let testConst5 = 'asd';\n    ",
            [],
        ] as IGeneratedCode);
    });

    it('generate from empty', () => {
        const constants = parseConstants(project, file);
        const emptyFile = {
            ...file,
            code: '\n    ',
        };
        expect(
            generateConstants(
                project,
                emptyFile,
                constants,
            ),
        ).toEqual([
            file.code,
            [],
        ] as IGeneratedCode);
    });
});
