import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiTsClass, parseClass} from './class';
import {IGiiProject} from '../project';

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
    code: '\n'
        + '/**\n'
        + '* Вызов метода get\n'
        + '* @param url URL для HTTP-запроса.\n'
        + '* @param params Параметры для запроса.\n'
        + '*/\n'
        + "@Api('auth')\n"
        + "@TestDecorator({name: 'Ivan', count: 1})\n"
        + 'export class AuthConfirmLoginDto {\n'
        + '}\n',
};

describe('class test', () => {
    it('parse', () => {
        expect(parseClass(project, file)).toEqual({
            name: 'AuthConfirmLoginDto',
            oldName: 'AuthConfirmLoginDto',
            description: 'Вызов метода get',
            descriptionTags: [
                {name: 'param',
                    value: 'URL для HTTP-запроса.'}, {
                    name: 'param',
                    value: 'Параметры для запроса.',
                },
            ],
            decorators: [
                {
                    arguments: ['auth'],
                    name: 'Api',
                    oldName: 'Api',
                },
                {
                    arguments: [
                        {
                            count: 1,
                            name: 'Ivan',
                        },
                    ],
                    name: 'TestDecorator',
                    oldName: 'TestDecorator',
                },
            ],
            properties: [],
        } as IGiiTsClass);
    });
});
