import BaseEnum from '@steroidsjs/nest/domain/base/BaseEnum';
import * as path from 'path';
import {
    IGiiDtoField,
    IGiiDtoRawField,
} from '../../usecases/parsers/dtoField';
import {IGiiImport, importWithName} from '../../usecases/parsers/imports';

export class SteroidsFieldsEnum extends BaseEnum {
    static BOOLEAN_FIELD = 'BooleanField';

    static COMPUTABLE_FIELD = 'ComputableField';

    static COORDINATE_FIELD = 'CoordinateField';

    static CREATE_TIME_FIELD = 'CreateTimeField';

    static DATE_FIELD = 'DateField';

    static DATE_TIME_FIELD = 'DateTimeField';

    static DECIMAL_FIELD = 'DecimalField';

    static EMAIL_FIELD = 'EmailField';

    static ENUM_FIELD = 'EnumField';

    static EXTEND_FIELD = 'ExtendField';

    static FILE_FIELD = 'FileField';

    static HTML_FIELD = 'HtmlField';

    static IMAGE_FIELD = 'ImageField';

    static INTEGER_FIELD = 'IntegerField';

    static PASSWORD_FIELD = 'PasswordField';

    static PHONE_FIELD = 'PhoneField';

    static PRIMARY_KEY_FIELD = 'PrimaryKeyField';

    static RELATION_FIELD = 'RelationField';

    static RELATION_ID_FIELD = 'RelationIdField';

    static STRING_FIELD = 'StringField';

    static TEXT_FIELD = 'TextField';

    static TIME_FIELD = 'TimeField';

    static UID_FIELD = 'UidField';

    static UPDATE_TIME_FIELD = 'UpdateTimeField';

    static getFieldType(id: string) {
        switch (id) {
            case this.INTEGER_FIELD:
            case this.DECIMAL_FIELD:
            case this.COORDINATE_FIELD:
            case this.PRIMARY_KEY_FIELD:
            case this.RELATION_ID_FIELD:
                return 'number';
            case this.RELATION_FIELD:
                return 'object';
            case this.COMPUTABLE_FIELD:
            case this.EXTEND_FIELD:
                return 'any';
            case this.BOOLEAN_FIELD:
                return 'boolean';
            default:
                return 'string';
        }
    }

    static singleKeys(decorator) {
        const singleKeys = [
            'label',
            'hint',
            'example',
            'defaultValue',
            'isNullable',
            'isNoColumn',
            'isRequired',
            'isUnique',
            'isArray',
        ];

        switch (decorator) {
            case this.INTEGER_FIELD:
                singleKeys.push('min', 'max');
                break;

            default:
                break;
        }

        return singleKeys;
    }

    static fromCodeParams(rawFields: IGiiDtoRawField[]): IGiiDtoField[] {
        const result = [];
        for (const rawField of rawFields) {
            const fieldData: IGiiDtoField = {
                name: rawField.name,
                oldName: rawField.name,
                type: rawField.decorator as any,
            };

            const singleKeys = this.singleKeys(rawField.decorator);
            for (const key of singleKeys) {
                if (typeof rawField.params[key] !== 'undefined') {
                    fieldData[key] = rawField.params[key];
                }
            }

            switch (rawField.decorator) {
                case this.RELATION_FIELD:
                    const relation: any = {
                        type: rawField.params.type,
                        relationClass: rawField.params.relationClass,
                    };

                    if (['OneToOne', 'ManyToMany'].includes(rawField.params.type)) {
                        relation.isOwningSide = rawField.params.isOwningSide;
                    }
                    if (rawField.params.type === 'ManyToMany') {
                        relation.tableName = rawField.params.tableName;
                    }
                    // if (['OneToOne', 'ManyToOne'].includes(rawField.params.type)) {
                    //     const relationIdField = rawFields.find(item => item.params.relationName === rawField.name);
                    //     if (relationIdField) {
                    //         // relationIdField.relation = {
                    //         //     ...field.relation,
                    //         //     ...relationIdField.relation,
                    //         // };
                    //     }
                    // }
                    fieldData.relation = relation;
                    result.push(fieldData);
                    break;

                case this.RELATION_ID_FIELD:
                    break;

                case this.EXTEND_FIELD:
                    fieldData.extend = rawField.decoratorArgs?.[0] || null;
                    result.push(fieldData);
                    break;

                default:
                    result.push(fieldData);
                    break;
            }
        }

        return result;
    }

    static toCodeParams(fields: IGiiDtoField[]): [IGiiDtoRawField[], IGiiImport[]] {
        const result: IGiiDtoRawField[] = [];
        const imports: IGiiImport[] = [];
        for (const field of fields) {
            const dtoField: IGiiDtoRawField = {
                name: field.name,
                oldName: field.oldName || field.name,
                decorator: field.type,
                params: {},
                isArray: false, // TODO
            };

            const singleKeys = this.singleKeys(dtoField.decorator);
            for (const key of singleKeys) {
                if (field[key]) {
                    dtoField.params[key] = field[key];
                }
            }

            switch (dtoField.decorator) {
                case this.ENUM_FIELD:
                    const enumClass = field.enum;
                    dtoField.params.enum = path.basename(enumClass, '.ts');
                    imports.push(importWithName(enumClass, dtoField.params.enum));
                    break;

                case this.RELATION_FIELD:
                    const relation = field.relation;
                    const relationClassName = path.basename(relation.relationClass, '.ts');
                    dtoField.isArray = ['OneToMany', 'ManyToMany'].includes(relation.type);
                    dtoField.params = {
                        ...dtoField.params,
                        type: relation.type,
                        relationClass: '() => ' + relationClassName,
                    };
                    imports.push(importWithName(relation.relationClass, relationClassName));

                    if (relation.type === 'ManyToMany' && relation.tableName) {
                        dtoField.params.tableName = relation.tableName;
                    }
                    if (['OneToOne', 'ManyToMany'].includes(relation.type)) {
                        dtoField.params.isOwningSide = !!relation.isOwningSide;
                    }
                    if (['ManyToMany', 'OneToMany', 'OneToOne'].includes(relation.type)) {
                        // TODO rawField.params.inverseSide = '() => ///'
                    }
                    if (['OneToOne', 'ManyToOne'].includes(relation.type)) {
                        result.push({
                            name: dtoField.name + 'Id',
                            oldName: dtoField.name + 'Id',
                            decorator: this.RELATION_ID_FIELD,
                            isArray: false,
                            params: {
                                label: dtoField.params.label,
                                relationName: dtoField.name,
                            },
                        });
                    }
                    break;

                case this.EXTEND_FIELD:
                    const extendClass = field.extend;
                    const extendClassName = path.basename(extendClass, '.ts');
                    dtoField.decoratorArgs = [extendClassName];
                    imports.push(importWithName(extendClass, extendClassName));
                    break;

                default:
                    break;
            }

            result.push(dtoField);
        }

        return [result, imports];
    }
}
