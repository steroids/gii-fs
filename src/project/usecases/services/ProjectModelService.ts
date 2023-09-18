import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import * as fs from 'fs';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {ModelScheme} from '../../infrastructure/schemes/ModelScheme';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {ProjectRelationModel} from '../../domain/models/ProjectRelationModel';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';

export class ProjectModelService {
    constructor() {
    }

    public getModelInfo(id: string) {
        const model = this.parseModel(id);
        return DataMapper.create(ModelScheme, model);
    }

    private parseModelField(tsMember: any, modelName: string): ProjectModelFieldModel | null {
        const fieldDecorator = tsMember.decorators?.find(decorator => decorator.expression.expression.escapedText.includes('Field'))
        if (!fieldDecorator) {
            return null;
        }

        const getValue = (initializer: any) => {
            if (initializer?.text) {
                return initializer.text;
            }

            if (initializer?.kind === SyntaxKind.FalseKeyword) {
                return false;
            }

            if (initializer?.kind === SyntaxKind.TrueKeyword) {
                return true;
            }

            //TODO обсудить и сделать не текстом
            if (initializer?.kind === SyntaxKind.PropertyAccessExpression) {
                return `${initializer.expression?.escapedText}.${initializer.name?.escapedText}`;
            }

            if (initializer?.kind === SyntaxKind.ArrowFunction) {
                if (initializer.body.kind === SyntaxKind.Identifier) {
                    return initializer.body.escapedText;
                }
                if (initializer.body.kind === SyntaxKind.PropertyAccessExpression) {
                    return getValue(initializer.body);
                }
                return initializer;
            }

            return initializer;
        }

        const findPropertyValue = (propertyName: string) => getValue(fieldDecorator.expression.arguments?.[0].properties?.find(property => (
            property.name.escapedText === propertyName
        ))?.initializer)

        const fieldDto = new ProjectModelFieldModel();
        fieldDto.name = tsMember.name.escapedText;
        fieldDto.type = fieldDecorator.expression.expression.escapedText;

        fieldDto.label = findPropertyValue('label');
        fieldDto.defaultValue = findPropertyValue('defaultValue');
        fieldDto.isUnique = findPropertyValue('unique');
        fieldDto.isNullable = findPropertyValue('nullable');
        fieldDto.isRequired = findPropertyValue('required');

        if (fieldDto.type === SteroidsFieldsEnum.RELATION_FIELD) {
            fieldDto.relation = DataMapper.create<ProjectRelationModel>(ProjectRelationModel, {
                type: findPropertyValue('type'),
                modelId: findPropertyValue('relationClass'),
                isOwningSide: findPropertyValue('isOwningSide'),
                inverseSide: findPropertyValue('inverseSide'),
            });
        }

        return fieldDto;
    }

    private parseModel(modelPath: string): ProjectModelModel {
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
                model.fields.push(this.parseModelField(member, model.name))
            } catch (e) {}
        }
        model.fields = model.fields.filter(Boolean);

        return model;
    }
}
