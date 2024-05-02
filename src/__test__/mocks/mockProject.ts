import {IGiiProject} from '../../project/usecases/parsers/project';

export const mockProject: IGiiProject = {
    name: 'Solyanka',
    path: 'Users/dev/solyanka',
    structure: [
        {
            id: 'src',
            name: 'src',
            createType: 'module',
            type: 'module',
            items: [
                {
                    id: 'src/auth',
                    name: 'auth',
                    type: 'module',
                    items: [
                        {
                            id: 'src/auth/enums',
                            name: 'enums',
                            createType: 'enum',
                            items: [
                                {
                                    id: 'src/auth/enums/AuthRolesEnum.ts',
                                    name: 'AuthRolesEnum.ts',
                                    type: 'enum',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};
