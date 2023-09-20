import {
    BooleanField,
    ComputableField,
    RelationField,
    StringField
} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectRelationModel} from './ProjectRelationModel';

export class ProjectModelFieldModel {
    @StringField()
    name: string;

    @StringField()
    type: string;

    @StringField({nullable: true})
    label?: string;

    @ComputableField({callback: ({item}) => item.defaultValue})
    defaultValue?: any;

    @RelationField({
        type: 'ManyToOne',
        relationClass: () => ProjectRelationModel,
    })
    relation: ProjectRelationModel;

    @BooleanField({nullable: true})
    isPrimaryKey?: boolean;

    @BooleanField({nullable: true})
    isUnique?: boolean;

    @BooleanField({nullable: true})
    isNullable?: boolean;

    @BooleanField({nullable: true})
    isRequired?: boolean;

    @StringField({
        label: 'Поле enum из EnumField',
        nullable: true
    })
    enumId?: string;
}
