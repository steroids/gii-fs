import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {UserException} from '@steroidsjs/nest/usecases/exceptions';
import {IConfig} from '../interfaces/IConfig';
import {ProjectScheme} from '../../infrastructure/schemes/ProjectScheme';
import {ModuleScheme} from '../../infrastructure/schemes/ModuleScheme';

export class ProjectService {
    private configRoute: string;
    constructor(
        private configService: ConfigService,
    ) {
        this.configRoute = configService.get('project.configRoute');
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
