import {describe, expect, it} from '@jest/globals';
import {IGiiTs, parseTs} from '../project/usecases/parsers/typescript';
import {mockProject} from './mocks/mockProject';
import {mockFile} from './mocks/mockFile';

describe('parseTs test', () => {
    it('should return correct giiTs', () => {
        const giiTs = parseTs(mockProject, mockFile);

        const expectedTs: IGiiTs = {
            fileId: mockFile.id,
            imports: [{
                names: ['StringField'],
                default: null,
                path: '/Users/kuzy/KozhinDev/solyanka/backend-api/node_modules/@steroidsjs/nest/infrastructure/decorators/fields/index.js',
                from: '@steroidsjs/nest/infrastructure/decorators/fields',
            }],
            constants: [
                {
                    name: 'testConst1',
                    value: false,
                },
                {
                    name: 'testConst2',
                    value: 123,
                },
                {
                    name: 'testConst3',
                    value: 'testConst',
                },
            ],
            mainClass: {
                name: 'AuthConfirmLoginDto',
                oldName: 'AuthConfirmLoginDto',
                description: 'Вызов метода get',
                descriptionTags: [
                    {
                        name: 'param',
                        value: 'URL для HTTP-запроса.',
                    },
                    {
                        name: 'param',
                        value: 'Параметры для запроса.',
                    },
                ],
                decorators: [
                    {
                        name: 'Api',
                        oldName: 'Api',
                        arguments: ['auth'],
                    },
                    {
                        name: 'TestDecorator',
                        oldName: 'TestDecorator',
                        arguments: [{
                            name: 'Ivan',
                            count: 1,
                        }],
                    },
                ],
                methods: [],
                properties: [
                    {
                        name: 'uid',
                        oldName: 'uid',
                        jsType: 'string',
                        isArray: false,
                        decorators: [
                            {
                                name: 'StringField',
                                oldName: 'StringField',
                                arguments: [
                                    {
                                        label: 'uid - сессии',
                                        required: true,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'code',
                        oldName: 'code',
                        jsType: 'string',
                        isArray: false,
                        decorators: [
                            {
                                name: 'StringField',
                                oldName: 'StringField',
                                arguments: [
                                    {
                                        label: 'Code',
                                        required: true,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'newProperty',
                        oldName: 'newProperty',
                        jsType: 'number',
                        isArray: true,
                        decorators: [],
                    },
                ],
            },
        };

        expect(giiTs).toEqual(expectedTs);
    });
});
