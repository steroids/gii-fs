import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {Computable} from '@steroidsjs/nest/infrastructure/decorators/Computable';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {ModelRelationScheme} from './ModelRelationScheme';
import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class ModelFieldScheme {
    @StringField()
    @Computable(({item}) => item.name)
    oldName: string;

    @ExtendField(ProjectModelFieldModel)
    name: string;

    @ExtendField(ProjectModelFieldModel)
    type: string;

    @ExtendField(ProjectModelFieldModel)
    label?: string;

    @ExtendField(ProjectModelFieldModel)
    defaultValue?: any;

    @ExtendField(ProjectModelFieldModel, {
        relationClass: () => ModelRelationScheme,
    })
    relation: ModelRelationScheme;

    @ExtendField(ProjectModelFieldModel)
    isPrimaryKey?: boolean;

    @ExtendField(ProjectModelFieldModel)
    isUnique?: boolean;

    @ExtendField(ProjectModelFieldModel)
    isNullable?: boolean;

    @ExtendField(ProjectModelFieldModel)
    isRequired?: boolean;

    @ExtendField(ProjectModelFieldModel)
    enumId?: string;

    @ExtendField(ProjectModelFieldModel)
    relationName?: string;

    @ExtendField(ProjectModelFieldModel)
    isArray?: boolean;

    @ExtendField(ProjectModelFieldModel)
    max?: number;

    @ExtendField(ProjectModelFieldModel)
    min?: number;

    @ExtendField(ProjectModelFieldModel)
    isNoColumn?: boolean;
}
