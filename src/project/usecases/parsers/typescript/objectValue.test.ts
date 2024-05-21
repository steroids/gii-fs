import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {createAst} from '../../helpers';

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
export const testConst1 = false;
export const testConst2 = 123;
export const testConst3 = 'testConst';
export const testConst3 = {foo: 4818, bar: 'Ivanov', qwe: {one: 1, two: 2, five: 555}};
    `,
};

describe('object value test', () => {
    it('parse', () => {
        const nodes: any = createAst(file)
            .filter(statement => statement.kind === SyntaxKind.VariableStatement);
        const parseOne = index => parseObjectValue(
            project,
            file,
            nodes[index].declarationList.declarations[0].initializer,
        );

        expect(parseOne(0)).toEqual(false);
        expect(parseOne(1)).toEqual(123);
        expect(parseOne(2)).toEqual('testConst');
        expect(parseOne(3)).toEqual({
            foo: 4818,
            bar: 'Ivanov',
            qwe: {
                one: 1,
                two: 2,
                five: 555,
            },
        });
    });

    it('generate', () => {
        expect(generateObjectValue(project, 'foo', 4818))
            .toEqual([
                '4818',
                [],
            ]);
        expect(generateObjectValue(project, 'bar', 'Ivanov'))
            .toEqual([
                "'Ivanov'",
                [],
            ]);
        expect(
            generateObjectValue(
                project,
                'qwe',
                {
                    one: 1,
                    two: 2,
                    five: 555,
                },
            )[0],
        )
            .toEqual(`{
    one: 1,
    two: 2,
    five: 555,
}`);
    });
});
