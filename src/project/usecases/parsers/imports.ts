import {SyntaxKind} from 'typescript';
import {keyBy as _keyBy, uniq as _uniq, min as _min, max as _max, groupBy as _groupBy,
    flatten as _flatten, orderBy as _orderBy} from 'lodash';
import {join, resolve, relative, dirname} from 'path';
import {basename, createAst, tab, trimFileExtension, updateFileContent} from '../helpers';
import {getGiiItemFromAbsolutePath, IGiiFile} from './file';
import {IGiiProject} from './project';

const isNodeModulesItem = (giiId: string) => giiId.startsWith('node_modules');
const sortImports = (items: IGiiImport[]) => _orderBy(items, (item: IGiiImport) => isNodeModulesItem(item.giiId) ? 1 : -1);

export interface IGiiImport {
    giiId: string,
    names?: string[],
    default?: string,
}

export function importWithName(giiId, name): IGiiImport {
    return {
        names: [name],
        giiId,
    };
}

export function importDefault(giiId, name): IGiiImport {
    return {
        default: name,
        giiId,
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

export function parseImports(project: IGiiProject, file: IGiiFile): IGiiImport[] {
    const result: IGiiImport[] = [];
    const nodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.ImportDeclaration);

    for (const node of nodes) {
        const absolutePath = getAbsolutePath(file.path, node.moduleSpecifier?.text);
        const giiItem = getGiiItemFromAbsolutePath(project.path, absolutePath);
        result.push({
            giiId: giiItem.id,
            names: (node.importClause?.namedBindings?.elements || []).map(element => element.name.escapedText).filter(Boolean),
            default: node.importClause?.name?.escapedText || null,
        });
    }

    return result;
}

export function normalizeImports(project: IGiiProject, items: IGiiImport[]): IGiiImport[] {
    const grouped: Record<string, IGiiImport[]> = _groupBy(items, 'giiId');
    const result = Object.keys(grouped)
        .map(giiId => ({
            giiId,
            names: _uniq(_flatten(grouped[giiId].map(item => item.names || []))),
            default: grouped[giiId].find(item => !!item.default)?.default || null,
        }));

    return sortImports(result);
}

export function mergeImports(project: IGiiProject, prevItems: IGiiImport[], newItems: IGiiImport[]) {
    prevItems = normalizeImports(project, prevItems);
    newItems = normalizeImports(project, newItems);

    const prevItemsMap = _keyBy(prevItems, 'giiId');
    const newItemsMap = _keyBy(newItems, 'giiId');

    const result = [];

    // Update exists
    for (const prevItem of prevItems) {
        const newItem = newItemsMap[prevItem.giiId];
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
        if (!prevItemsMap[newItem.giiId]) {
            result.push(newItem);
        }
    }

    return sortImports(result);
}

export function generateImports(project: IGiiProject, file: IGiiFile, items: IGiiImport[]) {
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

            let from = item.giiId;
            if (isNodeModulesItem(from)) {
                from = from.substring(join('node_modules', '/').length);
            } else {
                from = relative(dirname(file.path), from);
            }
            from = trimFileExtension(from);

            // trim /index
            if (from.endsWith(join('/', 'index'))) {
                from = from.substring(0, from.length - join('/', 'index').length);
            }

            // TODO
            // if (isProjectFile(project, item.from)) {
            //     if (fs.existsSync(join(project.path, item.from))) {
            //         from = join(project.path, item.from);
            //     }
            //     from = relative(dirname(file.path), from);
            // }

            return `import ${names} from '${from}';`;
        })
        .join('\n');
}

export function replaceImports(project: IGiiProject, file: IGiiFile, newItems: IGiiImport[]) {
    const prevItems = parseImports(project, file);
    const items = mergeImports(project, prevItems, newItems);

    const nodes: any = createAst(file)
        .filter(statement => statement.kind === SyntaxKind.ImportDeclaration);
    return updateFileContent(file.code, {
        start: _min(nodes.map(node => node.pos)),
        end: _max(nodes.map(node => node.end)),
        replacement: generateImports(project, file, items),
    });
}
