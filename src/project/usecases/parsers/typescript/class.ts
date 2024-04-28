import {SyntaxKind} from 'typescript';
import {createAst} from '../../helpers';
import {IGiiProject} from '../project';
import {IGiiFile} from '../file';
import {IGiiTsClassDecorator, parseDecorator} from './decorators';
import {IGiiTsClassProperty, parseClassProperty} from './classProperties';

interface IGiiTsClassMethod {
    name: string,
    oldName?: string,
    decorators: IGiiTsClassDecorator[],
    arguments: {
        name: string,
        type: string, // string | src/user/domain/models/UserModel.ts
        isOptional: boolean,
        defaultValue?: string,
    },
    return: {
        type: string, // string | src/user/domain/models/UserModel.ts
        value: any, // {foo: new ObjectValueExpression('this.MY_CONST'), ...}
    },
}

export interface IGiiTsClass {
    name: string,
    oldName: string,
    description?: string,
    descriptionTags?: Record<string, string>[],
    decorators?: IGiiTsClassDecorator[],
    methods?: IGiiTsClassMethod[],
    properties?: IGiiTsClassProperty[],
}

const getJsDocDescription = (node: any) => node?.jsDoc.reduce(
    (acc, jsDocItem) => ([acc, jsDocItem.comment].filter(Boolean).join('\n')),
    '',
);

const getJsDocDescriptionTags = (node: any) => node?.jsDoc.reduce(
    (acc, jsDocItem) => {
        const tags = jsDocItem.tags.map(tag => ({
            name: tag.tagName.escapedText,
            value: tag.comment,
        }));

        return [
            ...acc,
            ...tags,
        ];
    },
    [],
);

export const parseClass = (project: IGiiProject, file: IGiiFile): IGiiTsClass => {
    const node: any = createAst(file)
        .find(item => item.kind === SyntaxKind.ClassDeclaration);

    const name = node.name?.escapedText;
    const decorators = node.modifiers.map(modifier => parseDecorator(project, file, modifier)).filter(Boolean);
    const properties = node.members.map(member => parseClassProperty(project, file, member));

    return {
        name,
        oldName: name,
        description: getJsDocDescription(node),
        descriptionTags: getJsDocDescriptionTags(node),
        decorators,
        // TODO: добавить реализацию парсинга методов класса
        // methods: [],
        properties,
    };
};
