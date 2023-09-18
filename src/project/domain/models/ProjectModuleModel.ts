import {RelationField, RelationIdField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModelModel} from './ProjectModelModel';
import {ProjectEnumModel} from './ProjectEnumModel';

export class ProjectModuleModel {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ProjectModelModel,
    })
    models: ProjectModelModel[];

    @RelationIdField({
        isArray: true,
        relationName: 'models',
    })
    modelsIds: string[];

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ProjectEnumModel,
    })
    enums: ProjectEnumModel[];

    @RelationIdField({
        relationName: 'enums',
        isArray: true,
    })
    enumsIds: string[];
}
