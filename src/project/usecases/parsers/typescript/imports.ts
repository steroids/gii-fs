import {SyntaxKind} from 'typescript';
import {keyBy as _keyBy, uniq as _uniq, min as _min, max as _max, groupBy as _groupBy,
    flatten as _flatten, orderBy as _orderBy} from 'lodash';
import {join, resolve, relative, dirname} from 'path';
import * as fs from 'fs';
import {createAst, tab, updateFileContent} from '../../helpers';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';

export interface IGiiTsImport {
    names?: string[],
    default?: string,
    path?: string,
    from: string,
}

const isProjectFile = (
    project: IGiiProject,
    path: string,
) => !path.startsWith('node_modules') && (['/', '.'].includes(path.substring(0, 1))
    || path.startsWith(project.path)
    || fs.existsSync(join(project.path, path)));
const sortImports = (
    project: IGiiProject,
    items: IGiiTsImport[],
) => _orderBy(items, item => isProjectFile(project, item.from) ? 1 : -1);

export function importWithName(path, name): IGiiTsImport {
    return {
        names: [name],
        from: path,
    };
}

export function importDefault(path, name): IGiiTsImport {
    return {
        default: name,
        from: path,
    };
}

const getAbsolutePath = (filePath, importPath) => {
    const projectCwd = dirname(filePath).replace(/\/src\/.*$/, '\\/');
    const variants = [
        importPath,
        resolve(projectCwd, importPath),
    ];
    const paths = [
        dirname(filePath),
        projectCwd,
    ];
    const extensions = [
        '',
        'js',
        'ts',
    ];

    // ../..
    if (importPath.indexOf('.') === 0) {
        variants.push(resolve(dirname(filePath), importPath));
    }

    for (const variant of variants) {
        for (const extension of extensions) {
            try {
                return require.resolve(variant + (extension ? '.' + extension : ''), {
                    paths,
                });
            } catch (e) { /* empty */
            }
        }
    }

    return importPath;
};

export function parseImports(file: IGiiFile): IGiiTsImport[] {
    const result = [];
    const nodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.ImportDeclaration);

    for (const node of nodes) {
        result.push({
            path: getAbsolutePath(file.path, node.moduleSpecifier?.text),
            from: node.moduleSpecifier?.text,
            names: (node.importClause?.namedBindings?.elements || []).map(element => element.name.escapedText).filter(Boolean),
            default: node.importClause?.name?.escapedText || null,
        });
    }

    return result;
}

export function normalizeImports(project: IGiiProject, items: IGiiTsImport[]) {
    const grouped: Record<string, IGiiTsImport[]> = _groupBy(items, 'from');
    const result = Object.keys(grouped)
        .map(path => ({
            path,
            from: grouped[path][0].from,
            names: _uniq(_flatten(grouped[path].map(item => item.names || []))),
            default: grouped[path].find(item => !!item.default)?.default || null,
        }));

    return sortImports(project, result);
}

export function mergeImports(project: IGiiProject, prevItems: IGiiTsImport[], newItems: IGiiTsImport[]) {
    prevItems = normalizeImports(project, prevItems);
    newItems = normalizeImports(project, newItems);

    const prevItemsMap = _keyBy(prevItems, 'path');
    const newItemsMap = _keyBy(newItems, 'path');

    const result = [];

    // Update exists
    for (const prevItem of prevItems) {
        const newItem = newItemsMap[prevItem.path];
        if (newItem) {
            prevItem.names = _uniq([...(prevItem.names || []), ...(newItem.names || [])]);
            if (!prevItem.default && newItem.default) {
                prevItem.default = newItem.default;
            }
        }

        result.push(prevItem);
    }

    // Add new
    for (const newItem of newItems) {
        if (!prevItemsMap[newItem.path]) {
            result.push(newItem);
        }
    }

    return sortImports(project, result);
}

export function generateImports(project: IGiiProject, file: IGiiFile, items: IGiiTsImport[]) {
    return normalizeImports(project, items)
        .map(item => {
            const names = [
                item.default,
                item.names.length > 0
                    ? (item.names.length > 1
                        ? '{\n' + tab(1) + item.names.join(',\n' + tab(1)) + ',\n}'
                        : '{' + item.names[0] + '}'
                    )
                    : null,
            ]
                .filter(Boolean)
                .join(', ');

            let from = item.from;
            if (isProjectFile(project, item.from)) {
                if (fs.existsSync(join(project.path, item.from))) {
                    from = join(project.path, item.from);
                }
                from = relative(dirname(file.path), from);
            } else if (item.from.startsWith(join('node_modules', '/'))) {
                from = from.substring(join('node_modules', '/').length);
            }
            from = from.replace(/\.(ts|js)$/, '');

            return `import ${names} from '${from}';`;
        })
        .join('\n');
}

export function replaceImports(project: IGiiProject, file: IGiiFile, newItems: IGiiTsImport[]) {
    const prevItems = parseImports(file);
    const items = mergeImports(project, prevItems, newItems);

    const nodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.ImportDeclaration);
    return updateFileContent(file.code, {
        start: _min(nodes.map(node => node.pos)),
        end: _max(nodes.map(node => node.end)),
        replacement: generateImports(project, file, items),
    });
}
