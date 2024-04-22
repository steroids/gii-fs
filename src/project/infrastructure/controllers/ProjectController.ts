import {Body, Controller, Get, Inject, Param, Post, Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {ProjectService} from '../../usecases/services/ProjectService';

@ApiTags('Информация о проекте')
@Controller()
export class ProjectController {
    constructor(
        @Inject(ProjectService)
        private projectService: ProjectService,
    ) {
    }

    @Get('/project')
    async getProjects() {
        return this.projectService.getProjects();
    }

    @Get('/project/:projectName/structure')
    async getStructureItem(
        @Param('projectName') projectName: string,
        @Query('id') id: string,
    ) {
        return this.projectService.getProjectStructureItem(projectName, id);
    }

    @Get('/project/:projectName/structures')
    async getStructureItems(
        @Param('projectName') projectName: string,
        @Query('id') ids: string[],
    ) {
        return this.projectService.getProjectStructureItems(projectName, ids);
    }

    @Post('/project/:projectName/structure/preview')
    async previewStructureItem(
        @Param('projectName') projectName: string,
        @Body() dto,
    ) {
        return this.projectService.previewProjectStructureItem(projectName, dto.id, dto);
    }

    @Post('/project/:projectName/structure')
    async saveStructureItem(
        @Param('projectName') projectName: string,
        @Body() dto,
    ) {
        return this.projectService.saveProjectStructureItem(projectName, dto.id, dto);
    }
}
