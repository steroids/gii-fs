import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateConstants, IGiiTsConstant, parseConstants} from './constants';
import {updateFileContent} from '../../helpers';

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
        expect(updateFileContent(
            file.code,
            generateConstants(project, file, [])[0],
        ))
            .toEqual('\n    ');
    });

    it('generate upd', () => {
        expect(
            updateFileContent(
                emptyFile.code,
                generateConstants(
                    project,
                    emptyFile,
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
                )[0],
            ),
        ).toEqual(`export const testConst1 = false;
export let testConst2 = 123;
export let testConst5 = 'asd';`);
    });

    it('generate from empty', () => {
        const constants = parseConstants(project, file);
        expect(
            updateFileContent(
                emptyFile.code,
                generateConstants(
                    project,
                    emptyFile,
                    constants,
                )[0],
            ),
        ).toEqual(file.code.trim());
    });
});
