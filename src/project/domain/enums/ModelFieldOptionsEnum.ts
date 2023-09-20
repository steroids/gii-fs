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

    private static dtoFieldsMap = {
        [this.LABEL]: 'label',
        [this.NULLABLE]: 'isNullable',
        [this.REQUIRED]: 'isRequired',
        [this.UNIQUE]: 'isUnique',
        [this.DEFAULT_VALUE]: 'defaultValue',
        [this.ENUM]: 'enumId',
        [this.TYPE]: 'relation.type',
        [this.IS_OWNING_SIDE]: 'relation.isOwningSide',
        [this.RELATION_CLASS]: 'relation.modelId',
        [this.INVERSE_SIDE]: 'relation.inverseSide',
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
}
