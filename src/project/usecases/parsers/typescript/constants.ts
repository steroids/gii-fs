import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {
    createAst,
    generateItemsByConfig,
    IGeneratedFragments,
    tab,
} from '../../helpers';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {IGiiProject} from '../project';

export interface IGiiTsConstant {
    name: string,
    oldName: string,
    value: any,
    type: 'const' | 'let' | 'var',
    isExport: true,
}

const parseConstantName = varNode => varNode.declarationList.declarations[0].name?.escapedText;

const parseConstant = (project, file, varNode) => {
    const name = parseConstantName(varNode);
    const typeCodePart = file.code.substring(varNode.pos, varNode.declarationList.declarations[0].name.pos);
    return {
        name,
        oldName: name,
        type: typeCodePart.includes('const')
            ? 'const'
            : (typeCodePart.includes('let')
                ? 'let'
                : 'var'
            ),
        value: parseObjectValue(project, file, varNode.declarationList.declarations[0].initializer),
        isExport: !!varNode.modifiers.find(modifier => modifier.kind === SyntaxKind.ExportKeyword),
    };
};

export const parseConstants = (project: IGiiProject, file: IGiiFile): IGiiTsConstant[] => {
    const result = [];
    const varNodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.VariableStatement);

    for (const varNode of varNodes) {
        result.push(parseConstant(project, file, varNode));
    }

    return result;
};

export const generateConstants = (project: IGiiProject, file: IGiiFile, constants: IGiiTsConstant[], identLevel = 0): IGeneratedFragments => {
    const nodes = createAst(file)
        .filter(member => member.kind === SyntaxKind.VariableStatement);

    return generateItemsByConfig(
        nodes,
        constants,
        {
            parseName: parseConstantName,
            parseItem: (node) => parseConstant(project, file, node),
            itemsSeparator: '\n',
            renderCode: (constant: IGiiTsConstant) => {
                const [valueCode, valueImports] = generateObjectValue(project, constant.name, constant.value, identLevel);
                return [
                    tab(identLevel) + [
                        constant.isExport && 'export',
                        constant.type,
                        constant.name,
                        '=',
                        valueCode + ';',
                    ].filter(Boolean).join(' '),
                    valueImports,
                ];
            },
        },
    );
};
