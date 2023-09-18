import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {EnumFieldScheme} from './EnumFieldScheme';

export class EnumScheme {
    @ExtendField(ProjectEnumModel)
    name: string;

    @ExtendField(ProjectEnumModel, {
        relationClass: () => EnumFieldScheme,
    })
    fields: EnumFieldScheme[];
}
