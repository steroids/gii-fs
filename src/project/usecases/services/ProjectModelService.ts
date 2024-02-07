import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import * as fs from 'fs';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {at as _at, set as _set} from 'lodash';
import * as path from 'path';
import {ModelScheme} from '../../infrastructure/schemes/ModelScheme';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ModelSaveDto} from '../dtos/ModelSaveDto';
import {clearObject, tab, updateFileContent} from '../helpers';
import {ModelFieldSaveDto} from '../dtos/ModelFieldSaveDto';
import {ModelFieldOptionsEnum} from '../../domain/enums/ModelFieldOptionsEnum';
import {ProjectParserService} from './ProjectParserService';

export class ProjectModelService {
    constructor(
        private projectParserService: ProjectParserService,
    ) {
    }

    public getModelInfo(id: string) {
        const model = this.parseModel(id);
        return DataMapper.create(ModelScheme, model);
    }

    private parseModelField(fileContent: string, tsMember: any, projectName: string): ProjectModelFieldModel | null {
        let fieldDecorator = tsMember.decorators?.find(decorator => decorator.expression.expression.escapedText.includes('Field'));
        if (!fieldDecorator) {
            fieldDecorator = tsMember.modifiers?.find(decorator => decorator.expression?.expression?.escapedText?.includes('Field'));
        }
        if (!fieldDecorator) {
            return null;
        }

        const getValue = (initializer: any) => {
            if (initializer?.kind === SyntaxKind.FalseKeyword) {
                return false;
            }

            // TODO почему-то если не указать defaultValue, приходит объект, который парсится в null
            if (initializer?.kind === SyntaxKind.NullKeyword) {
                return '';
            }

            if (initializer?.kind === SyntaxKind.TrueKeyword) {
                return true;
            }

            if (initializer?.kind === SyntaxKind.StringLiteral && !initializer?.text) {
                return '';
            }

            if (initializer?.kind === SyntaxKind.PropertyAccessExpression) {
                return {
                    entityId: this.projectParserService.getEntityIdByName(projectName, initializer.expression?.escapedText),
                    property: initializer.name?.escapedText,
                };
            }

            // Пока что inverseSide получается как строка, нужно подумать, как с ней работать в дальнейшем
            if (initializer?.kind === SyntaxKind.ArrowFunction) {
                if (initializer.body.kind === SyntaxKind.Identifier) {
                    return {
                        modelId: this.projectParserService.getEntityIdByName(projectName, initializer.body.escapedText),
                        modelName: initializer.body.escapedText,
                    };
                }
                return fileContent.slice(initializer.pos + 1, initializer.end);
            }

            if (initializer?.kind === SyntaxKind.Identifier) {
                return this.projectParserService.getEntityIdByName(projectName, initializer.escapedText);
            }

            if (initializer?.text) {
                return initializer.text;
            }

            return initializer;
        }

        const findPropertyValue = (propertyName: string) => getValue(
            fieldDecorator.expression.arguments?.[0]?.properties
                ?.find(property => property.name.escapedText === propertyName)
                ?.initializer
        )

        let fieldDto = new ProjectModelFieldModel();
        fieldDto.name = tsMember.name.escapedText;
        fieldDto.type = fieldDecorator.expression.expression.escapedText;

        for (const fieldKey of ModelFieldOptionsEnum.getKeys()) {
            const key = ModelFieldOptionsEnum.getDtoField(fieldKey);
            const value = findPropertyValue(fieldKey);

            if (typeof fieldDto[key] === 'object' && typeof value === 'object') {
                fieldDto[key] = {
                    ...fieldDto[key],
                    ...value,
                };
            } else {
                _set(fieldDto, ModelFieldOptionsEnum.getDtoField(fieldKey), findPropertyValue(fieldKey))
            }
        }

        fieldDto = clearObject(fieldDto);

        return fieldDto;
    }

    private parseModel(modelPath: string): ProjectModelModel {
        const projectName = this.projectParserService.getProjectNameByEntityPath(modelPath);

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
        model.fields = model.fields
            .filter(Boolean)
            .filter(field => {
                // Убираем RelationField типы, для которых есть RelationIdField (т.к. они по сути дублируют друг друга)
                if (field.type === 'RelationField' && ['OneToOne', 'ManyToOne'].includes(field.relation?.type)) {
                    const relationIdField = model.fields.find(item => item.relationName === field.name);
                    if (relationIdField) {
                        relationIdField.relation = {
                            ...field.relation,
                            ...relationIdField.relation,
                        };
                        return false;
                    }
                }

                return true;
            });

        return model;
    }

