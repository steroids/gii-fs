import {SyntaxKind} from 'typescript';
import * as ts from 'typescript';
import {createAst, IGeneratedFragments, IGiiReplacementFragment, updateFileContent} from '../../helpers';
import {IGiiProject} from '../project';
import {IGiiFile} from '../file';
import {generateDecorators, IGiiTsDecorator, parseDecorators} from './decorators';
import {generateProperties, IGiiTsProperty, parseProperties} from './properties';
import {generateJsdoc, IGiiTsJsdoc, IGiiTsJsdocTag, parseJsdoc} from './jsdoc';
import {generateMethods, IGiiTsClassMethod, parseMethods} from './methods';

export interface IGiiTsClass {
    name: string,
    oldName: string,
    description?: string,
    descriptionTags?: IGiiTsJsdocTag[],
    decorators?: IGiiTsDecorator[],
    methods?: IGiiTsClassMethod[],
    properties?: IGiiTsProperty[],
}

export const parseClass = (project: IGiiProject, file: IGiiFile): IGiiTsClass => {
    const node: any = createAst(file)
        .find(item => item.kind === SyntaxKind.ClassDeclaration);

    const name = node?.name?.escapedText || file.name;
    const decorators = parseDecorators(project, file, node?.modifiers || []);
    const properties = parseProperties(project, file, node?.members || []);
    const methods = parseMethods(project, file, node?.members || []);
    const jsdoc = node ? parseJsdoc(project, file, node) : null;

    return {
        name,
        oldName: name,
        description: jsdoc?.description,
        descriptionTags: jsdoc?.tags,
        decorators,
        methods,
        properties,
    };
};

export const generateClass = (project: IGiiProject, file: IGiiFile, data: IGiiTsClass): IGeneratedFragments => {
    let isCreatedFromEmpty = false;
    if (!file.code) {
        isCreatedFromEmpty = true;
        file = {
            ...file,
            code: `\n\nexport class ${data.name} {\n}\n`,
        };
    }

    const imports = [];
    let fragments: IGiiReplacementFragment[] = [];
    let ast;
    let classNode;

    const updateAst = () => {
        ast = createAst(file, ts.ScriptTarget.Latest);
        classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
    };
    updateAst();

    // Update name
    if (data.oldName && data.name && data.oldName !== data.name) {
        fragments.push({
            start: classNode?.name?.pos,
            end: classNode?.name?.end,
            replacement: ' ' + data.name,
        });
    }

    // Update jsdoc description with tags
    if (data.description || data.descriptionTags) {
        const jsdoc: IGiiTsJsdoc = {
            description: data.description,
            tags: data.descriptionTags,
        };
        const [jsdocFragments, jsdocImports] = generateJsdoc(project, file, jsdoc, classNode);
        fragments.push(...jsdocFragments);
        imports.push(...jsdocImports);
    }

    // Update decorators
    if (data.decorators?.length > 0) {
        const [decoratorsFragments, decoratorsImports] = generateDecorators(project, file, data.decorators, classNode);
        fragments.push(...decoratorsFragments);
        imports.push(...decoratorsImports);
    }

    // Update properties
    if (data.properties?.length > 0) {
        const [propertiesFragments, propertiesImports] = generateProperties(
            project,
            file,
            data.properties,
            classNode,
            {
                identLevel: 1,
            },
        );
        fragments.push(...propertiesFragments);
        imports.push(...propertiesImports);
    }

    // Update methods
    if (data.methods?.length > 0) {
        const [methodsFragments, methodsImports] = generateMethods(project, file, data.methods, classNode, 1);
        if (data.properties?.length > 0 && methodsFragments.length > 0) {
            methodsFragments[0].replacement = '\n' + methodsFragments[0].replacement;
        }

        fragments.push(...methodsFragments);
        imports.push(...methodsImports);
    }

    if (isCreatedFromEmpty) {
        fragments = [
            {
                start: 0,
                end: 0,
                replacement: updateFileContent(file.code, fragments),
            },
        ];
    }

    return [
        fragments,
        imports,
    ];
};
