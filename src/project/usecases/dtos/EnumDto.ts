import {RelationField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {EnumFieldDto} from './EnumFieldDto';

export class EnumDto {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => EnumFieldDto,
    })
    fields: EnumFieldDto[];
}
