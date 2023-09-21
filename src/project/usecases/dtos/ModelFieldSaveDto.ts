import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectModelFieldModel} from '../../domain/models/ProjectModelFieldModel';
import {RelationSaveDto} from './RelationSaveDto';
import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class ModelFieldSaveDto {
    @StringField()
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
        relationClass: () => RelationSaveDto,
    })
    relation: RelationSaveDto;

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
