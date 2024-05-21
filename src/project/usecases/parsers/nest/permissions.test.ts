import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateEnum, IGiiEnum, parseEnum} from './enum';
import {generatePermissions, IGiiPermissions, parsePermissions} from './permissions';

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
    code: `export const PERMISSION_PROJECT_PROJECT_VIEW = 'project_project_view';
export const PERMISSION_PROJECT_PROJECT_EDIT = 'project_project_edit';

export default [
    {
        id: PERMISSION_PROJECT_PROJECT_VIEW,
        label: 'Просмотр «ProjectModel»',
        items: [
            {
                id: PERMISSION_PROJECT_PROJECT_EDIT,
                label: 'Редактирование «ProjectModel»',
            },
        ],
    },
];
`,
};

describe('permissions test', () => {
    it('parse', () => {
        expect(parsePermissions(project, file)).toEqual({
            id: 'src/project/usecases/parsers/nest/test.ts',
            permissions: [
                {
                    id: 'project_project_view',
                    label: 'Просмотр «ProjectModel»',
                    items: [
                        {
                            id: 'project_project_edit',
                            label: 'Редактирование «ProjectModel»',
                        },
                    ],
                },
            ],
        } as IGiiPermissions);
    });

    it('generate', () => {
        expect(
            generatePermissions(
                project,
                emptyFile,
                parsePermissions(project, file),
            )[0].code,
        )
            .toEqual(file.code);
    });
});
