export function tab(count: number = 1) {
    return '    '.repeat(count);
}

export function strReplaceAt(str: string, indexStart: number, indexEnd: number, replacement: string) {
    return str.substring(0, indexStart + 1) + replacement + str.substring(indexEnd);
}

interface IFragmentToUpdate {
    start: number,
    end: number,
    replacement: string,
}
export function updateFileContent(fileContent, fragmentsToUpdate: IFragmentToUpdate | IFragmentToUpdate[]) {
    if (!Array.isArray(fragmentsToUpdate)) {
        fragmentsToUpdate = [fragmentsToUpdate];
    }
    fragmentsToUpdate = fragmentsToUpdate.sort((a, b) => +a.start - b.start);
    let sizeOffset = 0;
    for (const fragmentToUpdate of fragmentsToUpdate) {
        const start = fragmentToUpdate.start;
        const end = fragmentToUpdate.end;
        fileContent = strReplaceAt(
            fileContent,
            start + sizeOffset,
            end + sizeOffset,
            fragmentToUpdate.replacement,
        );
        sizeOffset = sizeOffset + (fragmentToUpdate.replacement.length - (end - start - 1))
    }
    return fileContent;
}

export function clearObject(object: Object): any {
    for (const field in object) {
        if (typeof object[field] === 'object' && !Array.isArray(object[field])) {
            object[field] = clearObject(object[field]);
        }
        if (typeof object[field] === 'undefined') {
            delete object[field];
        }
    }

    return object;
}
