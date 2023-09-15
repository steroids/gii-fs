import {RelationField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ModelDto} from './ModelDto';
import {EnumDto} from './EnumDto';

export class ModuleDto {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ModelDto,
    })
    models: ModelDto[];

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => EnumDto,
    })
    enums: EnumDto[];
}
