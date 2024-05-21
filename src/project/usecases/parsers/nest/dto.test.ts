import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateDto, IGiiDto, parseDto} from './dto';

export const project: IGiiProject = {
    name: 'test',
    path: process.cwd(),
    structure: [],
};

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/nest/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/nest/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

const file: IGiiFile = {
    ...emptyFile,
    code: `import {
    PrimaryKeyField,
    RelationField,
    RelationIdField,
    StringField,
    DateTimeField,
    CreateTimeField,
} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModel} from '../../../../__test__/mocks/ProjectModel';

/**
 * Репозиторий
 */
export class ProjectRepositoryModel {
    @PrimaryKeyField()
    id: number;

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

    @StringField({
        label: 'Название',
    })
    name: string;

    @DateTimeField({
        nullable: true,
    })
    externalCreateTime: string;

    @CreateTimeField()
    createTime: string;
}
`,
};

describe('dto test', () => {
    it('parse', () => {
        expect(parseDto(project, file)).toEqual({
            id: 'src/project/usecases/parsers/nest/test.ts',
            name: 'ProjectRepositoryModel',
            oldName: 'ProjectRepositoryModel',
            description: 'Репозиторий',
            fieldsExtend: null,
            fields: [
                {
                    name: 'id',
                    oldName: 'id',
                    type: 'PrimaryKeyField',
                },
                {
                    label: 'Проект',
                    name: 'project',
                    oldName: 'project',
                    relation: {
                        relationClass: 'src/__test__/mocks/ProjectModel.ts',
                        type: 'ManyToOne',
                    },
                    type: 'RelationField',
                },
                {
                    label: 'Проект',
                    name: 'projectId',
                    oldName: 'projectId',
                    relationName: 'project',
                    type: 'RelationIdField',
                },
                {
                    label: 'Название',
                    name: 'name',
                    oldName: 'name',
                    type: 'StringField',
                },
                {
                    name: 'externalCreateTime',
                    nullable: true,
                    oldName: 'externalCreateTime',
                    type: 'DateTimeField',
                },
                {
                    name: 'createTime',
                    oldName: 'createTime',
                    type: 'CreateTimeField',
                },
            ],
        } as IGiiDto);
    });

    it('generate', () => {
        const dto = parseDto(project, file);
        expect(
            generateDto(
                project,
                emptyFile,
                dto,
            )[0].code,
        )
            .toEqual(file.code);
    });
});
