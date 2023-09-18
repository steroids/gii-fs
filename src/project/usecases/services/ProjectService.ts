import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';
import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import {SyntaxKind} from 'typescript';
import {UserException} from '@steroidsjs/nest/usecases/exceptions';
import {IConfig} from '../interfaces/IConfig';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {ProjectRelationModel} from '../../domain/models/ProjectRelationModel';
import {ProjectScheme} from '../../infrastructure/schemes/ProjectScheme';
import {ModuleScheme} from '../../infrastructure/schemes/ModuleScheme';
import {ModelScheme} from '../../infrastructure/schemes/ModelScheme';
import {EnumScheme} from '../../infrastructure/schemes/EnumScheme';

export class ProjectService {
    private configRoute: string;
    constructor(
        private configService: ConfigService,
    ) {
        this.configRoute = configService.get('project.configRoute');
    }

    public getModelInfo(id: string) {
        const model = this.parseModel(id);
        return DataMapper.create(ModelScheme, model);
    }

    public getEnumInfo(id: string) {
        const enumModel = this.parseEnum(id);
        return DataMapper.create(EnumScheme, enumModel);
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

    private parseModule(modulePath: string): ModuleScheme {
        const moduleFile = fs.readdirSync(
            path.resolve(modulePath, 'infrastructure'),
            {withFileTypes: true},
        ).find(item => item.name.includes('Module') && item.isFile());

        const module = new ModuleScheme();

        module.name = moduleFile.name.replace('.ts', '');

        try {
            const modelsPath = path.resolve(modulePath, 'domain', 'models');
            const modelFiles = fs.readdirSync(modelsPath, {withFileTypes: true})
                .filter(item => item.name.includes('Model') && item.isFile());

            module.models = modelFiles.map(modelFile => ({
                id: path.resolve(modelsPath, modelFile.name),
                name: modelFile.name.replace('.ts', ''),
            }));
        } catch (e) {}

        try {
            const enumsPath = path.resolve(modulePath, 'domain', 'enums');
            const enumFiles = fs.readdirSync(enumsPath, {withFileTypes: true})
                .filter(item => item.name.includes('Enum') && item.isFile());

            module.enums = enumFiles.map(enumFile => ({
                id: path.resolve(enumsPath, enumFile.name),
                name: enumFile.name.replace('.ts', ''),
            }));
        } catch (e) {}

        return module;
    }

    private getProjectModulesPaths(projectPath: string): string[] {
        const result = [];
        const srcPath = path.resolve(projectPath, 'src');
        const srcContent = fs.readdirSync(srcPath, {withFileTypes: true});
        const srcDirectories = srcContent.filter(item => item.isDirectory());
        for (const srcDirectory of srcDirectories) {
            const moduleDirectory = path.resolve(srcPath, srcDirectory.name);
            try {
                const isModuleDirectory = fs.readdirSync(
                    path.resolve(moduleDirectory, 'infrastructure'),
                    {withFileTypes: true},
                ).some(item => item.name.includes('Module') && item.isFile());
                if (isModuleDirectory) {
                    result.push(moduleDirectory);
                }
            } catch (e) {}
        }
        return result;
    }

    private parseProject(projectPath: string): ProjectScheme {
        const packageInfo = JSON.parse(fs.readFileSync(path.resolve(projectPath, 'package.json')).toString());

        const project = new ProjectScheme();
        project.name = packageInfo.name;
        project.modules = [];

        const modulesPaths = this.getProjectModulesPaths(projectPath);
        for (const modulePath of modulesPaths) {
            project.modules.push(this.parseModule(modulePath));
        }

        return project;
    }

    public async getProjects(): Promise<ProjectScheme[]> {
        const projects = [];
        try {
            const projectsConfig: IConfig = JSON.parse(fs.readFileSync(this.configRoute).toString());
            for (const projectPath of projectsConfig.projects) {
                try {
                    projects.push(this.parseProject(projectPath));
                } catch (e) {
                    console.error(`Не удалось прочитать проект ${projectPath}`);
                }
            }
        }
        catch (e) {
            throw new UserException('Некорректный формат JSON для конфига!');
        }

        return projects;
    }
}