    private updateModelFieldOption(projectName, moduleName, optionName: string, newValue: any, oldValue: any, fieldDecoratorNode: any) {
        if (newValue === oldValue || (!oldValue && !newValue)) {
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
        if (newValue && typeof oldValue === 'undefined') {
            const lastOptionNode = fieldDecoratorNode.expression.arguments?.[0]?.properties?.at(-1);
            const fieldOptionInfo = this.getFieldOptionCode(projectName, moduleName, optionName, newValue);
            if (!lastOptionNode) {
                return {
                    code: {
                        start: fieldDecoratorNode.expression.arguments.end,
                        end: fieldDecoratorNode.expression.arguments.end + 1,
                        replacement: `{\n${tab(2)}${fieldOptionInfo?.code}\n${tab(1)}})`
                    },
                    entitiesToImport: fieldOptionInfo?.entitiesToImport,
                };
            }
            return {
                code: {
                    start: lastOptionNode.end,
                    end: lastOptionNode.end + 1,
                    replacement: `\n${tab(2)}${fieldOptionInfo?.code}`
                },
                entitiesToImport: fieldOptionInfo?.entitiesToImport,
            };
        }
        // Обновляем существующее свойство
        if (newValue !== oldValue) {
            const fieldOptionInfo = this.getFieldOptionCode(projectName, moduleName, optionName, newValue);
            return {
                code: {
                    start: optionNode.pos,
                    end: optionNode.end + 1,
                    replacement: `\n${tab(2)}${fieldOptionInfo?.code}`
                },
                entitiesToImport: fieldOptionInfo?.entitiesToImport,
            };
        }
    }

    public updateModel(projectName, moduleName, dto: ModelSaveDto) {
        const modelPath = this.projectParserService.getModelPathByName(projectName, moduleName, dto.name);
        const prevModel = this.parseModel(modelPath);

        // Убираем falsy значения
        dto.fields = dto.fields.map((dtoField) => clearObject(dtoField))

        let fileContent = fs.readFileSync(modelPath).toString();
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
                    {start: propertyNode.pos, end: propertyNode.end, replacement: ''},
                );
            }
        }
        if (fragmentsToRemove.length) {
            fileContent = updateFileContent(fileContent, fragmentsToRemove);
            updateAst();
        }

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

            let fieldDecorator = fieldNode.decorators?.find(decorator => decorator.expression.expression.escapedText.includes('Field'));
            if (!fieldDecorator) {
                fieldDecorator = fieldNode.modifiers?.find(decorator => decorator.expression.expression.escapedText.includes('Field'));
            }
            // Если изменился тип поля, обновляем его целиком
            if (fieldDecorator?.expression?.expression.escapedText !== field.type) {
                const generatedFieldInfo = this.generateModelField(projectName, moduleName, field);
                toUpdate.push({
                    start: fieldNode.pos + 1,
                    end: fieldNode.end,
                    replacement: '\n' + generatedFieldInfo.code,
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
                    replacement: '\n' + tab() + field.name,
                });
            }

            for (const dtoField of ModelFieldOptionsEnum.getDtoFields()) {
                const optionUpdateInfo = this.updateModelFieldOption(
                    projectName,
                    moduleName,
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

            if (toUpdate.length) {
                fileContent = updateFileContent(fileContent, toUpdate);
                updateAst();
            }
        }

        // Создаем новые поля
        let newContent = [];
        const lastPropertyNode = classNode.members
            .filter(member => member.kind === SyntaxKind.PropertyDeclaration)
            .at(-1);
        for (const field of fieldsToCreate) {
            const modelFieldData = this.generateModelField(projectName, moduleName, field);
            newContent.push('\n' + modelFieldData.code);
            if (modelFieldData.entitiesToImport?.length) {
                entitiesToImport.push(...modelFieldData.entitiesToImport);
            }
        }
        if (newContent.length) {
            fileContent = updateFileContent(fileContent,
                {
                    start: lastPropertyNode?.end + 1 || classNode.members.pos,
                    end: lastPropertyNode?.end + 1 || classNode.members.pos + 1,
                    replacement: newContent.join('\n') + '\n',
                },
            );
            updateAst();
        }

        // Обновляем содержимое файла
        fs.writeFileSync(modelPath, fileContent);

        // Обновляем блок импортов
        this.projectParserService.updateFileImports(modelPath, {
            projectEntities: entitiesToImport,
            steroidsFields: steroidsFieldsToImport,
        });

        return this.parseModel(modelPath);
    }

    private generateModelField(projectName, moduleName, fieldDto: ModelFieldSaveDto): { code: string, entitiesToImport: string[] } {
        const tabsCount = 2;
        const entitiesToImport = [];

        let code = `${tab()}@${fieldDto.type}(%params%)\n${tab()}${fieldDto.name}: `;
        let paramsCode = '';
        let type = SteroidsFieldsEnum.getFieldType(fieldDto.type);

        if (type === 'object' && fieldDto.type === SteroidsFieldsEnum.RELATION_FIELD) {
            type = this.projectParserService.getEntityNameByPath(fieldDto.relation?.modelId);
            entitiesToImport.push(fieldDto.relation?.modelId);
        }
        if (['OneToMany', 'ManyToMany'].includes(fieldDto.relation?.type)) {
            type += '[]';
        }
        code += `${type};`;

        for (const dtoField of ModelFieldOptionsEnum.getDtoFields()) {
            const info = this.getFieldOptionCode(
                projectName,
                moduleName,
                ModelFieldOptionsEnum.getOptionByDtoField(dtoField),
                _at(fieldDto, dtoField)?.[0]
            );
            if (info.code) {
                paramsCode += `${tab(tabsCount)}${info.code}\n`;
            }
            if (info.entitiesToImport?.length) {
                entitiesToImport.push(...info.entitiesToImport);
            }
        }

        if (paramsCode) {
            code = code.replace('%params%', `{\n${paramsCode}${tab()}}`);
        } else {
            code = code.replace('%params%', '');
        }


        return {code, entitiesToImport};
    }

    private getFieldOptionCode(projectName: string, moduleName: string, optionName: string, fieldValue: any) {
        if (typeof fieldValue === 'undefined') {
            return {
                code: null,
                entitiesToImport: [],
            };
        }
        if (optionName === ModelFieldOptionsEnum.RELATION_CLASS) {
            console.log(123, optionName, fieldValue);
            if (!path.isAbsolute(fieldValue)) {
                fieldValue = this.projectParserService.getModelPathByName(projectName, moduleName, fieldValue);
            }

            const modelName = this.projectParserService.getEntityNameByPath(fieldValue);
            return {
                code: `relationClass: () => ${modelName},`,
                entitiesToImport: [fieldValue],
            };
        }
        if (optionName === ModelFieldOptionsEnum.ENUM) {
            const enumName = this.projectParserService.getEntityNameByPath(fieldValue);
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
        if (fieldValue && typeof fieldValue === 'object' && fieldValue.entityId && fieldValue.property) {
            const entityName = this.projectParserService.getEntityNameByPath(fieldValue.entityId);
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

        const modulePath = this.projectParserService.getModulePathByName(projectName, moduleName);

        const modelsPath = path.resolve(modulePath, 'domain', 'models');
        if (!fs.existsSync(modelsPath)) {
            fs.mkdirSync(modelsPath);
        }

        const filename = path.resolve(modelsPath, `${dto.name}.ts`);
        const templatePath = path.resolve(__dirname, '../templates/ModelTemplate.txt');
        let resultFileContent = fs.readFileSync(templatePath, 'utf-8').toString();

        let properties = [];
        const projectEntities = [];
        const steroidsFields = [];
        for (const field of dto.fields) {
            const generatedField = this.generateModelField(projectName, moduleName, field);
            properties.push(generatedField.code);
            projectEntities.push(...(generatedField.entitiesToImport || []));
            steroidsFields.push(field.type);
        }

        resultFileContent = resultFileContent.replace(MODELS_NAME_KEY, dto.name);
        resultFileContent = resultFileContent.replace(PROPERTIES_DECLARATIONS_KEY, properties.join('\n\n'));

        fs.writeFileSync(filename, resultFileContent);

        // Обновляем блок импортов
        this.projectParserService.updateFileImports(filename, {
            projectEntities,
            steroidsFields,
        });

        return this.parseModel(filename);
    }
}
