import {SyntaxKind} from 'typescript';
import {IGiiFile} from '../file';
import {createAst} from '../../helpers';
import {parseObjectValue} from './objectValue';
import {IGiiProject} from '../project';

export interface IGiiTsConstant {
    name: string,
    value: any,
}

export const parseConstants = (project: IGiiProject, file: IGiiFile): IGiiTsConstant[] => {
    const result = [];
    const nodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.VariableStatement);

    for (const node of nodes) {
        result.push({
            name: node.declarationList.declarations[0].name?.escapedText,
            value: parseObjectValue(project, file, node.declarationList.declarations[0].initializer),
        });
    }

    return result;
};
