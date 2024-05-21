import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {generateClass, IGiiTsClass, parseClass} from './class';
import {IGiiProject} from '../project';
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
    code: '\n'
        + '/**\n'
        + '* Вызов метода get\n'
        + '* second line\n'
        + '* @param url URL для HTTP-запроса.\n'
        + '* @param params Параметры для запроса.\n'
        + '*/\n'
        + "@Api('auth')\n"
        + "@TestDecorator({name: 'Ivan', count: 1})\n"
        + 'export class AuthConfirmLoginDto {\n'
        + '    @StringField({\n'
        + "        label: 'Название',\n"
        + '        required: true,\n'
        + '    })\n'
        + '    name: string;\n'
        + '}\n',
};

describe('class test', () => {
    it('parse', () => {
        expect(parseClass(project, file)).toEqual({
            name: 'AuthConfirmLoginDto',
            oldName: 'AuthConfirmLoginDto',
            description: 'Вызов метода get\nsecond line',
            descriptionTags: [
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
            properties: [
                {
                    name: 'name',
                    oldName: 'name',
                    jsType: 'string',
                    isArray: false,
                    isStatic: false,
                    defaultValue: null,
                    decorators: [
                        {
                            name: 'StringField',
                            oldName: 'StringField',
                            arguments: [
                                {
                                    label: 'Название',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            ],
            methods: [],
        } as IGiiTsClass);
    });

    it('generate', () => {
        const data = parseClass(project, file);
        expect(
            updateFileContent(
                emptyFile.code,
                generateClass(project, emptyFile, data)[0],
            ),
        )
            .toEqual(`

/**
 * Вызов метода get
 * second line
 * @param url URL для HTTP-запроса.
 * @param params Параметры для запроса.
 */
@Api('auth')
@TestDecorator({
    name: 'Ivan',
    count: 1,
})
export class AuthConfirmLoginDto {
    @StringField({
        label: 'Название',
        required: true,
    })
    name: string;
}
`);
    });
});
