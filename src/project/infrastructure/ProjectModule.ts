import {Module} from '@nestjs/common';
import {ModuleHelper} from '@steroidsjs/nest/infrastructure/helpers/ModuleHelper';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ProjectController} from './controllers/ProjectController';
import {ProjectService} from '../usecases/services/ProjectService';
import {ProjectModelService} from '../usecases/services/ProjectModelService';
import {ProjectEnumService} from '../usecases/services/ProjectEnumService';

@Module({
    imports: [
        ConfigModule,
    ],
    controllers: [
        ProjectController,
    ],
    providers: [
        ModuleHelper.provide(ProjectService, [ConfigService]),
        ModuleHelper.provide(ProjectModelService, []),
        ModuleHelper.provide(ProjectEnumService, []),
    ]
})
export class ProjectModule {}
