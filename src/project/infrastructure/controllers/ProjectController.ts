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

    @Get('/project/:projectName')
    @ApiOkResponse({type: ProjectDetailScheme})
    async getProject(
        @Param('projectName') name: string,
    ) {
        return this.projectService.getProject(name);
    }

    @Post('/project/:projectName/module/:moduleName/model')
    @ApiOkResponse({type: ModelScheme})
    async createModel(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Body() dto: ModelSaveDto,
    ) {
        return this.modelService.createModel(projectName, moduleName, dto);
    }

    @Post('/project/:projectName/module/:moduleName/model/:itemName')
    @ApiOkResponse({type: ModelScheme})
    async updateModel(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Param('itemName') itemName: string,
        @Body() dto: ModelSaveDto,
    ) {
        dto.name = itemName;
        return this.modelService.updateModel(projectName, moduleName, dto);
    }

    @Post('/project/:projectName/module/:moduleName/enum')
    @ApiOkResponse({type: EnumScheme})
    async createEnum(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Body() dto: EnumSaveDto,
    ) {
        return this.enumService.createEnum(projectName, moduleName, dto);
    }

    @Post('/project/:projectName/module/:moduleName/enum/:itemName')
    @ApiOkResponse({type: EnumScheme})
    async updateEnum(
        @Param('projectName') projectName: string,
        @Param('moduleName') moduleName: string,
        @Param('itemName') itemName: string,
        @Body() dto: EnumSaveDto,
    ) {
        dto.name = itemName;
        return this.enumService.updateEnum(projectName, moduleName, dto);
    }
}
