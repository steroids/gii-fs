import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as gitDiff from 'git-diff';
import * as path from 'path';
import {findInProjectStructure, IGiiProject, parseProject} from '../parsers/project';
import {loadFile, saveFile} from '../parsers/file';
import {parse, generate} from '../parsers';

export interface IConfig {
    projects: string[],
}

export class ProjectService {
    constructor(
        private configService: ConfigService,
    ) {
    }

    public async getProjects() {
        const projects = [];
        for (const projectPath of this.getConfig().projects) {
            try {
                projects.push(parseProject(projectPath));
            } catch (e) {
                console.error(`Не удалось прочитать проект ${projectPath}`);
                console.error(e);
            }
        }

        return projects;
    }

    public async getProjectStructureItem(projectName, id) {
        const project = await this.getProject(projectName);
        const item = findInProjectStructure(project.structure, id);

        const file = loadFile(project.path, item.id);
        return parse(project, item.type, file);
    }

    public async previewProjectStructureItem(projectName, id, dto) {
        const diffs = [];
        const project = await this.getProject(projectName);
        const newFiles = this.generateFromItem(project, id, dto);
        for (const newFile of newFiles) {
            const prevFile = loadFile(project.path, newFile.id);

            diffs.push('--- ' + prevFile.id + '\n+++ ' + newFile.id + '\n' + gitDiff(
                prevFile?.code || '',
                newFile.code,
                {
                    flags: '--unified=100',
                },
            ));
        }

        return {
            diff: diffs.join('\n\n'),
        };
    }

    public async saveProjectStructureItem(projectName, id, dto) {
        const project = await this.getProject(projectName);
        const newFiles = this.generateFromItem(project, id, dto);
        for (const newFile of newFiles) {
            saveFile(newFile);
        }
    }

    private generateFromItem(project, id, dto) {
        const item = findInProjectStructure(project.structure, id);

        let itemId;
        let itemType;
        if (item && item.createType) {
            itemId = path.join(item.id, dto.name + '.ts');
            itemType = item.createType;
        } else if (item) {
            itemId = item.id;
            itemType = item.type;
        } else {
            itemId = dto.structureId || path.basename(id);
            itemType = dto.structureType;
        }

        const file = loadFile(project.path, itemId);
        return generate(project, itemType, file, dto);
    }

    private async getProject(name): Promise<IGiiProject> {
        const projects = await this.getProjects();
        return projects.find(item => item.name === name);
    }

    private getConfig(): IConfig {
        return JSON.parse(fs.readFileSync(this.configService.get('project.configRoute')).toString());
    }
}
