import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import * as fs from 'fs';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {at as _at} from 'lodash';
import * as path from 'path';
import {ModelScheme} from '../../infrastructure/schemes/ModelScheme';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {ProjectRelationModel} from '../../domain/models/ProjectRelationModel';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ModelSaveDto} from '../dtos/ModelSaveDto';
import {clearObject, tab, updateFileContent} from '../helpers';
import {ProjectService} from './ProjectService';
import {ModelFieldSaveDto} from '../dtos/ModelFieldSaveDto';
import {ModelFieldOptionsEnum} from '../../domain/enums/ModelFieldOptionsEnum';

export class ProjectModelService {
    constructor(
        private projectService: ProjectService,
    ) {}

    public getModelInfo(id: string) {
        const model = this.parseModel(id);
        return DataMapper.create(ModelScheme, model);
    }

    private parseModelField(fileContent: string, tsMember: any, projectName: string): ProjectModelFieldModel | null {
        const fieldDecorator = tsMember.decorators?.find(decorator => decorator.expression.expression.escapedText.includes('Field'));
        if (!fieldDecorator) {
            return null;
        }

        const getValue = (initializer: any) => {
            if (initializer?.kind === SyntaxKind.FalseKeyword) {
                return false;
            }

            if (initializer?.kind === SyntaxKind.TrueKeyword) {
                return true;
            }

            if (initializer?.kind === SyntaxKind.StringLiteral && !initializer?.text) {
                return '';
            }

            if (initializer?.kind === SyntaxKind.PropertyAccessExpression) {
                return {
                    entityId: this.projectService.getEntityIdByName(projectName, initializer.expression?.escapedText),
                    property: initializer.name?.escapedText,
                };
            }

            // Пока что inverseSide получается как строка, нужно подумать, как с ней работать в дальнейшем
            if (initializer?.kind === SyntaxKind.ArrowFunction) {
                if (initializer.body.kind === SyntaxKind.Identifier) {
                    return this.projectService.getEntityIdByName(projectName, initializer.body.escapedText);
                }
                return fileContent.slice(initializer.pos + 1, initializer.end);
            }

            if (initializer?.kind === SyntaxKind.Identifier) {
                return this.projectService.getEntityIdByName(projectName, initializer.escapedText);
            }

            if (initializer?.text) {
                return initializer.text;
            }

            return initializer;
        }

        const findPropertyValue = (propertyName: string) => getValue(fieldDecorator.expression.arguments?.[0]?.properties?.find(property => (
            property.name.escapedText === propertyName
        ))?.initializer)

        let fieldDto = new ProjectModelFieldModel();
        fieldDto.name = tsMember.name.escapedText;
        fieldDto.type = fieldDecorator.expression.expression.escapedText;

        fieldDto.label = findPropertyValue('label');
        fieldDto.defaultValue = findPropertyValue('defaultValue');
        fieldDto.isUnique = findPropertyValue('unique');
        fieldDto.isNullable = findPropertyValue('nullable');
        fieldDto.isRequired = findPropertyValue('required');
        fieldDto.enumId = findPropertyValue('enum');

        if (fieldDto.type === SteroidsFieldsEnum.RELATION_FIELD) {
            fieldDto.relation = new ProjectRelationModel();
            fieldDto.relation.type = findPropertyValue('type');
            fieldDto.relation.modelId = findPropertyValue('relationClass');
            fieldDto.relation.isOwningSide = findPropertyValue('isOwningSide');
            fieldDto.relation.inverseSide = findPropertyValue('inverseSide');
        }

        fieldDto = clearObject(fieldDto);

        return fieldDto;
    }

    private parseModel(modelPath: string): ProjectModelModel {
        const projectName = this.projectService.getProjectNameByEntityPath(modelPath);

        let fileContent = fs.readFileSync(modelPath).toString();
        const ast: any = ts.createSourceFile(
            'thisFileWillNotBeCreated.ts',
            fileContent,
            ts.ScriptTarget.Latest
        ).statements;

        const model = new ProjectModelModel();
        model.fields = [];

        const modelNode = ast.find(node => node.name?.escapedText?.includes('Model'));
        model.name = modelNode.name?.escapedText;

        for (const member of modelNode.members) {
            try {
                model.fields.push(this.parseModelField(fileContent, member, projectName))
            } catch (e) {
                console.log(e);
            }
        }
        model.fields = model.fields.filter(Boolean);

        return model;
    }

