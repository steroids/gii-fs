import {ModuleDetailScheme} from './ModuleDetailScheme';
import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectModel} from '../../domain/models/ProjectModel';

export class ProjectDetailScheme {
    @ExtendField(ProjectModel)
    name: string;

    @ExtendField(ProjectModel, {
        relationClass: () => ModuleDetailScheme,
    })
    modules: ModuleDetailScheme[];
}
