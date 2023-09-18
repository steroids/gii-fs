import {RelationField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModuleModel} from './ProjectModuleModel';

export class ProjectModel {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ProjectModuleModel,
    })
    modules: ProjectModuleModel[];
}