    private updateModelFieldOption(optionName: string, newValue: any, oldValue: any, fieldDecoratorNode: any) {
        if (newValue === oldValue) {
            return null;
        }
        const optionNode = fieldDecoratorNode.expression.arguments?.[0]?.properties?.find(property => (
            property.name.escapedText === optionName
        ));

        // Стираем удаленное свойство
        if (typeof newValue === 'undefined' && typeof oldValue !== 'undefined') {
            // start меньше для удаления \n
            // end больше для удаления запятой
            return {
                code: {start: optionNode.pos, end: optionNode.end + 1, replacement: ''},
                entitiesToImport: [],
            };
        }
        // Объявляем новое свойство
        if (typeof newValue !== 'undefined' && typeof oldValue === 'undefined') {
            const lastOptionNode = fieldDecoratorNode.expression.arguments?.[0]?.properties?.at(-1);
            const fieldOptionInfo = this.getFieldOptionCode(optionName, newValue);
            return {
                code: {start: lastOptionNode.end, end: lastOptionNode.end + 1, replacement: `\n${tab(2)}${fieldOptionInfo?.code}`},
                entitiesToImport: fieldOptionInfo?.entitiesToImport,
            };
        }
        // Обновляем существующее свойство
        if (newValue !== oldValue) {
            const fieldOptionInfo = this.getFieldOptionCode(optionName, newValue);
            return {
                code: {start: optionNode.pos, end: optionNode.end + 1, replacement: `\n${tab(2)}${fieldOptionInfo?.code}`},
                entitiesToImport: fieldOptionInfo?.entitiesToImport,
            };
        }
    }

    public updateModel(dto: ModelSaveDto) {
        const prevModel = this.parseModel(dto.id);

        let fileContent = fs.readFileSync(dto.id).toString();
        let ast: any;
        let classNode: any;
        const entitiesToImport = [];
        const steroidsFieldsToImport = [];

        const updateAst = () => {
            ast = ts.createSourceFile(
                `thisFileWillNotBeCreated${Date.now()}.ts`,
                fileContent,
                ts.ScriptTarget.Latest
            ).statements;
            classNode = ast.find(node => node.kind === SyntaxKind.ClassDeclaration);
        };

        updateAst();

        if (prevModel.name !== dto.name) {
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
            if (!dto.fields.some(field => field.oldName === propertyNode.name.escapedText)) {
                fragmentsToRemove.push(
                    {start: propertyNode.pos, end: propertyNode.end + 1, replacement: ''}, // +1 для переноса строки
                );
            }
        }
        fileContent = updateFileContent(fileContent, fragmentsToRemove);
        updateAst();

        // Обновляем существующие поля
        const fieldsToCreate = []
        for (const field of dto.fields) {
            const prevField = prevModel.fields.find(someField => someField.name === field.oldName);
            const toUpdate = [];
            const fieldNode = classNode.members.find(member => (
                member.kind === SyntaxKind.PropertyDeclaration && member.name.escapedText === field.oldName
            ));
            steroidsFieldsToImport.push(field.type);

            if (!fieldNode) {
                fieldsToCreate.push(field);
                continue;
            }

            const fieldDecorator = fieldNode.decorators?.find(decorator => decorator.expression.expression.escapedText.includes('Field'));
            // Если изменился тип поля, обновляем его целиком
            if (fieldDecorator.expression.expression.escapedText !== field.type) {
                const generatedFieldInfo = this.generateModelField(field);
                toUpdate.push({
                    start: fieldNode.pos,
                    end: fieldNode.end,
                    replacement: generatedFieldInfo.code,
                });
                entitiesToImport.push(...generatedFieldInfo.entitiesToImport);
                fileContent = updateFileContent(fileContent, toUpdate);
                updateAst();
                continue;
            }

            if (fieldNode.name.escapedText !== field.name) {
                toUpdate.push({
                    start: fieldNode.name.pos,
                    end: fieldNode.name.end,
                    replacement: tab() + field.name,
                });
            }

            for (const dtoField of ModelFieldOptionsEnum.getDtoFields()) {
                const optionUpdateInfo = this.updateModelFieldOption(
                    ModelFieldOptionsEnum.getOptionByDtoField(dtoField),
                    _at(field, dtoField)?.[0],
                    _at(prevField, dtoField)?.[0],
                    fieldDecorator,
                );

                if (optionUpdateInfo?.code) {
                    toUpdate.push(optionUpdateInfo.code);
                }
                if (optionUpdateInfo?.entitiesToImport) {
                    entitiesToImport.push(...optionUpdateInfo.entitiesToImport);
                }
            }

            fileContent = updateFileContent(fileContent, toUpdate);
            updateAst();
        }

        // Создаем новые поля
        let newContent = [];
        const lastPropertyNode = classNode.members
            .filter(member => member.kind === SyntaxKind.PropertyDeclaration)
            .at(-1);
        for (const field of fieldsToCreate) {
            const modelFieldData = this.generateModelField(field);
            newContent.push('\n' + modelFieldData.code);
            if (modelFieldData.entitiesToImport?.length) {
                entitiesToImport.push(...modelFieldData.entitiesToImport);
            }
        }
        if (newContent) {
            fileContent = updateFileContent(fileContent,
                {
                    start: lastPropertyNode.end,
                    end: lastPropertyNode.end,
                    replacement: '\n' + newContent.join('\n'),
                },
            );
            updateAst();
        }

        // Обновляем содержимое файла
        fs.writeFileSync(dto.id, fileContent);

        // Обновляем блок импортов
        this.projectService.updateFileImports(dto.id, {
            projectEntities: entitiesToImport,
            steroidsFields: steroidsFieldsToImport,
        });

        return this.parseModel(dto.id);
    }

