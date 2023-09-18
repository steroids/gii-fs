import {RelationField, RelationIdField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModelFieldModel} from './ProjectModelFieldModel';

export class ProjectModelModel {
    @StringField()
    id: string;

    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ProjectModelFieldModel,
    })
    fields: ProjectModelFieldModel[];

    @RelationIdField({
        relationName: 'fields',
    })
    fieldsIds: string[];
}
