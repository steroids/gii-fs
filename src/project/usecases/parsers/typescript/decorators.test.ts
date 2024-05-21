import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateDecorators, IGiiTsDecorator, parseDecorators} from './decorators';
import {createAst, updateFileContent} from '../../helpers';
import {toObjectValueExpression} from './objectValue';

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
@Api('auth')
@TestDecorator({name: 'Ivan', count: 1})
export class AuthConfirmLoginDto {
    @StringField({
        label: 'uid - сессии',
        required: true,
    })
    @Computable(item => item.test)
    uid: string;
}
    `,
};

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/typescript/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/typescript/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

describe('decorators test', () => {
    it('parse', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(parseDecorators(project, file, node.modifiers))
            .toEqual([
                {
                    name: 'Api',
                    oldName: 'Api',
                    arguments: ['auth'],
                },
                {
                    name: 'TestDecorator',
                    oldName: 'TestDecorator',
                    arguments: [
                        {
                            count: 1,
                            name: 'Ivan',
                        },
                    ],
                },
            ] as IGiiTsDecorator[]);

        expect(parseDecorators(project, file, node.members[0].modifiers))
            .toEqual([
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
                {
                    name: 'Computable',
                    oldName: 'Computable',
                    arguments: [
                        'item => item.test',
                    ],
                },
            ] as IGiiTsDecorator[]);
    });

    it('generate', () => {
        expect(
            updateFileContent(
                emptyFile.code,
                generateDecorators(
                    project,
                    emptyFile,
                    [
                        {
                            name: 'Api',
                            oldName: 'Api',
                            arguments: ['auth'],
                        },
                    ],
                    null,
                    1,
                )[0],
            ),
        )
            .toEqual(`    @Api('auth')
`);

        expect(
            updateFileContent(
                emptyFile.code,
                generateDecorators(
                    project,
                    emptyFile,
                    [
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
                )[0],
            ),
        )
            .toEqual(`@StringField({
    label: 'uid - сессии',
    required: true,
})
`);

        expect(
            updateFileContent(
                emptyFile.code,
                generateDecorators(
                    project,
                    emptyFile,
                    [
                        {
                            name: 'Computable',
                            oldName: 'Computable',
                            arguments: [
                                toObjectValueExpression('item => item.test'),
                            ],
                        },
                    ],
                )[0],
            ),
        )
            .toEqual(`@Computable(item => item.test)
`);
    });
});
