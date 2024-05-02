import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {isEqual as _isEqual} from 'lodash';
import {generateDtoField, IGiiDtoField, parseDtoField} from './dtoField';
import {basename, createAst, tab, updateFileContent} from '../helpers';
import {IGiiFile} from './file';
import {importWithName, replaceImports} from './imports';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {findInProjectStructure, IGiiProject} from './project';

export interface IGiiDto {
    id: string,
    name: string,
    oldName: string,
    description?: string,
    fields: IGiiDtoField[],
    fieldsExtend?: string,
}

export const PARSER_DTO = 'dto';
const DTO_TAG_EXTEND_MODEL = 'extend-model';

export function parseDto(project: IGiiProject, file: IGiiFile): IGiiDto {
    const fieldsRaw = [];
    const dtoNode: any = createAst(file)
        .find(item => item.kind === SyntaxKind.ClassDeclaration);

    for (const member of dtoNode.members) {
        try {
            const rawField = parseDtoField(project, file, member);
            if (rawField) {
                fieldsRaw.push(rawField);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    }

    const name = dtoNode.name?.escapedText;
    const fields = SteroidsFieldsEnum.fromCodeParams(fieldsRaw);

    let fieldsExtend = null;
    for (const jsDoc of dtoNode.jsDoc || []) {
        for (const tag of jsDoc.tags || []) {
            if (tag.tagName.escapedText === DTO_TAG_EXTEND_MODEL && tag.comment) {
                const extendDto = findInProjectStructure(
                    project.structure,
                    item => basename(item.name) === tag.comment.trim(),
                );
                if (extendDto) {
                    fieldsExtend = extendDto.id;
                }
                break;
            }
        }
    }
    if (!fieldsExtend) {
        fieldsExtend = fields
            .find(({type, extend}) => type === 'ExtendField' && !!extend)
            ?.extend || null;
    }

    console.log(fieldsExtend);

    return {
        id: file.id,
        name,
        oldName: name,
        fields,
        fieldsExtend,
    };
}

export function generateDto(project: IGiiProject, file: IGiiFile, dto: IGiiDto): IGiiFile[] {
    const [dtoFields, dtoFieldsImports] = SteroidsFieldsEnum.toCodeParams(dto.fields as any);

    if (!file.code) {
        file.code = `\n\nexport class ${dto.name} {\n}`;
    }

    let ast: any;
    let classNode: any;

    const imports = [];

    const updateAst = () => {
        ast = createAst(file, ts.ScriptTarget.Latest);
        classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
    };
    updateAst();

    if (dto.oldName && dto.name && dto.oldName !== dto.name) {
        file.code = updateFileContent(file.code, {
            start: classNode.name.pos,
            end: classNode.name.end,
            replacement: ' ' + dto.name,
        });
        updateAst();
    }

    // Удаляем старые поля
    const fragmentsToRemove = [];
    const propertyNodes = classNode.members.filter(member => (
        member.kind === SyntaxKind.PropertyDeclaration
    ));
    for (const propertyNode of propertyNodes) {
        if (!dtoFields.some(field => field.oldName === propertyNode.name.escapedText)) {
            fragmentsToRemove.push(
                {
                    start: propertyNode.pos,
                    end: propertyNode.end,
                    replacement: '',
                },
            );
        }
    }
    file.code = updateFileContent(file.code, fragmentsToRemove);
    updateAst();

    // Обновляем существующие поля
    const fieldsToCreate = [];
    for (const rawField of dtoFields) {
        imports.push(
            importWithName('@steroidsjs/nest/infrastructure/decorators/fields', rawField.decorator),
        );

        const toUpdate = [];
        const fieldNode = classNode.members.find(member => (
            member.kind === SyntaxKind.PropertyDeclaration
            && member.name.escapedText === rawField.oldName
        ));

        if (!fieldNode) {
            fieldsToCreate.push(rawField);
            continue;
        }

        // Если изменилось имя поля
        if (rawField.oldName !== rawField.name) {
            toUpdate.push({
                start: fieldNode.name.pos,
                end: fieldNode.name.end,
                replacement: '\n' + tab() + rawField.name,
            });
        }

        // Если изменился тип поля или его параметры
        const prevDtoField = parseDtoField(project, file, fieldNode);
        const newParams = {
            ...prevDtoField.params,
            ...rawField.params,
        };
        if (prevDtoField.decorator !== rawField.decorator || !_isEqual(prevDtoField.params, newParams)) {
            const [itemCode, itemImports] = generateDtoField(project, rawField);
            toUpdate.push({
                start: fieldNode.pos,
                end: fieldNode.end,
                replacement: '\n\n' + itemCode,
            });
            imports.push(...itemImports);
        }

        file.code = updateFileContent(file.code, toUpdate);
        updateAst();
    }

    // Создаем новые поля
    const newContent = [];
    for (const field of fieldsToCreate) {
        const [itemCode, itemImports] = generateDtoField(project, field);
        newContent.push('\n' + itemCode);
        imports.push(...itemImports);
    }
    if (newContent.length > 0) {
        const hasProperties = !!classNode.members.find(member => member.kind === SyntaxKind.PropertyDeclaration);
        const endPos = classNode.members
            .filter(member => member.kind === SyntaxKind.PropertyDeclaration)
            .at(-1)
            ?.end
            || classNode.members?.[0]?.end
            || (classNode.heritageClauses.end ? classNode.heritageClauses.end + 2 : null)
            || classNode.name.end + 2;
        file.code = updateFileContent(file.code,
            {
                start: endPos,
                end: endPos,
                replacement: (hasProperties ? '\n' : '') + newContent.join('\n'),
            });
        updateAst();
    }

    // jsdoc tag extend-model
    if (dto.fieldsExtend) {
        const extendedModel = findInProjectStructure(
            project.structure,
            item => item.id === dto.fieldsExtend,
        );

        if (!classNode.jsDoc) {
            file.code = updateFileContent(file.code,
                {
                    start: classNode.pos + 2,
                    end: classNode.pos + 2,
                    replacement: '/**\n */\n',
                });
            updateAst();
        }
        if (!classNode.jsDoc?.find(item => item.tags?.find(tag => tag.tagName.escapedText === DTO_TAG_EXTEND_MODEL))) {
            const jsDocPos = classNode.jsDoc[0].end - 3;
            file.code = updateFileContent(file.code,
                {
                    start: jsDocPos,
                    end: jsDocPos,
                    replacement: ` * @${DTO_TAG_EXTEND_MODEL} ${extendedModel.name}\n`,
                });
            updateAst();
        }
    }

    file.code = replaceImports(project, file, [...dtoFieldsImports, ...imports]);

    return [file];
}

// import * as ts from 'typescript';
// import {SyntaxKind} from 'typescript';
// import {isEqual as _isEqual} from 'lodash';
// import {generateDtoField, IGiiDtoField, parseDtoField} from './dtoField';
// import {basename, createAst, tab, updateFileContent} from '../helpers';
// import {IGiiFile} from './file';
// import {importWithName, replaceImports} from './imports';
// import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
// import {findInProjectStructure, IGiiProject} from './project';
// import {parseTs} from './typescript';

// export interface IGiiDto {
//     id: string,
//     name: string,
//     oldName: string,
//     description?: string,
//     fields: IGiiDtoField[],
//     fieldsExtend?: string,
// }

// export const PARSER_DTO = 'dto';
// const DTO_TAG_EXTEND_MODEL = 'extend-model';

// export function parseDto(project: IGiiProject, file: IGiiFile): IGiiDto {
//     const parsedTsFile = parseTs(project, file);

//     const fields = SteroidsFieldsEnum.fromCodeParams(parsedTsFile.mainClass.properties);

//     let fieldsExtend = null;
//     parsedTsFile.mainClass.descriptionTags.forEach(descriptionTag => {
//         if (descriptionTag.name === DTO_TAG_EXTEND_MODEL && descriptionTag.value) {
//             const extendDto = findInProjectStructure(
//                 project.structure,
//                 item => basename(item.name) === descriptionTag.value,
//             );
//             if (extendDto) {
//                 fieldsExtend = extendDto.id;
//             }
//         }
//     });

//     if (!fieldsExtend) {
//         fieldsExtend = fields
//             .find(({type, extend}) => type === 'ExtendField' && !!extend)
//             ?.extend || null;
//     }

//     return {
//         id: parsedTsFile.fileId,
//         name: parsedTsFile.mainClass.name,
//         oldName: parsedTsFile.mainClass.name,
//         fields,
//         fieldsExtend,
//     };
// }

// export function generateDto(project: IGiiProject, file: IGiiFile, dto: IGiiDto): IGiiFile[] {
//     const [dtoFields, dtoFieldsImports] = SteroidsFieldsEnum.toCodeParams(dto.fields as any);

//     if (!file.code) {
//         file.code = `\n\nexport class ${dto.name} {\n}`;
//     }

//     let ast: any;
//     let classNode: any;

//     const imports = [];

//     const updateAst = () => {
//         ast = createAst(file, ts.ScriptTarget.Latest);
//         classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
//     };
//     updateAst();

//     if (dto.oldName && dto.name && dto.oldName !== dto.name) {
//         file.code = updateFileContent(file.code, {
//             start: classNode.name.pos,
//             end: classNode.name.end,
//             replacement: ' ' + dto.name,
//         });
//         updateAst();
//     }

//     // Удаляем старые поля
//     const fragmentsToRemove = [];
//     const propertyNodes = classNode.members.filter(member => (
//         member.kind === SyntaxKind.PropertyDeclaration
//     ));
//     for (const propertyNode of propertyNodes) {
//         if (!dtoFields.some(field => field.oldName === propertyNode.name.escapedText)) {
//             fragmentsToRemove.push(
//                 {
//                     start: propertyNode.pos,
//                     end: propertyNode.end,
//                     replacement: '',
//                 },
//             );
//         }
//     }
//     file.code = updateFileContent(file.code, fragmentsToRemove);
//     updateAst();

//     // Обновляем существующие поля
//     const fieldsToCreate = [];
//     for (const rawField of dtoFields) {
//         imports.push(
//             importWithName('@steroidsjs/nest/infrastructure/decorators/fields', rawField.decorator),
//         );

//         const toUpdate = [];
//         const fieldNode = classNode.members.find(member => (
//             member.kind === SyntaxKind.PropertyDeclaration
//             && member.name.escapedText === rawField.oldName
//         ));

//         if (!fieldNode) {
//             fieldsToCreate.push(rawField);
//             continue;
//         }

//         // Если изменилось имя поля
//         if (rawField.oldName !== rawField.name) {
//             toUpdate.push({
//                 start: fieldNode.name.pos,
//                 end: fieldNode.name.end,
//                 replacement: '\n' + tab() + rawField.name,
//             });
//         }

//         // Если изменился тип поля или его параметры
//         const prevDtoField = parseDtoField(project, file, fieldNode);
//         const newParams = {
//             ...prevDtoField.params,
//             ...rawField.params,
//         };
//         if (prevDtoField.decorator !== rawField.decorator || !_isEqual(prevDtoField.params, newParams)) {
//             const [itemCode, itemImports] = generateDtoField(project, rawField);
//             toUpdate.push({
//                 start: fieldNode.pos,
//                 end: fieldNode.end,
//                 replacement: '\n\n' + itemCode,
//             });
//             imports.push(...itemImports);
//         }

//         file.code = updateFileContent(file.code, toUpdate);
//         updateAst();
//     }

//     // Создаем новые поля
//     const newContent = [];
//     for (const field of fieldsToCreate) {
//         const [itemCode, itemImports] = generateDtoField(project, field);
//         newContent.push('\n' + itemCode);
//         imports.push(...itemImports);
//     }
//     if (newContent.length > 0) {
//         const hasProperties = !!classNode.members.find(member => member.kind === SyntaxKind.PropertyDeclaration);
//         const endPos = classNode.members
//             .filter(member => member.kind === SyntaxKind.PropertyDeclaration)
//             .at(-1)
//             ?.end
//             || classNode.members?.[0]?.end
//             || (classNode.heritageClauses.end ? classNode.heritageClauses.end + 2 : null)
//             || classNode.name.end + 2;
//         file.code = updateFileContent(file.code,
//             {
//                 start: endPos,
//                 end: endPos,
//                 replacement: (hasProperties ? '\n' : '') + newContent.join('\n'),
//             });
//         updateAst();
//     }

//     // jsdoc tag extend-model
//     if (dto.fieldsExtend) {
//         const extendedModel = findInProjectStructure(
//             project.structure,
//             item => item.id === dto.fieldsExtend,
//         );

//         if (!classNode.jsDoc) {
//             file.code = updateFileContent(file.code,
//                 {
//                     start: classNode.pos + 2,
//                     end: classNode.pos + 2,
//                     replacement: '/**\n */\n',
//                 });
//             updateAst();
//         }
//         if (!classNode.jsDoc?.find(item => item.tags?.find(tag => tag.tagName.escapedText === DTO_TAG_EXTEND_MODEL))) {
//             const jsDocPos = classNode.jsDoc[0].end - 3;
//             file.code = updateFileContent(file.code,
//                 {
//                     start: jsDocPos,
//                     end: jsDocPos,
//                     replacement: ` * @${DTO_TAG_EXTEND_MODEL} ${extendedModel.name}\n`,
//                 });
//             updateAst();
//         }
//     }

//     file.code = replaceImports(project, file, [...dtoFieldsImports, ...imports]);

//     return [file];
// }
