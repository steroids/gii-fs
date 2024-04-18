import {basename, dirname, normalize} from 'path';
import * as fs from 'fs';
import * as path from 'path';
import {IGiiProject} from './project';

export interface IGiiFile {
    id: string,
    name: string,
    path: string,
    code: string,
}

export function loadFile(projectPath: string, itemId: string): IGiiFile {
    const filePath = path.join(projectPath, itemId);
    return {
        id: itemId,
        path: normalize(filePath),
        name: basename(filePath).replace(/\.[^.]+$/, ''),
        code: fs.existsSync(filePath)
            ? fs.readFileSync(filePath).toString()
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
