import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import {UserException} from '@steroidsjs/nest/usecases/exceptions';
import {IConfig} from '../interfaces/IConfig';
import {ProjectScheme} from '../../infrastructure/schemes/ProjectScheme';
import {ProjectDetailScheme} from '../../infrastructure/schemes/ProjectDetailScheme';
import {ProjectParserService} from './ProjectParserService';
import {DataMapper} from '@steroidsjs/nest/usecases/helpers/DataMapper';
import {ProjectModelService} from './ProjectModelService';
import {ProjectEnumService} from './ProjectEnumService';
import {ModuleDetailScheme} from '../../infrastructure/schemes/ModuleDetailScheme';

export class ProjectService {
    private configRoute: string;

    constructor(
        protected projectParserService: ProjectParserService,
        protected projectModelService: ProjectModelService,
        protected projectEnumService: ProjectEnumService,
        private configService: ConfigService,
    ) {
        this.configRoute = configService.get('project.configRoute');
    }

    public async getProjects(): Promise<ProjectScheme[]> {
        const projects = [];
        try {
            const projectsConfig: IConfig = JSON.parse(fs.readFileSync(this.configRoute).toString());
            for (const projectPath of projectsConfig.projects) {
                try {
                    projects.push(this.projectParserService.parseProject(projectPath));
                } catch (e) {
                    console.error(`Не удалось прочитать проект ${projectPath}`);
                }
            }
        } catch (e) {
            throw new UserException('Некорректный формат JSON для конфига!');
        }

        return projects;
    }

    public async getProject(name): Promise<ProjectDetailScheme[]> {
        const projects = await this.getProjects();
        const project = projects.find(item => item.name === name);

        return DataMapper.create(ProjectDetailScheme, {
            ...project,
            modules: (project.modules || []).map(module => DataMapper.create(ModuleDetailScheme, {
                ...module,
                models: (module.models || []).map(item => this.projectModelService.getModelInfo(item.id)),
                enums: (module.enums || []).map(item => this.projectEnumService.getEnumInfo(item.id)),
            }))
        });
    }

}
