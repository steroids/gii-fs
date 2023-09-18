import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectModelModel} from '../../domain/models/ProjectModelModel';

export class ModelEnumScheme {
    @ExtendField(ProjectModelModel)
    id: string;

    @ExtendField(ProjectModelModel)
    name: string;
}
