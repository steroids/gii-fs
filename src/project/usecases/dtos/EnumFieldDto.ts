import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class EnumFieldDto {
    @StringField()
    id: string;

    @StringField()
    label: string
}
