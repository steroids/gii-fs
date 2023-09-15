import {Module} from '@nestjs/common';
import {ProjectController} from './controllers/ProjectController';
import {ProjectService} from '../usecases/services/ProjectService';
import {ModuleHelper} from '@steroidsjs/nest/infrastructure/helpers/ModuleHelper';
import {ConfigModule, ConfigService} from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
    ],
    controllers: [
        ProjectController,
    ],
    providers: [
        ModuleHelper.provide(ProjectService, [ConfigService]),
    ]
})
export class ProjectModule {}
