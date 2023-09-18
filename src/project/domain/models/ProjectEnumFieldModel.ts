import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class ProjectEnumFieldModel {
    @StringField()
    id: string;

    @StringField()
    label: string
}
