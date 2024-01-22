import BaseEnum from '@steroidsjs/nest/domain/base/BaseEnum';

export class ModelFieldOptionsEnum extends BaseEnum {
    static LABEL = 'label';

    static NULLABLE = 'nullable';

    static REQUIRED = 'required';

    static UNIQUE = 'unique';

    static DEFAULT_VALUE = 'defaultValue';

    static ENUM = 'enum';

    static TYPE = 'type';

    static IS_OWNING_SIDE = 'isOwningSide';

    static RELATION_CLASS = 'relationClass';

    static INVERSE_SIDE = 'inverseSide';

    static RELATION_NAME = 'relationName';

    static IS_ARRAY = 'isArray';

    static MAX = 'max';

    static MIN = 'min';

    static NO_COLUMN = 'no_column';

    private static dtoFieldsMap = {
        [this.LABEL]: 'label',
        [this.NULLABLE]: 'isNullable',
        [this.REQUIRED]: 'isRequired',
        [this.UNIQUE]: 'isUnique',
        [this.DEFAULT_VALUE]: 'defaultValue',
        [this.ENUM]: 'enumId',
        [this.TYPE]: 'relation.type',
        [this.IS_OWNING_SIDE]: 'relation.isOwningSide',
        [this.RELATION_CLASS]: 'relation',
        [this.INVERSE_SIDE]: 'relation.inverseSide',
        [this.RELATION_NAME]: 'relationName',
        [this.IS_ARRAY]: 'isArray',
        [this.MAX]: 'max',
        [this.MIN]: 'min',
        [this.NO_COLUMN]: 'isNoColumn',
    }

    static getDtoFields() {
        return Object.values(this.dtoFieldsMap);
    }

    static getDtoField(id: string) {
        return this.dtoFieldsMap[id];
    }

    static getOptionByDtoField(dtoField: string) {
        for (const [key, value] of Object.entries(this.dtoFieldsMap)) {
            if (value === dtoField) {
                return key;
            }
        }
        return null;
    }

    static getLabels() {
        return {
            [this.LABEL]: 'Label',
            [this.NULLABLE]: 'Nullable',
            [this.REQUIRED]: 'Required',
            [this.UNIQUE]: 'Unique',
            [this.DEFAULT_VALUE]: 'Default value',
            [this.ENUM]: 'Enum',
            [this.TYPE]: 'Type',
            [this.IS_OWNING_SIDE]: 'Is owning side',
            [this.RELATION_CLASS]: 'Relation class',
            [this.INVERSE_SIDE]: 'Inverse side',
            [this.RELATION_NAME]: 'Relation name',
            [this.IS_ARRAY]: 'Is array',
            [this.MIN]: 'Min',
            [this.MAX]: 'Max',
            [this.NO_COLUMN]: 'No column',
        };
    }
}
