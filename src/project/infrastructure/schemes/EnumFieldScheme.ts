import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {Computable} from '@steroidsjs/nest/infrastructure/decorators/Computable';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';

export class EnumFieldScheme {
    @StringField()
    @Computable(({item}) => item.id)
    oldId: string;

    @ExtendField(ProjectEnumFieldModel)
    id: string;

    @ExtendField(ProjectEnumFieldModel)
    label: string
}
