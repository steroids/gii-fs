import {SyntaxKind} from 'typescript';
import {isEqual as _isEqual} from 'lodash';
import {IGiiFile} from '../file';
import {createAst, IGeneratedCode, tab, updateFileContent} from '../../helpers';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {IGiiProject} from '../project';

export interface IGiiTsConstant {
    name: string,
    oldName: string,
    value: any,
    type: 'const' | 'let' | 'var',
    isExport: true,
}

const getVarNameByNode = varNode => varNode.declarationList.declarations[0].name?.escapedText;

const parseConstant = (project, file, varNode) => {
    const name = getVarNameByNode(varNode);
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

export const generateConstants = (project: IGiiProject, file: IGiiFile, constants: IGiiTsConstant[]): IGeneratedCode => {
    const nodes = createAst(file)
        .filter(member => member.kind === SyntaxKind.VariableStatement);

    // Detect pos for new constants
    const endPos = nodes.length > 0 ? nodes[nodes.length - 1].end : 0;

    const imports = [];
    const fragments = [];

    // Удаляем старые поля
    const oldNames = constants.map(({oldName}) => oldName);
    fragments.push(
        ...nodes
            .filter(item => !oldNames.includes(getVarNameByNode(item)))
            .map(item => ({
                start: item.pos,
                end: item.end,
                replacement: '',
            })),
    );

    // Обновляем существующие поля
    for (const constant of constants) {
        const node = nodes.find(item => constant.oldName === getVarNameByNode(item));
        const oldConstant = node ? parseConstant(project, file, node) : null;

        if (!oldConstant || !_isEqual(oldConstant, constant)) {
            const [valueCode, valueImports] = generateObjectValue(project, constant.name, constant.value);

            imports.push(...valueImports);
            fragments.push({
                start: node ? node.pos : endPos,
                end: node ? node.end : endPos,
                replacement: '\n' + [
                    constant.isExport && 'export',
                    constant.type,
                    constant.name,
                    '=',
                    valueCode + ';',
                ].filter(Boolean).join(' '),
            });
        }
    }

    return [
        updateFileContent(file.code, fragments),
        imports,
    ];
};
