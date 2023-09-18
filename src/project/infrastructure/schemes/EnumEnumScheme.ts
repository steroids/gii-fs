import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';

export class EnumEnumScheme {
    @ExtendField(ProjectEnumModel)
    id: string;

    @ExtendField(ProjectEnumModel)
    name: string;
}
