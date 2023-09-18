import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import * as fs from 'fs';
import * as ts from 'typescript';
import {EnumScheme} from '../../infrastructure/schemes/EnumScheme';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';
import {SyntaxKind} from 'typescript';
import {tab, updateFileContent} from '../helpers';
import {EnumSaveDto} from '../dtos/EnumSaveDto';

export class ProjectEnumService {
    constructor() {}

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

        const enumNode = ast.find(node => node.name?.escapedText?.includes('Enum'));
        enumDto.name = enumNode.name?.escapedText;

        const labelsFunction = enumNode.members.find(member => member.name.escapedText === 'getLabels');
        for (const member of enumNode.members) {
            if (!member.name.escapedText || member.parameters) {
                continue;
            }
            const fieldDto = new ProjectEnumFieldModel();
            fieldDto.id = member.name.escapedText;

            const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                property.name.expression.name.escapedText === fieldDto.id
            ));
            fieldDto.label = labelProperty.initializer.text;

            enumDto.fields.push(fieldDto);
        }


        return enumDto;
    }

    public updateEnum(dto: EnumSaveDto) {
        const prevEnum = this.parseEnum(dto.id);

        let fileContent = fs.readFileSync(dto.id).toString();
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
                member.kind === SyntaxKind.MethodDeclaration && member.name.escapedText === 'getLabels'
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
                property.name.expression.name.escapedText === field.oldId
            ));

            if (fieldIdNode.name.escapedText !== field.id) {
                toUpdate.push(
                    {
                        start: fieldIdNode.name.pos,
                        end: fieldIdNode.name.end,
                        replacement: field.id,
                    },
                    {
                        start: fieldIdNode.initializer.pos,
                        end: fieldIdNode.initializer.end,
                        replacement: `'${field.id.toLowerCase()}'`,
                    },
                    //TODO понять, откуда смещение на 1 символ
                    {
                        start: labelProperty.name.expression.pos,
                        end: labelProperty.name.expression.end,
                        replacement: `his.${field.id}`,
                    },
                );
            }

            if (labelProperty.initializer.text !== field.label) {
                toUpdate.push(
                    {start: labelProperty.initializer.pos, end: labelProperty.initializer.end, replacement: `'${field.label}'`},
                );
            }

            fileContent = updateFileContent(fileContent, toUpdate);
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
                    {start: propertyNode.pos, end: propertyNode.end + 1, replacement: ''}, // +1 для переноса строки
                    {start: labelProperty.pos, end: labelProperty.end + 2, replacement: ''}, // +2 для переноса строки и запятой
                );
            }
        }
        fileContent = updateFileContent(fileContent, fragmentsToRemove);
        updateAst();

        // Добавляем новые поля
        const lastFieldNode = classNode.members.reduce((prevFieldNode, node) => (
            node.kind === SyntaxKind.PropertyDeclaration
                && node.modifiers.some(modifier => modifier.kind === SyntaxKind.StaticKeyword)
                ? node
                : prevFieldNode
        ), null);

        const lastLabelNode = labelsFunction.body.statements[0].expression.properties.at(-1);

        let newDeclarationsContent = '';
        let newLabelsContent = '';
        for (const [index, field] of fieldsToCreate.entries()) {
            newDeclarationsContent +=  `\n${tab()}static ${field.id} = '${field.id.toLowerCase()}';`;
            newLabelsContent += `${tab(3)}[this.${field.id}]: '${field.label}',`;
            if (index !== fieldsToCreate.length - 1) {
                newDeclarationsContent += '\n';
                newLabelsContent += '\n';
            }
        }
        fileContent = updateFileContent(fileContent, [
            {start: lastFieldNode.end, end: lastFieldNode.end, replacement: newDeclarationsContent},
            {start: lastLabelNode.end + 1, end: lastLabelNode.end + 1, replacement: newLabelsContent},
        ]);
        updateAst();

        // Обновляем содержимое файла
        fs.writeFileSync(dto.id, fileContent);

        return fileContent;
    }
}
