import {Body, Controller, Get, Inject, Param, Post} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {ModelDto} from '../../usecases/dtos/ModelDto';
import {EnumDto} from '../../usecases/dtos/EnumDto';
import {ProjectService} from '../../usecases/services/ProjectService';

@ApiTags('Информация о проекте')
@Controller()
export class ProjectController {
    constructor(
        @Inject(ProjectService)
        private projectService: ProjectService,
    ) {}

    @Get('/projects')
    async getProjects() {
        return this.projectService.getProjects();
    }

    @Get('/model/:id')
    async getModel(
        @Param('id') id: string,
    ) {
        return;
    }

    @Post('/model/:id')
    async saveModel(
        @Param('id') id: string,
        @Body() dto: ModelDto,
    ) {
        return;
    }

    @Get('/enum/:id')
    async getEnum(
        @Param('id') id: string,
    ) {
        return;
    }

    @Post('/enum/:id')
    async saveEnum(
        @Param('id') id: string,
        @Body() dto: EnumDto,
    ) {
        return;
    }
}
