import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';
import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import {SyntaxKind} from 'typescript';
import {UserException} from '@steroidsjs/nest/usecases/exceptions';
import {IConfig} from '../interfaces/IConfig';
import {ProjectDto} from '../dtos/ProjectDto';
import {ModuleDto} from '../dtos/ModuleDto';
import {ModelDto} from '../dtos/ModelDto';
import {EnumDto} from '../dtos/EnumDto';
import {EnumFieldDto} from '../dtos/EnumFieldDto';
import {ModelFieldDto} from '../dtos/ModelFieldDto';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {RelationDto} from '../dtos/RelationDto';

export class ProjectService {
    private configRoute: string;
    constructor(
        private configService: ConfigService,
    ) {
        this.configRoute = configService.get('project.configRoute');
    }

    private parseModelField(tsMember: any, modelName: string): ModelFieldDto | null {
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

        const fieldDto = new ModelFieldDto();
        fieldDto.name = tsMember.name.escapedText;
        fieldDto.type = fieldDecorator.expression.expression.escapedText;

        fieldDto.label = findPropertyValue('label');
        fieldDto.defaultValue = findPropertyValue('defaultValue');
        fieldDto.isUnique = findPropertyValue('unique');
        fieldDto.isNullable = findPropertyValue('nullable');
        fieldDto.isRequired = findPropertyValue('required');

        if (fieldDto.type === SteroidsFieldsEnum.RELATION_FIELD) {
            fieldDto.relationDto = DataMapper.create<RelationDto>(RelationDto, {
                type: findPropertyValue('type'),
                modelId: findPropertyValue('relationClass'),
                isOwningSide: findPropertyValue('isOwningSide'),
                inverseSide: findPropertyValue('inverseSide'),
            });
        }

        return fieldDto;
    }

    private parseModel(modelPath: string): ModelDto {
        let fileContent = fs.readFileSync(modelPath).toString();
        const ast: any = ts.createSourceFile(
            'thisFileWillNotBeCreated.ts',
            fileContent,
            ts.ScriptTarget.Latest
        ).statements;

        const model = new ModelDto();
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

    private parseEnum(enumPath: string): EnumDto {
        let fileContent = fs.readFileSync(enumPath).toString();
        const ast: any = ts.createSourceFile(
            'thisFileWillNotBeCreated.ts',
            fileContent,
            ts.ScriptTarget.Latest
        ).statements;

        const enumDto = new EnumDto();
        enumDto.fields = [];

        const enumNode = ast.find(node => node.name?.escapedText?.includes('Enum'));
        enumDto.name = enumNode.name?.escapedText;

        const labelsFunction = enumNode.members.find(member => member.name.escapedText === 'getLabels');
        for (const member of enumNode.members) {
            if (!member.name.escapedText || member.parameters) {
                continue;
            }
            const fieldDto = new EnumFieldDto();
            fieldDto.id = member.name.escapedText;

            const labelProperty = labelsFunction.body.statements[0].expression.properties.find(property => (
                property.name.expression.name.escapedText === fieldDto.id
            ));
            fieldDto.label = labelProperty.initializer.text;

            enumDto.fields.push(fieldDto);
        }


        return enumDto;
    }

    private parseModule(modulePath: string): ModuleDto {
        const moduleFile = fs.readdirSync(
            path.resolve(modulePath, 'infrastructure'),
            {withFileTypes: true},
        ).find(item => item.name.includes('Module') && item.isFile());

        const module = new ModuleDto();
        module.enums = [];
        module.models = [];
        module.name = moduleFile.name.replace('.ts', '');

        try {
            const modelsPath = path.resolve(modulePath, 'domain', 'models');
            const modelFiles = fs.readdirSync(modelsPath, {withFileTypes: true})
                .filter(item => item.name.includes('Model') && item.isFile());

            for (const modelFile of modelFiles) {
                module.models.push(this.parseModel(path.resolve(modelsPath, modelFile.name)));
            }
        } catch (e) {}

        try {
            const enumsPath = path.resolve(modulePath, 'domain', 'enums');
            const enumFiles = fs.readdirSync(enumsPath, {withFileTypes: true})
                .filter(item => item.name.includes('Enum') && item.isFile());

            for (const enumFile of enumFiles) {
                module.enums.push(this.parseEnum(path.resolve(enumsPath, enumFile.name)));
            }
        } catch (e) {}

        return module;
    }

    private parseProject(projectPath: string): ProjectDto {
        const packageInfo = JSON.parse(fs.readFileSync(path.resolve(projectPath, 'package.json')).toString());

        const project = new ProjectDto();
        project.name = packageInfo.name;
        project.modules = [];

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
                    project.modules.push(this.parseModule(moduleDirectory));
                }
            } catch (e) {}
        }

        return project;
    }

    public async getProjects(): Promise<ProjectDto[]> {
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
