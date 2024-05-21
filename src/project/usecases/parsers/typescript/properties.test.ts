import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {createAst, updateFileContent} from '../../helpers';
import {generateProperties, IGiiTsProperty, parseProperties} from './properties';

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
import {
    StringField,
    RelationIdField,
    RelationField,
} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModel} from '../../../../__test__/mocks/ProjectModel';

export class AuthConfirmLoginDto {
    @StringField({
        label: 'uid - сессии',
        required: true,
    })
    uid: string;
    
    @RelationField({
        label: 'Проект',
        type: 'ManyToOne',
        relationClass: () => ProjectModel,
    })
    project: ProjectModel;

    @RelationIdField({
        label: 'Проект',
        relationName: 'project',
    })
    projectId: number;

    newProperty: number[];
}`,
};

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/typescript/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/typescript/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

describe('class properties test', () => {
    it('parse', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(parseProperties(project, file, [node.members[0]]))
            .toEqual([
                {
                    name: 'uid',
                    oldName: 'uid',
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
                                    label: 'uid - сессии',
                                    required: true,
                                },
                            ],
                        },
                    ],
                } as IGiiTsProperty,
            ]);

        expect(parseProperties(project, file, [node.members[1]]))
            .toEqual([
                {
                    name: 'project',
                    oldName: 'project',
                    jsType: 'ProjectModel',
                    isArray: false,
                    isStatic: false,
                    defaultValue: null,
                    decorators: [
                        {
                            name: 'RelationField',
                            oldName: 'RelationField',
                            arguments: [
                                {
                                    label: 'Проект',
                                    relationClass: 'src/__test__/mocks/ProjectModel.ts',
                                    type: 'ManyToOne',
                                },
                            ],
                        },
                    ],
                } as IGiiTsProperty,
            ]);

        expect(parseProperties(project, file, [node.members[2], node.members[3]]))
            .toEqual([
                {
                    name: 'projectId',
                    oldName: 'projectId',
                    jsType: 'number',
                    isArray: false,
                    isStatic: false,
                    defaultValue: null,
                    decorators: [
                        {
                            name: 'RelationIdField',
                            oldName: 'RelationIdField',
                            arguments: [
                                {
                                    label: 'Проект',
                                    relationName: 'project',
                                },
                            ],
                        },
                    ],
                } as IGiiTsProperty,
                {
                    name: 'newProperty',
                    oldName: 'newProperty',
                    jsType: 'number',
                    isArray: true,
                    isStatic: false,
                    defaultValue: null,
                    decorators: [],
                } as IGiiTsProperty,
            ]);
    });

    it('generate one', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(
            updateFileContent(
                emptyFile.code,
                generateProperties(
                    project,
                    emptyFile,
                    [
                        {
                            name: 'uid',
                            oldName: 'uid',
                            jsType: 'string',
                            isArray: false,
                            isStatic: false,
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
                        } as IGiiTsProperty,
                    ],
                )[0],
            ),
        )
            .toEqual(`@StringField({
    label: 'uid - сессии',
    required: true,
})
uid: string;
`);
    });

    it('generate multiple', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(
            updateFileContent(
                emptyFile.code,
                generateProperties(
                    project,
                    emptyFile,
                    [
                        {
                            name: 'project',
                            oldName: 'project',
                            jsType: 'ProjectModel',
                            isArray: false,
                            isStatic: false,
                            decorators: [
                                {
                                    name: 'RelationField',
                                    oldName: 'RelationField',
                                    arguments: [
                                        {
                                            label: 'Проект',
                                            relationClass: 'src/__test__/mocks/ProjectModel.ts',
                                            type: 'ManyToOne',
                                        },
                                    ],
                                },
                            ],
                        } as IGiiTsProperty,
                        {
                            name: 'projectId',
                            oldName: 'projectId',
                            jsType: 'number',
                            isArray: false,
                            isStatic: false,
                            decorators: [
                                {
                                    name: 'RelationIdField',
                                    oldName: 'RelationIdField',
                                    arguments: [
                                        {
                                            label: 'Проект',
                                            relationName: 'project',
                                        },
                                    ],
                                },
                            ],
                        } as IGiiTsProperty,
                        {
                            name: 'newProperty',
                            oldName: 'newProperty',
                            jsType: 'number',
                            isArray: true,
                            isStatic: false,
                            decorators: [],
                        } as IGiiTsProperty,
                    ],
                    null,
                    {identLevel: 1},
                )[0],
            ),
        )
            .toEqual(`    @RelationField({
        label: 'Проект',
        relationClass: 'src/__test__/mocks/ProjectModel.ts',
        type: 'ManyToOne',
    })
    project: ProjectModel;

    @RelationIdField({
        label: 'Проект',
        relationName: 'project',
    })
    projectId: number;

    newProperty: number[];
`);
    });
});
