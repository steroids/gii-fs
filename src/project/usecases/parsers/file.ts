import {basename, dirname, normalize, extname, join} from 'path';
import * as fs from 'fs';
import * as path from 'path';

export interface IGiiItem {
    id: string,
    path: string,
    name: string,
    ext: string,
}

export interface IGiiFile extends IGiiItem {
    code: string,
}

export function getGiiItemFromAbsolutePath(projectPath: string, absolutePath: string): IGiiItem {
    absolutePath = normalize(absolutePath);

    if (!absolutePath.startsWith(projectPath)) {
        throw new Error('Wrong file, not in project: ' + absolutePath + '. Project path: ' + projectPath);
    }

    const id = absolutePath.substring(path.join(projectPath, '/').length);
    return {
        id,
        path: absolutePath,
        name: basename(id).replace(/\.[^.]+$/, ''),
        ext: extname(id),
    };
}

export function loadFile(projectPath: string, itemId: string): IGiiFile {
    const absolutePath = path.join(projectPath, itemId);
    return {
        ...getGiiItemFromAbsolutePath(projectPath, absolutePath),
        code: fs.existsSync(absolutePath)
            ? fs.readFileSync(absolutePath).toString()
            : null,
    };
}

export function saveFile(file: IGiiFile) {
    const dir = dirname(file.path);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true,
        });
    }

    fs.writeFileSync(file.path, file.code);
}
