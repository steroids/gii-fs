import {RelationField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ModelFieldDto} from './ModelFieldDto';

export class ModelDto {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ModelFieldDto,
    })
    fields: ModelFieldDto[];
}
