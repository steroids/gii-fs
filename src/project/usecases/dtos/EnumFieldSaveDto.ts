import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectEnumFieldModel} from '../../domain/models/ProjectEnumFieldModel';
import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class EnumFieldSaveDto {
    @StringField()
    oldId: string;

    @ExtendField(ProjectEnumFieldModel)
    id: string;

    @ExtendField(ProjectEnumFieldModel)
    label: string
}
