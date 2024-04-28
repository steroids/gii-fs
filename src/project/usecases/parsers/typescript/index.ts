import {isEqual as _isEqual} from 'lodash';
import {IGiiFile} from '../file';
import {IGiiTsImport, parseImports} from './imports';
import {IGiiProject} from '../project';
import {IGiiTsConstant, parseConstants} from './constants';
import {IGiiTsClass, parseClass} from './class';

export interface IGiiTs {
    fileId: string,
    imports: IGiiTsImport[],
    constants: IGiiTsConstant[],
    mainClass: IGiiTsClass,
}

export function parseTs(project: IGiiProject, file: IGiiFile): IGiiTs {
    const imports = parseImports(file);
    const constants = parseConstants(project, file);
    const mainClass = parseClass(project, file);

    return {
        fileId: file.id,
        imports,
        constants,
        mainClass,
    };
}

// export function generateTs(project: IGiiProject, file: IGiiFile): IGiiFile[] {}
