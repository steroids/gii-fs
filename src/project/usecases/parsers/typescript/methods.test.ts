import {describe, expect, it} from '@jest/globals';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {createAst, updateFileContent} from '../../helpers';
import {generateMethods, IGiiTsClassMethod, parseMethods} from './methods';

export const project: IGiiProject = {
    name: 'test',
    path: process.cwd(),
    structure: [],
};

const emptyFile: IGiiFile = {
    id: 'src/project/usecases/parsers/typescript/test.ts',
    path: path.join(process.cwd(), '/src/project/usecases/parsers/typescript/test.ts'),
    name: 'test',
    ext: 'ts',
    code: '',
};

const methodCode = `    @Get()
    @AuthPermissions(PERMISSION_CAMPAIGN_COMPETITION_VIEW)
    @ApiOkSearchResponse({
        type: CampaignCompetitionGridSchema,
    })
    async search(
        @Param('campaignId') campaignId: number,
        @Query() dto: CampaignCompetitionSearchDto,
        @Context() context,
        isDefault = false,
    ) {
        return this.competitionService.search(dto, context, CampaignCompetitionGridSchema);
    }
`;

const file: IGiiFile = {
    ...emptyFile,
    code: `
export class AuthController {
${methodCode}}
`,
};

describe('methods test', () => {
    it('parse', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);

        expect(parseMethods(project, file, node.members))
            .toEqual([
                {
                    name: 'search',
                    oldName: 'search',
                    isAsync: true,
                    isStatic: false,
                    decorators: [
                        {
                            name: 'Get',
                            oldName: 'Get',
                            arguments: [],
                        },
                        {
                            name: 'AuthPermissions',
                            oldName: 'AuthPermissions',
                            arguments: [
                                {
                                    __valueExpression: 'PERMISSION_CAMPAIGN_COMPETITION_VIEW',
                                },
                            ],
                        },
                        {
                            name: 'ApiOkSearchResponse',
                            oldName: 'ApiOkSearchResponse',
                            arguments: [
                                {
                                    type: {
                                        __valueExpression: 'CampaignCompetitionGridSchema',
                                    },
                                },
                            ],
                        },
                    ],
                    arguments: [
                        {
                            name: 'campaignId',
                            oldName: 'campaignId',
                            defaultValue: null,
                            isArray: false,
                            isStatic: false,
                            jsType: 'number',
                            decorators: [
                                {
                                    arguments: [
                                        'campaignId',
                                    ],
                                    name: 'Param',
                                    oldName: 'Param',
                                },
                            ],
                        },
                        {
                            name: 'dto',
                            oldName: 'dto',
                            defaultValue: null,
                            isArray: false,
                            isStatic: false,
                            jsType: 'CampaignCompetitionSearchDto',
                            decorators: [
                                {
                                    arguments: [],
                                    name: 'Query',
                                    oldName: 'Query',
                                },
                            ],
                        },
                        {
                            name: 'context',
                            oldName: 'context',
                            defaultValue: null,
                            isArray: false,
                            isStatic: false,
                            jsType: '',
                            decorators: [
                                {
                                    arguments: [],
                                    name: 'Context',
                                    oldName: 'Context',
                                },
                            ],
                        },
                        {
                            name: 'isDefault',
                            oldName: 'isDefault',
                            decorators: [],
                            defaultValue: 'false',
                            isArray: false,
                            isStatic: false,
                            jsType: '',
                        },
                    ],
                    bodyReturn: {
                        value: {
                            __valueExpression: 'this.competitionService.search(dto, context, CampaignCompetitionGridSchema)',
                        },
                    },
                },
            ] as IGiiTsClassMethod[]);
    });

    it('generate', () => {
        const node: any = createAst(file).find(item => item.kind === SyntaxKind.ClassDeclaration);
        const methods = parseMethods(project, file, node.members);

        expect(
            updateFileContent(
                emptyFile.code,
                generateMethods(
                    project,
                    emptyFile,
                    methods,
                    node,
                    1,
                )[0],
            ),
        )
            .toEqual(methodCode);
    });
});
