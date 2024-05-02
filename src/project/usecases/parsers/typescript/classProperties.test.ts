import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {createAst} from '../../helpers';
import {IGiiTsClassProperty, parseClassProperty} from './classProperties';

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

describe('class properties test', () => {
    it('parse', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(parseClassProperty(project, file, node.members[0]))
            .toEqual({
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
            } as IGiiTsClassProperty);

        expect(parseClassProperty(project, file, node.members[1]))
            .toEqual({
                name: 'project',
                oldName: 'project',
                jsType: 'ProjectModel',
                isArray: false,
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
            } as IGiiTsClassProperty);

        expect(parseClassProperty(project, file, node.members[2]))
            .toEqual({
                name: 'projectId',
                oldName: 'projectId',
                jsType: 'number',
                isArray: false,
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
            } as IGiiTsClassProperty);

        expect(parseClassProperty(project, file, node.members[3]))
            .toEqual({
                name: 'newProperty',
                oldName: 'newProperty',
                jsType: 'number',
                isArray: true,
                decorators: [],
            } as IGiiTsClassProperty);
    });
});
