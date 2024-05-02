import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {generateDecorators, IGiiTsClassDecorator, parseDecorators} from './decorators';
import {createAst} from '../../helpers';
import {ObjectValueExpression} from './objectValue';

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
            ] as IGiiTsClassDecorator[]);

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
            ] as IGiiTsClassDecorator[]);
    });

    it('generate', () => {
        expect(
            generateDecorators(
                project,
                file,
                [
                    {
                        name: 'Api',
                        oldName: 'Api',
                        arguments: ['auth'],
                    },
                ],
            ),
        )
            .toEqual([
                "    @Api('auth')",
                [],
            ]);

        expect(
            generateDecorators(
                project,
                file,
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
            ),
        )
            .toEqual([
                '    @StringField({\n'
                + "        label: 'uid - сессии',\n"
                + '        required: true\n'
                + '})',
                [],
            ]);

        expect(
            generateDecorators(
                project,
                file,
                [
                    {
                        name: 'Computable',
                        oldName: 'Computable',
                        arguments: [
                            new ObjectValueExpression('item => item.test'),
                        ],
                    },
                ],
            ),
        )
            .toEqual([
                '    @Computable(item => item.test)',
                [],
            ]);
    });
});
