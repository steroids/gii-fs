import {SyntaxKind} from 'typescript';
import {IGiiFile} from './file';
import {createAst, IGeneratedCode, tab, updateFileContent} from '../helpers';
import {importDefault, importWithName, replaceImports} from './imports';
import {IGiiProject} from './project';

interface IGiiEnumField {
    name: string,
    oldName: string,
    label?: string,
}

interface IGiiEnum {
    id: string,
    name: string,
    oldName: string,
    fields?: IGiiEnumField[],
}

const LABELS_FUNCTION_NAME = 'getLabels';

const normalizeName = name => name.toLowerCase();

export const PARSER_ENUM = 'enum';

export function parseEnum(project: IGiiProject, file: IGiiFile): IGiiEnum {
    const ast: any = createAst(file);

    const enumNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
    const result: IGiiEnum = {
        id: file.id,
        name: enumNode.name?.escapedText,
        oldName: enumNode.name?.escapedText,
        fields: [],
    };

    const labelsFunction = enumNode.members.find(member => member.name.escapedText === LABELS_FUNCTION_NAME);
    if (labelsFunction) {
        for (const member of enumNode.members) {
            if (!member.name.escapedText || member.parameters) {
                continue;
            }

            const name = normalizeName(member.name.escapedText);
            const label = labelsFunction.body?.statements?.[0]?.expression?.properties
                ?.find(property => property.name.expression.name.escapedText === member.name.escapedText)
                ?.initializer?.text || '';

            result.fields.push({
                name,
                oldName: name,
                label,
            });
        }
    }

    return result;
}

export function generateEnum(project: IGiiProject, file: IGiiFile, data: IGiiEnum): IGiiFile[] {
    if (!file.code) {
        file.code = [
            `\n\nexport class ${data.name} extends BaseEnum {`,
            `\n${tab()}static getLabels() {`,
            `\n${tab(2)}return {`,
            `\n${tab(2)}};`,
            `\n${tab()}}`,
            '\n}',
        ].join('');
    }

    let ast: any;
    let classNode: any;
    let labelsFunction: any;

    const updateAst = () => {
        ast = createAst(file);
        classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
        labelsFunction = classNode.members
            .find(member => member.kind === SyntaxKind.MethodDeclaration && member.name.escapedText === LABELS_FUNCTION_NAME);
    };

    updateAst();

    if (data.oldName && data.name && data.oldName !== data.name) {
        file.code = updateFileContent(file.code, {
            start: classNode.name.pos,
            end: classNode.name.end,
            replacement: data.name,
        });
        updateAst();
    }

    // Удаляем старые поля
    const fragmentsToRemove = [];
    const propertyNodes = classNode.members.filter(member => (
        member.kind === SyntaxKind.PropertyDeclaration
    ));
    for (const propertyNode of propertyNodes) {
        if (!data.fields.some(field => field.oldName === normalizeName(propertyNode.name.escapedText))) {
            const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                property.name.expression.name.escapedText === propertyNode.name.escapedText
            ));
            fragmentsToRemove.push(
                {
                    start: propertyNode.pos,
                    end: propertyNode.end,
                    replacement: '',
                }, // +1 для переноса строки
                {
                    start: labelProperty.pos + 1,
                    end: labelProperty.end + 2,
                    replacement: '',
                }, // +2 для переноса строки и запятой
            );
        }
    }
    file.code = updateFileContent(file.code, fragmentsToRemove);
    updateAst();

    // Обновляем существующие поля
    const fieldsToCreate: IGiiEnumField[] = [];
    for (const field of data.fields) {
        const toUpdate = [];
        const fieldIdNode = classNode.members.find(member => (
            member.kind === SyntaxKind.PropertyDeclaration && normalizeName(member.name.escapedText) === field.oldName
        ));
        if (!fieldIdNode) {
            fieldsToCreate.push(field);
            continue;
        }

        const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
            normalizeName(property.name.expression.name.escapedText) === field.oldName
        ));

        if (normalizeName(fieldIdNode.name.escapedText) !== normalizeName(field.name)) {
            toUpdate.push(
                {
                    start: fieldIdNode.name.pos + 1,
                    end: fieldIdNode.name.end,
                    replacement: field.name.toUpperCase(),
                },
                {
                    start: fieldIdNode.initializer.pos,
                    end: fieldIdNode.initializer.end,
                    replacement: `'${normalizeName(field.name)}'`,
                },
                {
                    start: labelProperty.name.expression.name.pos - 2,
                    end: labelProperty.name.expression.name.end - 2,
                    replacement: field.name.toUpperCase(),
                },
            );
        }

        if (labelProperty.initializer.text !== field.label) {
            toUpdate.push(
                {
                    start: labelProperty.initializer.pos + 2,
                    end: labelProperty.initializer.end - 1,
                    replacement: field.label,
                },
            );
        }

        file.code = updateFileContent(file.code, toUpdate);
        updateAst();
    }

    // Добавляем новые поля
    if (fieldsToCreate.length > 0) {
        const propertiesEnd = classNode.members
            .reduce((prevFieldNode, node) => (
                node.kind === SyntaxKind.PropertyDeclaration
                && node.modifiers.some(modifier => modifier.kind === SyntaxKind.StaticKeyword)
                    ? node
                    : prevFieldNode
            ), null)?.end;
        const hasConstants = !!propertiesEnd;
        const constantsPos = propertiesEnd
            || classNode.members?.[0]?.pos
            || (classNode.heritageClauses?.end ? classNode.heritageClauses?.end + 2 : null)
            || classNode.name.end + 2;

        const lastLabelPos = labelsFunction.body.statements?.[0]?.expression?.properties?.end;//labelsFunction.body;

        const newDeclarations = [];
        const newLabels = [];
        for (const field of fieldsToCreate) {
            newDeclarations.push(`\n${tab()}static ${field.name.toUpperCase()} = '${field.name.toLowerCase()}';`);
            newLabels.push(`${tab(3)}[this.${field.name.toUpperCase()}]: '${field.label || ''}',`);
        }
        file.code = updateFileContent(file.code, [
            {
                start: constantsPos,
                end: constantsPos,
                replacement: (hasConstants ? '\n' : '') + newDeclarations.join('\n') + (!hasConstants ? '\n' : ''),
            },
            {
                start: lastLabelPos,
                end: lastLabelPos,
                replacement: newLabels.join('\n') + '\n',
            },
        ]);
        updateAst();
    }

    file.code = replaceImports(project, file, [
        importDefault('node_modules/@steroidsjs/nest/domain/base/BaseEnum', 'BaseEnum'),
    ]);

    return [file];
}
