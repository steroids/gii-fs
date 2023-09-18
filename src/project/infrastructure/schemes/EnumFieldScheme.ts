import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';

export class EnumFieldScheme {
    @ExtendField(ProjectEnumFieldModel)
    id: string;

    @ExtendField(ProjectEnumFieldModel)
    label: string
}
