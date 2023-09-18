import {BooleanField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class ProjectRelationModel {
    @StringField()
    type: string;

    @StringField()
    modelId: string;

    @BooleanField({nullable: true})
    isOwningSide?: boolean;

    @StringField()
    inverseSide: string;
}
