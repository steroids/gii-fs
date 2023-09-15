import BaseEnum from '@steroidsjs/nest/domain/base/BaseEnum';

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
}
