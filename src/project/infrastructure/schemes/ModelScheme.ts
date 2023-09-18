import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';
import {ModelFieldScheme} from './ModelFieldScheme';

export class ModelScheme {
    @ExtendField(ProjectModelModel)
    name: string;

    @ExtendField(ProjectModelModel, {
        relationClass: () => ModelFieldScheme,
    })
    fields: ModelFieldScheme[];
}
