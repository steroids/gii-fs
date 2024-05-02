import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {IGiiFile} from '../file';
import {generateImports, IGiiTsImport, importWithName, parseImports} from './imports';
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
    code: "import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';\n",
};

describe('imports test', () => {
    it('parse', () => {
        expect(parseImports(file)).toEqual([{
            names: ['StringField'],
            default: null,
            path: path.join(process.cwd(), '/node_modules/@steroidsjs/nest/infrastructure/decorators/fields/index.js'),
            from: '@steroidsjs/nest/infrastructure/decorators/fields',
        }] as IGiiTsImport[]);
    });

    it('generate', () => {
        const items = [
            importWithName('node_modules/@steroidsjs/nest/infrastructure/decorators/fields/index.js', 'StringField'),
        ];

        expect(generateImports(project, file, items))
            .toEqual("import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields/index';");
    });
});