    private generateModelField(fieldDto: ModelFieldSaveDto): {code: string, entitiesToImport: string[]} {
        const tabsCount = 2;
        const entitiesToImport = [];

        let code = `${tab()}@${fieldDto.type}(%params%)\n${tab()}${fieldDto.name}: `;
        let paramsCode = '';
        let type = SteroidsFieldsEnum.getFieldType(fieldDto.type);

        if (type === 'object' && fieldDto.type === SteroidsFieldsEnum.RELATION_FIELD) {
            type = this.projectService.getEntityNameByPath(fieldDto.relation?.modelId);
            entitiesToImport.push(fieldDto.relation?.modelId);
        }
        if (['OneToMany', 'ManyToMany'].includes(fieldDto.relation?.type)) {
            type += '[]';
        }
        code += `${type};`;

        for (const dtoField of ModelFieldOptionsEnum.getDtoFields()) {
            const info = this.getFieldOptionCode(ModelFieldOptionsEnum.getOptionByDtoField(dtoField), _at(fieldDto, dtoField)?.[0]);
            if (info.code) {
                paramsCode += `${tab(tabsCount)}${info.code}\n`;
            }
            if (info.entitiesToImport?.length) {
                entitiesToImport.push(...info.entitiesToImport);
            }
        }

        if (paramsCode) {
            code = code.replace('%params%',  `{\n${paramsCode}${tab()}}`);
        } else {
            code = code.replace('%params%', '');
        }


        return {code, entitiesToImport};
    }

    private getFieldOptionCode(optionName: string, fieldValue: any) {
        if (typeof fieldValue === 'undefined') {
            return {
                code: null,
                entitiesToImport: [],
            };
        }
        if (optionName === ModelFieldOptionsEnum.RELATION_CLASS) {
            const modelName = this.projectService.getEntityNameByPath(fieldValue);
            return {
                code: `relationClass: () => ${modelName},`,
                entitiesToImport: [fieldValue],
            };
        }
        if (optionName === ModelFieldOptionsEnum.ENUM) {
            const enumName = this.projectService.getEntityNameByPath(fieldValue);
            return {
                code: `enum: ${enumName},`,
                entitiesToImport: [fieldValue],
            };
        }
        if (optionName === ModelFieldOptionsEnum.INVERSE_SIDE) {
            return {
                code: `${optionName}: ${fieldValue},`,
                entitiesToImport: [],
            };
        }
        if (typeof fieldValue === 'object' && fieldValue.entityId && fieldValue.property) {
            const entityName = this.projectService.getEntityNameByPath(fieldValue.entityId);
            return {
                code: `${optionName}: ${entityName}.${fieldValue.property},`,
                entitiesToImport: [fieldValue.entityId],
            };
        }
        if (typeof fieldValue === 'string') {
            return {
                code: `${optionName}: '${fieldValue}',`,
                entitiesToImport: [],
            };
        }
        return {
            code: `${optionName}: ${fieldValue},`,
            entitiesToImport: [],
        };
    }

    public createModel(projectName: string, moduleName: string, dto: ModelSaveDto) {
        const MODELS_NAME_KEY = '%modelName%';
        const PROPERTIES_DECLARATIONS_KEY = '%propertiesDeclarations%';

        const modulePath = this.projectService.getModulePathByName(projectName, moduleName);

        const modelsPath = path.resolve(modulePath, 'domain', 'models');
        if (!fs.existsSync(modelsPath)) {
            fs.mkdirSync(modelsPath);
        }

        const filename = path.resolve(modelsPath, `${dto.name}.ts`);
        const templatePath = path.resolve(__dirname,  '../../../../public/templates/ModelTemplate.txt');
        let resultFileContent = fs.readFileSync(templatePath, 'utf-8').toString();

        let properties = [];
        const projectEntities = [];
        const steroidsFields = [];
        for (const field of dto.fields) {
            const generatedField = this.generateModelField(field);
            properties.push(generatedField.code);
            projectEntities.push(...(generatedField.entitiesToImport || []));
            steroidsFields.push(field.type);
        }

        resultFileContent = resultFileContent.replace(MODELS_NAME_KEY, dto.name);
        resultFileContent = resultFileContent.replace(PROPERTIES_DECLARATIONS_KEY, properties.join('\n\n'));

        fs.writeFileSync(filename, resultFileContent);

        // Обновляем блок импортов
        this.projectService.updateFileImports(filename, {
            projectEntities,
            steroidsFields,
        });

        return this.parseModel(filename);
    }
}
