import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';
import {SyntaxKind} from 'typescript';
import {EnumScheme} from '../../infrastructure/schemes/EnumScheme';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';
import {tab, updateFileContent} from '../helpers';
import {EnumSaveDto} from '../dtos/EnumSaveDto';
import {ProjectParserService} from './ProjectParserService';

const LABELS_FUNCTION_NAME = 'getLabels';

export class ProjectEnumService {
    constructor(
        private projectParserService: ProjectParserService,
    ) {}

    public getEnumInfo(id: string) {
        const enumModel = this.parseEnum(id);
        return DataMapper.create(EnumScheme, enumModel);
    }

    private parseEnum(enumPath: string): ProjectEnumModel {
        let fileContent = fs.readFileSync(enumPath).toString();
        const ast: any = ts.createSourceFile(
            'thisFileWillNotBeCreated.ts',
            fileContent,
            ts.ScriptTarget.Latest
        ).statements;

        const enumDto = new ProjectEnumModel();
        enumDto.fields = [];

        const enumNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
        enumDto.name = enumNode.name?.escapedText;

        const labelsFunction = enumNode.members.find(member => member.name.escapedText === LABELS_FUNCTION_NAME);
        if (labelsFunction) {
            for (const member of enumNode.members) {
                if (!member.name?.escapedText || member.parameters) {
                    continue;
                }
                const fieldDto = new ProjectEnumFieldModel();
                fieldDto.id = member.name.escapedText;

                if (labelsFunction.body?.statements?.[0]?.expression?.properties) {
                    const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                        property.name.expression?.name?.escapedText === fieldDto.id
                    ));
                    if (labelProperty) {
                        fieldDto.label = labelProperty.initializer.text;
                    }
                }

                enumDto.fields.push(fieldDto);
            }
        }

        return enumDto;
    }

    public updateEnum(projectName, moduleName, dto: EnumSaveDto) {
        const enumPath = this.projectParserService.getEnumPathByName(projectName, moduleName, dto.name);
        const prevEnum = this.parseEnum(enumPath);

        let fileContent = fs.readFileSync(enumPath).toString();
        let ast: any;
        let classNode: any;
        let labelsFunction: any;

        const updateAst = () => {
            ast = ts.createSourceFile(
                `thisFileWillNotBeCreated${Date.now()}.ts`,
                fileContent,
                ts.ScriptTarget.Latest
            ).statements;
            classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
            labelsFunction = classNode.members.find(member => (
                member.kind === SyntaxKind.MethodDeclaration && member.name.escapedText === LABELS_FUNCTION_NAME
            ));
        };

        updateAst();

        if (prevEnum.name !== dto.name) {
            fileContent = updateFileContent(fileContent, {
                start: classNode.name.pos,
                end: classNode.name.end,
                replacement: dto.name,
            });
            updateAst();
        }

        // Удаляем старые поля
        const fragmentsToRemove = [];
        const propertyNodes = classNode.members.filter(member => (
            member.kind === SyntaxKind.PropertyDeclaration
        ));
        for (const propertyNode of propertyNodes) {
            if (!dto.fields.some(field => field.oldId === propertyNode.name.escapedText)) {
                const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                    property.name.expression.name.escapedText === propertyNode.name.escapedText
                ));
                fragmentsToRemove.push(
                    {start: propertyNode.pos, end: propertyNode.end, replacement: ''}, // +1 для переноса строки
                    {start: labelProperty.pos + 1, end: labelProperty.end + 2, replacement: ''}, // +2 для переноса строки и запятой
                );
            }
        }

        fileContent = updateFileContent(fileContent, fragmentsToRemove);
        updateAst();

        // Обновляем существующие поля
        const fieldsToCreate = []
        for (const field of dto.fields) {
            const toUpdate = [];
            const fieldIdNode = classNode.members.find(member => (
                member.kind === SyntaxKind.PropertyDeclaration && member.name.escapedText === field.oldId
            ));
            if (!fieldIdNode) {
                fieldsToCreate.push(field);
                continue;
            }

            const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                property.name.expression?.name?.escapedText === field.oldId
            ));

            if (fieldIdNode.name.escapedText !== field.id) {
                toUpdate.push(
                    {
                        start: fieldIdNode.name.pos + 1,
                        end: fieldIdNode.name.end,
                        replacement: field.id,
                    },
                    {
                        start: fieldIdNode.initializer.pos,
                        end: fieldIdNode.initializer.end,
                        replacement: `'${field.id.toLowerCase()}'`,
                    },
                    {
                        start: labelProperty.name.expression.name.pos - 2,
                        end: labelProperty.name.expression.name.end - 2,
                        replacement: field.id,
                    },
                );
            }

            if (labelProperty && labelProperty.initializer.text !== field.label) {
                toUpdate.push(
                    {start: labelProperty.initializer.pos + 2, end: labelProperty.initializer.end - 1, replacement: field.label},
                );
            }

            fileContent = updateFileContent(fileContent, toUpdate);
            updateAst();
        }

        // Добавляем новые поля
        const lastFieldNode = classNode.members.reduce((prevFieldNode, node) => (
            node.kind === SyntaxKind.PropertyDeclaration
                && node.modifiers.some(modifier => modifier.kind === SyntaxKind.StaticKeyword)
                ? node
                : prevFieldNode
        ), null);

        const lastLabelNode = labelsFunction.body.statements[0].expression.properties.at(-1);

        let newDeclarations = [];
        let newLabels = [];
        for (const field of fieldsToCreate) {
            newDeclarations.push(`\n${tab()}static ${field.id} = '${field.id.toLowerCase()}';`);
            newLabels.push(`${tab(3)}[this.${field.id}]: '${field.label}',`);
        }

        const toCreate = [];

        if (newDeclarations.length) {
            toCreate.push({
                start: lastFieldNode?.end + 1 || classNode.members.pos,
                end: lastFieldNode?.end || classNode.members.pos + 1,
                replacement: newDeclarations.join('\n') + (lastFieldNode?.end ? '' : '\n'),
            })
        }

        if (newLabels.length) {
            toCreate.push({
                start: lastLabelNode?.end + 1 || labelsFunction.body.statements[0].expression.properties.pos,
                end: lastLabelNode?.end + 1 || labelsFunction.body.statements[0].expression.properties.pos + 1,
                replacement: newLabels.join('\n') + '\n',
            })
        }

        if (toCreate.length) {
            fileContent = updateFileContent(fileContent, toCreate);
            updateAst();
        }

        // Обновляем содержимое файла
        fs.writeFileSync(enumPath, fileContent);

        return this.parseEnum(enumPath);
    }

    public createEnum(projectName: string, moduleName: string, dto: EnumSaveDto) {
        const ENUM_NAME_KEY = '%enumName%';
        const PROPERTIES_DECLARATIONS_KEY = '%propertiesDeclarations%';
        const LABELS_DECLARATIONS_KEY = '%labelsDeclarations%';

        const modulePath = this.projectParserService.getModulePathByName(projectName, moduleName);

        const enumsPath = path.resolve(modulePath, 'domain', 'enums');
        if (!fs.existsSync(enumsPath)) {
            fs.mkdirSync(enumsPath);
        }

        const filename = path.resolve(enumsPath, `${dto.name}.ts`);

        const templatePath = path.resolve(__dirname,  '../templates/EnumTemplate.txt');

        let resultFileContent = fs.readFileSync(templatePath, 'utf-8').toString();

        let propertiesDeclarations = '';
        let labelsDeclarations = '';
        for (const [index, field] of dto.fields.entries()) {
            propertiesDeclarations += `${tab()}static ${field.id} = '${field.id.toLowerCase()}';\n`;
            labelsDeclarations += `${tab(3)}[this.${field.id}]: '${field.label}',`;
            if (index !== dto.fields.length - 1) {
                propertiesDeclarations += '\n';
                labelsDeclarations += '\n';
            }
        }

        resultFileContent = resultFileContent.replace(ENUM_NAME_KEY, dto.name);
        resultFileContent = resultFileContent.replace(PROPERTIES_DECLARATIONS_KEY, propertiesDeclarations);
        resultFileContent = resultFileContent.replace(LABELS_DECLARATIONS_KEY, labelsDeclarations);

        fs.writeFileSync(filename, resultFileContent);

        return this.parseEnum(filename);
    }
}
