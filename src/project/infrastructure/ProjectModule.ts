import {Module} from '@nestjs/common';
import {ModuleHelper} from '@steroidsjs/nest/infrastructure/helpers/ModuleHelper';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ProjectController} from './controllers/ProjectController';
import {ProjectService} from '../usecases/services/ProjectService';
import {ProjectModelService} from '../usecases/services/ProjectModelService';
import {ProjectEnumService} from '../usecases/services/ProjectEnumService';
import {ProjectParserService} from '../usecases/services/ProjectParserService';

@Module({
    imports: [
        ConfigModule,
    ],
    controllers: [
        ProjectController,
    ],
    providers: [
        ModuleHelper.provide(ProjectParserService, [ConfigService]),
        ModuleHelper.provide(ProjectModelService, [ProjectParserService]),
        ModuleHelper.provide(ProjectEnumService, [ProjectParserService]),
        ModuleHelper.provide(ProjectService, [
            ProjectParserService,
            ProjectModelService,
            ProjectEnumService,
            ConfigService,
        ]),
    ]
})
export class ProjectModule {}
