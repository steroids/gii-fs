import {Body, Controller, Get, Inject, Param, Post} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {ProjectService} from '../../usecases/services/ProjectService';
import {ProjectScheme} from '../schemes/ProjectScheme';

@ApiTags('Информация о проекте')
@Controller()
export class ProjectController {
    constructor(
        @Inject(ProjectService)
        private projectService: ProjectService,
    ) {}

    @Get('/projects')
    @ApiOkResponse({type: ProjectScheme, isArray: true})
    async getProjects() {
        return this.projectService.getProjects();
    }

    @Get('/model/:id')
    async getModel(
        @Param('id') id: string,
    ) {
        return this.projectService.getModelInfo(id);
    }

    @Post('/model/:id')
    async saveModel(
        @Param('id') id: string,
        @Body() dto: ProjectModelModel,
    ) {
        return;
    }

    @Get('/enum/:id')
    async getEnum(
        @Param('id') id: string,
    ) {
        return this.projectService.getEnumInfo(id);
    }

    @Post('/enum/:id')
    async saveEnum(
        @Param('id') id: string,
        @Body() dto: ProjectEnumModel,
    ) {
        return;
    }
}
