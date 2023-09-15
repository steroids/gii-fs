import {
    BooleanField,
    ComputableField,
    RelationField,
    StringField
} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {RelationDto} from './RelationDto';

export class ModelFieldDto {
    @StringField()
    name: string;

    @StringField()
    type: string;

    @StringField({nullable: true})
    label?: string;

    @ComputableField({callback: ({item}) => item.defaultValue})
    defaultValue?: any;

    @RelationField({
        type: 'ManyToOne',
        relationClass: () => RelationDto,
    })
    relationDto: RelationDto;

    @BooleanField({nullable: true})
    isPrimaryKey?: boolean;

    @BooleanField({nullable: true})
    isUnique?: boolean;

    @BooleanField({nullable: true})
    isNullable?: boolean;

    @BooleanField({nullable: true})
    isRequired?: boolean;
}
