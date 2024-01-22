import {Body, Controller, Get, Inject, Param, Post} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {ProjectService} from '../../usecases/services/ProjectService';
import {ProjectScheme} from '../schemes/ProjectScheme';
import {ProjectModelService} from '../../usecases/services/ProjectModelService';
import {ProjectEnumService} from '../../usecases/services/ProjectEnumService';
import {EnumSaveDto} from '../../usecases/dtos/EnumSaveDto';
import {ModelSaveDto} from '../../usecases/dtos/ModelSaveDto';
import {ModelScheme} from '../schemes/ModelScheme';
import {EnumScheme} from '../schemes/EnumScheme';
import {ProjectDetailScheme} from '../schemes/ProjectDetailScheme';

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

    @Get('/project')
    @ApiOkResponse({type: ProjectScheme, isArray: true})
    async getProjects() {
        return this.projectService.getProjects();
    }

    @Get('/project/:name')
    @ApiOkResponse({type: ProjectDetailScheme})
    async getProject(
        @Param('name') name: string,
    ) {
        return this.projectService.getProject(name);
    }

    @Get('/model/:id')
    @ApiOkResponse({type: ModelScheme, isArray: true})
    async getModel(
        @Param('id') id: string,
    ) {
        return this.modelService.getModelInfo(id);
    }

    @Post('project/:projectName/module/:moduleName/model')
    @ApiOkResponse({type: ModelScheme, isArray: true})
    async createModel(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Body() dto: ModelSaveDto,
    ) {
        return this.modelService.createModel(projectName, moduleName, dto);
    }

    @Post('/model/:id')
    @ApiOkResponse({type: ModelScheme, isArray: true})
    async updateModel(
        @Param('id') id: string,
        @Body() dto: ModelSaveDto,
    ) {
        dto.id = id;
        return this.modelService.updateModel(dto);
    }

    @Get('/enum/:id')
    @ApiOkResponse({type: EnumScheme, isArray: true})
    async getEnum(
        @Param('id') id: string,
    ) {
        return this.enumService.getEnumInfo(id);
    }

    @Post('project/:projectName/module/:moduleName/enum')
    @ApiOkResponse({type: EnumScheme, isArray: true})
    async createEnum(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Body() dto: EnumSaveDto,
    ) {
        return this.enumService.createEnum(projectName, moduleName, dto);
    }

    @Post('/enum/:id')
    @ApiOkResponse({type: EnumScheme, isArray: true})
    async updateEnum(
        @Param('id') id: string,
        @Body() dto: EnumSaveDto,
    ) {
        dto.id = id;
        return this.enumService.updateEnum(dto);
    }
}
