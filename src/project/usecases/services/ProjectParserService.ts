import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {uniq as _uniq} from 'lodash';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {UserException} from '@steroidsjs/nest/usecases/exceptions';
import {IConfig} from '../interfaces/IConfig';
import {ProjectScheme} from '../../infrastructure/schemes/ProjectScheme';
import {ModuleScheme} from '../../infrastructure/schemes/ModuleScheme';
import {tab, updateFileContent} from '../helpers';
import {ProjectDetailScheme} from '../../infrastructure/schemes/ProjectDetailScheme';

export class ProjectParserService {
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

    private getProjectModules(projectPath: string): Array<{name: string, path: string}> {
        const result = [];
        const srcPath = path.resolve(projectPath, 'src');
        const srcContent = fs.readdirSync(srcPath, {withFileTypes: true});
        const srcDirectories = srcContent.filter(item => item.isDirectory());
        for (const srcDirectory of srcDirectories) {
            const moduleDirectory = path.resolve(srcPath, srcDirectory.name);
            try {
                const moduleFile = fs.readdirSync(
                    path.resolve(moduleDirectory, 'infrastructure'),
                    {withFileTypes: true},
                ).find(item => item.name.includes('Module') && item.isFile());
                if (moduleFile) {
                    result.push({
                        path: moduleDirectory,
                        name: moduleFile.name.replace('.ts', ''),
                    });
                }
            } catch (e) {}
        }
        return result;
    }

    public parseProject(projectPath: string): ProjectScheme {
        const packageInfo = JSON.parse(fs.readFileSync(path.resolve(projectPath, 'package.json')).toString());

        const project = new ProjectScheme();
        project.name = packageInfo.name;
        project.modules = [];

        const modulesPaths = this.getProjectModules(projectPath);
        for (const module of modulesPaths) {
            project.modules.push(this.parseModule(module.path));
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

    public async getProject(name): Promise<ProjectDetailScheme[]> {
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

    public getProjectPathByName(projectName: string) {
        const projectsConfig: IConfig = JSON.parse(fs.readFileSync(this.configService.get('project.configRoute')).toString());
        return projectsConfig.projects.find(projectPath => {
            const packageInfo = JSON.parse(fs.readFileSync(path.resolve(projectPath, 'package.json')).toString());
            return packageInfo.name === projectName;
        });
    }

    public getModulePathByName(projectName: string, moduleName: string) {
        const projectPath = this.getProjectPathByName(projectName);
        const modules = this.getProjectModules(projectPath);
        return modules.find(module => module.name === moduleName)?.path;
    }

    public getEntityIdByName(projectName: string, entityName: string) {
        const projectPath = this.getProjectPathByName(projectName);
        const project = this.parseProject(projectPath);
        const projectEntities = project.modules.map(module => [
            ...(module.enums || []),
            ...(module.models || []),
        ]).flat();

        const entity = projectEntities.find(entity => entity.name === entityName);

        return entity?.id;
    }

    public getProjectNameByEntityPath(entityPath: string) {
        const projectsConfig: IConfig = JSON.parse(fs.readFileSync(this.configService.get('project.configRoute')).toString());
        for (const projectPath of projectsConfig.projects) {
            if (entityPath.includes(projectPath)) {
                const packageInfo = JSON.parse(fs.readFileSync(path.resolve(projectPath, 'package.json')).toString());
                return packageInfo.name;
            }
        }
        return null;
    }

    public getEntityNameByPath(entityPath: string) {
        let fileContent = fs.readFileSync(entityPath).toString();
        const ast: any = ts.createSourceFile(
            'thisFileWillNotBeCreated.ts',
            fileContent,
            ts.ScriptTarget.Latest
        ).statements;

        return ast.find(node => node.kind === SyntaxKind.ClassDeclaration)?.name?.escapedText;
    }

    public updateFileImports(filePath: string, toImport: {projectEntities: Array<string>, steroidsFields: Array<string>}) {
        const STEROIDS_FIELDS_IMPORT = '@steroidsjs/nest/infrastructure/decorators/fields';

        let fileContent = fs.readFileSync(filePath).toString();
        const projectName = this.getProjectNameByEntityPath(filePath);

        let ast: any;
        let importStatements: any;

        const updateAst = () => {
            ast = ts.createSourceFile(
                `thisFileWillNotBeCreated${Date.now()}.ts`,
                fileContent,
                ts.ScriptTarget.Latest
            ).statements;
            importStatements = ast.filter(statement => statement.kind === SyntaxKind.ImportDeclaration);
        };

        updateAst();

        const oldSteroidsFields = [];
        const oldProjectImports = [];

        // Собираем уже существующие импорты и удаляем отдельные импорты steroids fields
        const toRemove = [];
        for (const importStatement of importStatements) {
            const moduleSpecifier = importStatement.moduleSpecifier?.text;
            if (moduleSpecifier?.includes(STEROIDS_FIELDS_IMPORT)) {
                oldSteroidsFields.push(
                    ...(importStatement.importClause?.namedBindings?.elements.map(element => element.name.escapedText)),
                );
                if (moduleSpecifier.length > STEROIDS_FIELDS_IMPORT.length) {
                    toRemove.push({start: importStatement.pos - 1, end: importStatement.end, replacement: ''});
                }
            }
            if (moduleSpecifier?.startsWith('.')) {
                if (importStatement.importClause?.namedBindings?.elements?.length) {
                    oldProjectImports.push(...(importStatement.importClause?.namedBindings?.elements.map(element => (
                        this.getEntityIdByName(projectName, element.name.escapedText)
                    ))));
                }
                if (moduleSpecifier?.escapedText) {
                    oldProjectImports.push(
                        this.getEntityIdByName(projectName, importStatement.importClause?.name?.escapedText)
                    );
                }
            }
        }
        fileContent = updateFileContent(fileContent, toRemove);
        updateAst();

        const steroidsFields = _uniq([
            ...oldSteroidsFields,
            ...(toImport.steroidsFields || []),
        ]);

        const steroidsFieldsImport = importStatements.find(importStatement => (
            importStatement.moduleSpecifier?.text === STEROIDS_FIELDS_IMPORT
        ));

        let steroidsImportCode = `import {\n${tab()}${steroidsFields.join(`,\n${tab()}`)},\n} from '${STEROIDS_FIELDS_IMPORT}';`;
        if (!steroidsFieldsImport) {
            steroidsImportCode += '\n';
        }
        fileContent = updateFileContent(fileContent, {
            start: steroidsFieldsImport?.pos - 1 || 0,
            end: steroidsFieldsImport?.end || 0,
            replacement: steroidsImportCode,
        });
        updateAst();

        let newImports = [];
        for (const entityId of _uniq(toImport.projectEntities)) {
            if (oldProjectImports.includes(entityId)) {
                continue;
            }
            const entityName = this.getEntityNameByPath(entityId);
            let relativePath = path.relative(filePath, entityId).replace('.ts', '');
            // Node js выдает неверный относительный путь
            if (relativePath.startsWith('../../')) {
                relativePath = relativePath.slice(3);
            } else {
                relativePath = relativePath.slice(1);
            }
            newImports.push(`import {${entityName}} from '${relativePath}';`);
        }
        const lastImport = importStatements.at(-1);
        fileContent = updateFileContent(fileContent, {
            start: lastImport?.end + 1 || 0,
            end: lastImport?.end + 1 || 0,
            replacement: newImports.join('\n'),
        });
        updateAst();

        // Обновляем содержимое файла
        fs.writeFileSync(filePath, fileContent);
    }
 }
