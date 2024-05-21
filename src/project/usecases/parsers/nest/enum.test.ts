import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateEnum, IGiiEnum, parseEnum} from './enum';

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
    code: `import BaseEnum from '@steroidsjs/nest/domain/base/BaseEnum';

export class ProviderEnum extends BaseEnum {
    static GITLAB = 'gitlab';

    static CLOCKIFY = 'clockify';

    static getLabels() {
        return {
            [this.GITLAB]: 'GitLab',
            [this.CLOCKIFY]: 'Clockify',
        };
    }
}
`,
};

describe('enum test', () => {
    it('parse', () => {
        expect(parseEnum(project, file)).toEqual({
            id: 'src/project/usecases/parsers/nest/test.ts',
            name: 'ProviderEnum',
            oldName: 'ProviderEnum',
            description: '',
            fields: [
                {
                    label: 'GitLab',
                    name: 'GITLAB',
                    oldName: 'GITLAB',
                    value: 'gitlab',
                },
                {
                    label: 'Clockify',
                    name: 'CLOCKIFY',
                    oldName: 'CLOCKIFY',
                    value: 'clockify',
                },
            ],
        } as IGiiEnum);
    });

    it('generate', () => {
        expect(
            generateEnum(
                project,
                emptyFile,
                parseEnum(project, file),
            )[0].code,
        )
            .toEqual(file.code);
    });
});
