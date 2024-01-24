import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ModelFieldSaveDto} from './ModelFieldSaveDto';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';

export class ModelSaveDto {
    @ExtendField(ProjectModelModel)
    name: string;

    @ExtendField(ProjectModelModel, {
        relationClass: () => ModelFieldSaveDto,
    })
    fields: ModelFieldSaveDto[];
}
