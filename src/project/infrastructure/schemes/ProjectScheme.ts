import {ModuleScheme} from './ModuleScheme';
import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectModel} from '../../domain/models/ProjectModel';

export class ProjectScheme {
    @ExtendField(ProjectModel)
    name: string;

    @ExtendField(ProjectModel, {
        relationClass: () => ModuleScheme,
    })
    modules: ModuleScheme[];
}
