import * as globToRegexp from 'glob-to-regexp';
import * as fs from 'fs';
import * as path from 'path';
import {PARSER_MODEL} from './model';
import {PARSER_ENUM} from './enum';
import {PARSER_DTO} from './dto';
import {PARSER_MODULE} from './module';

export interface IGiiStructureItem {
    id: string,
    name: string,
    type?: 'enum' | 'model' | 'dto' | string,
    createType?: 'enum' | 'model' | 'dto' | string,
    items?: IGiiStructureItem[],
}

interface IGiiStructureSchema {
    pattern: string,
    dirPattern?: string,
    name?: string,
    items?: IGiiStructureSchema | IGiiStructureSchema[],
}

export interface IGiiProject {
    name: string,
    path: string,
    structure?: IGiiStructureItem[],
}

const STRUCTURE_NEST_BACKEND = {
    dir: 'src',
    createType: PARSER_MODULE,
    items: [
        {
            pattern: /^[a-z0-9-_]+$/i,
            type: PARSER_MODULE,
            items: [
                {
                    dir: 'domain',
                    items: [
                        {
                            dir: 'models',
                            createType: PARSER_MODEL,
                            items: [
                                {
                                    pattern: '*Model.ts',
                                    type: PARSER_MODEL,
                                },
                            ],
                        },
                        {
                            dir: 'enums',
                            createType: PARSER_ENUM,
                            items: [
                                {
                                    pattern: '*Enum.ts',
                                    type: PARSER_ENUM,
                                },
                            ],
                        },
                        {
                            dir: 'dtos',
                            createType: PARSER_DTO,
                            items: [
                                {
                                    pattern: '*.ts',
                                    type: PARSER_DTO,
                                },
                            ],
                        },
                    ],
                },
                {
                    dir: 'usecases',
                    items: [
                        {
                            dir: 'dtos',
                            createType: PARSER_DTO,
                            items: [
                                {
                                    pattern: '*.ts',
                                    type: PARSER_DTO,
                                },
                            ],
                        },
                    ],
                },
                {
                    dir: 'infrastructure',
                    items: [
                        {
                            dir: 'controllers',
                            // createType: PARSER_DTO,
                            items: [
                                {
                                    pattern: '*.ts',
                                    // type: PARSER_DTO,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

export function resolveProjectStructure(projectPath: string, packageJson) {
    if (packageJson?.dependencies?.['@steroidsjs/nest']) {
        return STRUCTURE_NEST_BACKEND;
    }

    throw new Error('Cannot detect project structure: ' + projectPath);
}

const scan = (schema, projectPath, relativePath) => {
    const result = [];

    const regexp = typeof schema?.pattern === 'string' ? globToRegexp(schema.pattern) : schema.pattern;
    const names = schema.pattern
        ? (
            fs.existsSync(path.join(projectPath, relativePath))
                ? fs.readdirSync(path.join(projectPath, relativePath))
                : []
        )
            .filter(name => regexp.test(name))
        : [].concat(schema.dir || []);

    for (const name of names) {
        const id = path.join(relativePath, name);

        const items = [];
        for (const itemSchema of schema.items || []) {
            items.push(...scan(itemSchema, projectPath, path.join(relativePath, name)));
        }
        result.push({
            id,
            name,
            type: schema.type || undefined,
            createType: schema.createType || undefined,
            items: schema.items?.length > 0 ? items : undefined,
        });
    }

    return result;
};

export function parseProject(projectPath: string): IGiiProject {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json')).toString());
    const structureSchema = resolveProjectStructure(projectPath, packageJson);

    const structure = scan(structureSchema, projectPath, '');

    return {
        name: packageJson.name,
        path: projectPath,
        structure,
    };
}

const findManyInProjectRecursive = (items: IGiiStructureItem[], handler: (item) => boolean, onlyFirst = false): IGiiStructureItem[] => {
    const result: IGiiStructureItem[] = [];
    for (const item of items) {
        if (handler(item)) {
            result.push(item);
            if (onlyFirst) {
                return result;
            }
        }
        if (item.items) {
            const finedItems = findManyInProjectRecursive(item.items, handler, onlyFirst);
            if (finedItems?.length > 0) {
                result.push(...finedItems);
                if (onlyFirst) {
                    return result;
                }
            }
        }
    }
    return result;
};

const _findInProject = (
    structure: IGiiStructureItem[],
    idOrHandler: string | ((item) => boolean),
    onlyFirst: boolean,
) => findManyInProjectRecursive(
    structure,
    typeof idOrHandler === 'string'
        ? item => item.id === idOrHandler
        : idOrHandler,
    onlyFirst,
);

export const findInProjectStructure = (
    structure: IGiiStructureItem[],
    idOrHandler: string | ((item) => boolean),
): IGiiStructureItem => _findInProject(structure, idOrHandler, true)?.[0] || null;

export const findManyInProjectStructure = (
    structure: IGiiStructureItem[],
    idOrHandler: string | ((item) => boolean),
): IGiiStructureItem[] => _findInProject(structure, idOrHandler, false);
