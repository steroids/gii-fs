import {SyntaxKind} from 'typescript';
import {isEqual as _isEqual} from 'lodash';
import {IGiiFile} from './file';
import {createAst, tab, updateFileContent} from '../helpers';
import {IGiiProject} from './project';

export interface IGiiPermission {
    id: string,
    label?: string,
    items?: IGiiPermission[],
}

export interface IGiiPermissions {
    id: string,
    permissions?: IGiiPermission[],
}

export const PARSER_PERMISSIONS = 'permissions';

export function parsePermissions(project: IGiiProject, file: IGiiFile): IGiiPermissions {
    const ast: any = file.code ? createAst(file) : [];

    const exportNode = ast.find(node => node.kind === SyntaxKind.ExportAssignment);

    const walkElements = nodes => {
        const result = [];
        for (const node of nodes) {
            let id = node.properties
                .find(prop => prop.name.escapedText === 'id')
                ?.initializer
                ?.escapedText;
            if (id) {
                id = id.replace(/^PERMISSION_/, '').toLowerCase();

                const label = node.properties.find(prop => prop.name.escapedText === 'label')?.initializer?.text || '';
                const elements = node.properties.find(prop => prop.name.escapedText === 'items')?.initializer?.elements || [];

                const items = walkElements(elements);
                result.push({
                    id,
                    label,
                    items: items?.length > 0 ? items : undefined,
                });
            }
        }

        return result;
    };

    return {
        id: file.id,
        permissions: walkElements(exportNode?.expression?.elements || []),
    };
}

export function generatePermissions(project: IGiiProject, file: IGiiFile, data: IGiiPermissions): IGiiFile[] {
    if (!file.code) {
        file.code = '\n\nexport default [\n];';
    }

    let ast: any;
    let exportNode: any;
    let varNodes: any;

    const updateAst = () => {
        ast = createAst(file);
        exportNode = ast.find(node => node.kind === SyntaxKind.ExportAssignment);
        varNodes = ast.filter(member => member.kind === SyntaxKind.VariableStatement);
    };
    updateAst();

    // Смотрим, изменялись ли данные
    const prevData = parsePermissions(project, file);
    if (!_isEqual(prevData, data)) {
        // Получаем линейный список прав
        const getIdsFromTree = (items: IGiiPermission[]): string[] => {
            const result: string[] = [];
            for (const item of items) {
                result.push(item.id);
                if (item.items?.length > 0) {
                    result.push(...getIdsFromTree(item.items));
                }
            }
            return result;
        };

        // Обновляем константы
        const constantsCode = getIdsFromTree(data.permissions)
            .map(id => `export const PERMISSION_${id.toUpperCase()} = '${id}';`)
            .join('\n');
        file.code = updateFileContent(file.code, {
            start: varNodes.length > 0 ? varNodes[0].pos : 0,
            end: varNodes.length > 0 ? varNodes[varNodes.length - 1].end : 0,
            replacement: constantsCode,
        });
        updateAst();

        // Обновляем экспортируемый массив: export default [{...}, ...]
        const renderObject = (items: IGiiPermission[], level = 0) => [
            ...items.map(item => [
                tab(level + 1) + '{',
                tab(level + 2) + 'id: PERMISSION_' + item.id.toUpperCase() + ',',
                tab(level + 2) + 'label: \'' + item.label + '\',',
                item.items && tab(level + 2) + 'items: [\n' + renderObject(item.items, level + 2) + '\n' + tab(level + 2) + '],',
                tab(level + 1) + '},',
            ].filter(Boolean).join('\n')),
        ].join('\n');

        file.code = updateFileContent(file.code, {
            start: exportNode.pos,
            end: exportNode.end,
            replacement: '\n\nexport default [\n' + renderObject(data.permissions) + '\n];',
        });
        updateAst();
    }

    return [file];
}
