import {max as _max} from 'lodash';
import {IGiiFile} from '../file';
import {IGiiProject} from '../project';
import {
    findNonSpaceSymbolFrom,
    IGeneratedFragments,
    tab,
} from '../../helpers';

export interface IGiiTsJsdocTag {
    name: string,
    value?: string,
    content?: string,
}

export interface IGiiTsJsdoc {
    description?: string,
    tags?: IGiiTsJsdocTag[],
}

const parseJsdocTagName = tag => tag?.tagName?.escapedText;
const parseJsdocTag = (tag: any): IGiiTsJsdocTag => ({
    name: tag?.tagName?.escapedText,
    value: tag?.name?.escapedText,
    content: tag.comment.trim(),
});

export const parseJsdoc = (project: IGiiProject, file: IGiiFile, node: any): IGiiTsJsdoc => {
    const tags: IGiiTsJsdocTag[] = [];
    const descriptions: string[] = [];
    for (const jsDoc of node.jsDoc || []) {
        descriptions.push(jsDoc.comment);
        for (const tag of jsDoc.tags || []) {
            tags.push({
                name: tag?.tagName?.escapedText,
                value: tag?.name?.escapedText,
                content: tag.comment.trim(),
            });
        }
    }

    return {
        description: descriptions.filter(Boolean).join('\n'),
        tags,
    };
};

export const generateJsdoc = (
    project: IGiiProject,
    file: IGiiFile,
    jsdoc: IGiiTsJsdoc,
    node = null,
    identLevel = 0,
): IGeneratedFragments => {
    const start = node ? findNonSpaceSymbolFrom(file.code, node.pos) : 0;
    const end = findNonSpaceSymbolFrom(file.code, _max((node?.jsDoc || []).map(item => item.end)) || start);

    const lines = [
        tab(identLevel) + '/**',
        ...(jsdoc.description
            ? jsdoc.description.split('\n').map(line => ' * ' + line)
            : []),
        ...(jsdoc.tags || [])
            .map(tag => tab(identLevel) + ' * @' + [tag.name, tag.value, tag.content].filter(Boolean).join(' ')),
        tab(identLevel) + ' */',
    ];

    return [
        [
            {
                start,
                end,
                replacement: lines.length > 2
                    ? lines.join('\n') + '\n'
                    : '',
            },
        ],
        [],
    ];
};
