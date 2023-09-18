import {RelationField, RelationIdField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectEnumFieldModel} from './ProjectEnumFieldModel';

export class ProjectEnumModel {
    @StringField()
    id: string;

    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ProjectEnumFieldModel,
    })
    fields: ProjectEnumFieldModel[];

    @RelationIdField({
        relationName: 'fields',
    })
    fieldsIds: string[];
}
