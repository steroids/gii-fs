import {Body, Controller, Get, Inject, Param, Post} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {ProjectService} from '../../usecases/services/ProjectService';
import {ProjectScheme} from '../schemes/ProjectScheme';
import {ProjectModelService} from '../../usecases/services/ProjectModelService';
import {ProjectEnumService} from '../../usecases/services/ProjectEnumService';
import {EnumSaveDto} from '../../usecases/dtos/EnumSaveDto';

@ApiTags('Информация о проекте')
@Controller()
export class ProjectController {
    constructor(
        @Inject(ProjectService)
        private projectService: ProjectService,

        @Inject(ProjectModelService)
        private modelService: ProjectModelService,

        @Inject(ProjectEnumService)
        private enumService: ProjectEnumService,
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
        return this.modelService.getModelInfo(id);
    }

    @Post('/model')
    async createModel(
        @Body() dto: ProjectModelModel,
    ) {
        return;
    }

    @Post('/model/:id')
    async updateModel(
        @Param('id') id: string,
        @Body() dto: ProjectModelModel,
    ) {
        return;
    }

    @Get('/enum/:id')
    async getEnum(
        @Param('id') id: string,
    ) {
        return this.enumService.getEnumInfo(id);
    }

    @Post('/enum')
    async createEnum(
        @Body() dto: ProjectEnumModel,
    ) {
        return;
    }

    @Post('/enum/:id')
    async updateEnum(
        @Param('id') id: string,
        @Body() dto: EnumSaveDto,
    ) {
        dto.id = id;
        return this.enumService.updateEnum(dto);
    }
}
