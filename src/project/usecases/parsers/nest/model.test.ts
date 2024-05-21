import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import * as process from 'process';
import {IGiiFile, loadFile} from '../file';
import {IGiiProject} from '../project';
import {generateModel, IGiiModel, parseModel, PARSER_NEST_MODEL} from './model';
import {IGiiDto, parseDto, PARSER_NEST_DTO} from './dto';
import {PARSER_NEST_PERMISSIONS} from './permissions';
import {PARSER_NEST_MODULE} from './module';

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/nest/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/nest/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

const modelFile: IGiiFile = loadFile(process.cwd(), 'src/__test__/mocks/ProjectModel.ts');
const dtoFile: IGiiFile = loadFile(process.cwd(), 'src/__test__/mocks/ProjectSaveDto.ts');
const permissionsFile: IGiiFile = loadFile(process.cwd(), 'src/__test__/mocks/permissions.ts');

export const project: IGiiProject = {
    name: 'test',
    path: process.cwd(),
    structure: [
        {
            id: 'src/__test__/mocks',
            name: 'testmodule',
            type: PARSER_NEST_MODULE,
            items: [
                {
                    id: modelFile.id,
                    name: modelFile.name,
                    type: PARSER_NEST_MODEL,
                },
                {
                    id: dtoFile.id,
                    name: dtoFile.name,
                    type: PARSER_NEST_DTO,
                },
                {
                    id: permissionsFile.id,
                    name: permissionsFile.name,
                    type: PARSER_NEST_PERMISSIONS,
                },
            ],

        },
    ],
};

describe('model test', () => {
    it('parse model', () => {
        expect(parseModel(project, modelFile)).toEqual({
            id: 'src/__test__/mocks/ProjectModel.ts',
            name: 'ProjectModel',
            oldName: 'ProjectModel',
            description: '',
            modulePermissions: {
                id: 'src/__test__/mocks/infrastructure/permissions.ts',
                permissions: [],
            },
            dtoNames: [
                'ProjectSaveDto',
            ],
            fieldsExtend: null,
            fields: [
                {
                    name: 'id',
                    oldName: 'id',
                    type: 'PrimaryKeyField',
                    dtos: {
                        ProjectSaveDto: true,
                    },
                },
                {
                    name: 'createTime',
                    oldName: 'createTime',
                    type: 'CreateTimeField',
                    dtos: {
                        ProjectSaveDto: true,
                    },
                },
                {
                    name: 'updateTime',
                    oldName: 'updateTime',
                    type: 'UpdateTimeField',
                    dtos: {},
                },
            ],
        } as IGiiModel);
    });

    it('parse dto', () => {
        expect(parseDto(project, dtoFile)).toEqual({
            id: 'src/__test__/mocks/ProjectSaveDto.ts',
            name: 'ProjectSaveDto',
            oldName: 'ProjectSaveDto',
            description: '',
            fieldsExtend: 'src/__test__/mocks/ProjectModel.ts',
            fields: [
                {
                    name: 'id',
                    oldName: 'id',
                    type: 'ExtendField',
                    extend: 'src/__test__/mocks/ProjectModel.ts',
                },
                {
                    name: 'createTime',
                    oldName: 'createTime',
                    type: 'ExtendField',
                    extend: 'src/__test__/mocks/ProjectModel.ts',
                },
            ],
        } as IGiiDto);
    });

    it('generate', () => {
        const model = parseModel(project, modelFile);
        model.fields[1].dtos.ProjectSaveDto = false;

        const files = generateModel(
            project,
            modelFile,
            model,
        );
        expect(files[0].code).toEqual(modelFile.code);
        expect(files[1].code).toEqual(
            dtoFile.code
                .replace('\n    @ExtendField(ProjectModel)\n    createTime: string;', ''),
        );
    });
});
