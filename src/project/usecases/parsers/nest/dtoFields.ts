import {basename} from '../../helpers';
import {IGiiFile, loadFile} from '../file';
import {IGiiProject} from '../project';
import {IGiiTsProperty} from '../typescript/properties';
import {IGiiTsImport, importWithName} from '../typescript/imports';
import {IGiiTsDecorator} from '../typescript/decorators';
import {findExtendField, findRelatedDtoForModelRelationField} from './helpers';
import {toObjectValueExpression} from '../typescript/objectValue';

export interface IGiiDtoField {
    type: 'BooleanField'
        | 'ComputableField'
        | 'CoordinateField'
        | 'EnumField'
        | 'ExtendField'
        | 'RelationField'
        | 'RelationIdField'
        | 'IntegerField'
        | 'CreateTimeField'
        | 'DateField'
        | 'DateTimeField'
        | 'DecimalField'
        | 'EmailField'
        | 'FileField'
        | 'HtmlField'
        | 'ImageField'
        | 'PasswordField'
        | 'PhoneField'
        | 'PrimaryKeyField'
        | 'StringField'
        | 'TextField'
        | 'TimeField'
        | 'UidField'
        | 'UpdateTimeField',
    name: string,
    oldName: string,
    label?: string,
    hint?: string,
    example?: string,
    isNullable?: boolean,
    isNoColumn?: boolean,
    isRequired?: boolean,
    isUnique?: boolean,
    isArray?: boolean,

    // IntegerField
    min?: number,
    max?: number,

    // EnumField
    enum?: string,

    // ExtendField
    extend?: string,

    // RelationField
    relation?: {
        type: 'ManyToOne'
            | 'ManyToMany'
            | 'OneToMany'
            | 'OneToOne',
        relationClass: string,

        // ManyToMany
        // OneToOne
        isOwningSide?: boolean,

        // ManyToMany
        tableName?: string,
    },

    // RelationIdField
    relationName?: string,
}
const FIELD_TYPE_BOOLEAN = 'BooleanField';
const FIELD_TYPE_COMPUTABLE = 'ComputableField';
const FIELD_TYPE_COORDINATE = 'CoordinateField';
const FIELD_TYPE_CREATE_TIME = 'CreateTimeField';
const FIELD_TYPE_DATE = 'DateField';
const FIELD_TYPE_DATE_TIME = 'DateTimeField';
const FIELD_TYPE_DECIMAL = 'DecimalField';
const FIELD_TYPE_EMAIL = 'EmailField';
const FIELD_TYPE_ENUM = 'EnumField';
const FIELD_TYPE_EXTEND = 'ExtendField';
const FIELD_TYPE_FILE = 'FileField';
const FIELD_TYPE_HTML = 'HtmlField';
const FIELD_TYPE_IMAGE = 'ImageField';
const FIELD_TYPE_INTEGER = 'IntegerField';
const FIELD_TYPE_PASSWORD = 'PasswordField';
const FIELD_TYPE_PHONE = 'PhoneField';
const FIELD_TYPE_PRIMARY_KEY = 'PrimaryKeyField';
const FIELD_TYPE_RELATION = 'RelationField';
const FIELD_TYPE_RELATION_ID = 'RelationIdField';
const FIELD_TYPE_STRING = 'StringField';
const FIELD_TYPE_TEXT = 'TextField';
const FIELD_TYPE_TIME = 'TimeField';
const FIELD_TYPE_UID = 'UidField';
const FIELD_TYPE_UPDATE_TIME = 'UpdateTimeField';

const singleKeys = decorator => {
    const keys = [
        'label',
        'hint',
        'example',
        'defaultValue',
        'nullable',
        'noColumn',
        'required',
        'unique',
        'isArray',
        'relationName',
    ];

    switch (decorator) {
        case FIELD_TYPE_INTEGER:
            keys.push('min', 'max');
            break;

        default:
            break;
    }

    return keys;
};

export function parseDtoFields(project: IGiiProject, file: IGiiFile, properties: IGiiTsProperty[]): IGiiDtoField[] {
    const result: IGiiDtoField[] = [];
    for (const property of properties) {
        const decorator = property.decorators?.find(({name}) => name.endsWith('Field'));
        const params: Record<string, any> = typeof decorator?.arguments[0] === 'object'
            ? decorator?.arguments[0]
            : {};

        const fieldData: IGiiDtoField = {
            name: property.name,
            oldName: property.name,
            type: decorator.name as any,
        };

        for (const key of singleKeys(params)) {
            if (typeof params[key] !== 'undefined') {
                fieldData[key] = params[key];
            }
        }

        switch (fieldData.type) {
            case FIELD_TYPE_RELATION:
                const relation: any = {
                    type: params.type,
                    relationClass: params.relationClass,
                };

                if (['OneToOne', 'ManyToMany'].includes(params.type)) {
                    relation.isOwningSide = params.isOwningSide;
                }
                if (params.type === 'ManyToMany') {
                    relation.tableName = params.tableName;
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

            case FIELD_TYPE_RELATION_ID:
                fieldData.relationName = params?.relationName;
                result.push(fieldData);
                break;

            case FIELD_TYPE_EXTEND:
                fieldData.extend = typeof decorator?.arguments[0] === 'string'
                    ? decorator?.arguments[0]
                    : null;
                result.push(fieldData);
                break;

            default:
                result.push(fieldData);
                break;
        }
    }

    return result;
}

const createFieldProperty = (field: IGiiDtoField, prevProperties: IGiiTsProperty[]): IGiiTsProperty => {
    const prevProperty = prevProperties?.find(({name}) => name === field.oldName);
    const prevDecorator = (prevProperty?.decorators || []).find(({name}) => name.endsWith('Field'));

    return {
        ...prevProperty,
        name: field.name,
        oldName: field.oldName || field.name,
        jsType: 'string',
        decorators: (prevProperty?.decorators || [])
            .filter(item => item !== prevDecorator),
        isArray: false, // TODO
    };
};

const createFieldDecorator = (field: IGiiDtoField, prevProperties: IGiiTsProperty[], customParams: Record<string, any> = {}): IGiiTsDecorator => {
    const prevProperty = prevProperties?.find(({name}) => name === field.oldName);
    const prevDecorator = (prevProperty?.decorators || []).find(({name}) => name.endsWith('Field'));

    const singleParams: Record<string, any> = {};
    for (const key of singleKeys(field.type)) {
        if (field[key]) {
            singleParams[key] = field[key];
        }
    }

    const params = {
        ...singleParams,
        ...customParams,
    };

    return {
        ...prevDecorator,
        name: field.type,
        oldName: prevDecorator?.name || field.type,
        arguments: Object.keys(params).length > 0
            ? [params]
            : [],
    };
};

export function generateDtoFields(
    project: IGiiProject,
    file: IGiiFile,
    fields: IGiiDtoField[],
    prevProperties: IGiiTsProperty[],
): [IGiiTsProperty[], IGiiTsImport[]] {
    const properties: IGiiTsProperty[] = [];
    const imports: IGiiTsImport[] = [];

    for (const field of fields) {
        if (!field?.name) {
            continue;
        }

        // const prevProperty = prevProperties?.find(({name}) => name === field.oldName);
        // const prevDecorator = (prevProperty?.decorators || []).find(({name}) => name.endsWith('Field'));

        const property = createFieldProperty(field, prevProperties);
        const decoratorParams: Record<string, any> = {};

        switch (field.type) {
            case FIELD_TYPE_INTEGER:
            case FIELD_TYPE_DECIMAL:
            case FIELD_TYPE_COORDINATE:
            case FIELD_TYPE_PRIMARY_KEY:
            case FIELD_TYPE_RELATION_ID:
                property.jsType = 'number';
                property.decorators.unshift(
                    createFieldDecorator(field, prevProperties),
                );
                break;

            case FIELD_TYPE_BOOLEAN:
                property.jsType = 'boolean';
                property.decorators.unshift(
                    createFieldDecorator(field, prevProperties),
                );
                break;

            case FIELD_TYPE_ENUM:
                const enumClass = field.enum;

                property.decorators.unshift(
                    createFieldDecorator(field, prevProperties, {
                        enum: basename(enumClass),
                    }),
                );
                imports.push(importWithName(enumClass, decoratorParams.enum));
                break;

            case FIELD_TYPE_RELATION:
                const relation = field.relation;
                const relationClassName = basename(relation.relationClass);
                property.isArray = ['OneToMany', 'ManyToMany'].includes(relation.type);
                property.jsType = relationClassName;
                property.decorators.unshift(
                    createFieldDecorator(field, prevProperties, {
                        type: relation.type,
                        relationClass: toObjectValueExpression('() => ' + relationClassName),
                        tableName: relation.type === 'ManyToMany' && relation.tableName
                            ? relation.tableName
                            : undefined,
                        isOwningSide: ['OneToOne', 'ManyToMany'].includes(relation.type)
                            ? !!relation.isOwningSide
                            : undefined,
                        // TODO inverseSide: ['ManyToMany', 'OneToMany', 'OneToOne'].includes(relation.type) ? '() => ///' : undefined,
                    }),
                );
                imports.push(importWithName(relation.relationClass, relationClassName));

                if (['OneToOne', 'ManyToOne'].includes(relation.type)) {
                    const idField: IGiiDtoField = {
                        name: property.name + 'Id',
                        oldName: property.oldName + 'Id',
                        type: FIELD_TYPE_RELATION_ID,
                        isArray: false,
                    };

                    const isIdPropertyExists = !!fields.find(({name}) => name === idField.name);
                    if (!isIdPropertyExists) {
                        const idProperty = createFieldProperty(
                            idField,
                            prevProperties,
                        );
                        idProperty.jsType = 'number';
                        idProperty.decorators.unshift(
                            createFieldDecorator(idField, prevProperties, {
                                label: decoratorParams.label,
                                relationName: property.name,
                            }),
                        );
                        properties.push(idProperty);
                    }
                }
                break;

            case FIELD_TYPE_COMPUTABLE:
                property.jsType = 'any'; // TODO
                break;

            case FIELD_TYPE_EXTEND:
                const extendClassFileId = field.extend;
                const extendClassFile = loadFile(project.path, extendClassFileId);

                // Получаем наследуемое поле
                const extendField = findExtendField(project, extendClassFileId, field.name);

                // Получаем тип наследуемого поля
                const modelFieldRaw: IGiiTsProperty = generateDtoFields(project, extendClassFile, [extendField], prevProperties)?.[0]?.[0];
                if (modelFieldRaw) {
                    property.jsType = modelFieldRaw.jsType;
                }

                // Если это связь (RelationField) и в dto не указан relationClass, то нужно найти подходящую dto
                if (extendField?.type === FIELD_TYPE_RELATION && extendField.relation.relationClass && !field?.relation?.relationClass) {
                    const relatedDto = findRelatedDtoForModelRelationField(
                        project,
                        basename(file.id), // example: ProjectRepositorySaveDto
                        basename(field.extend), // example: ProjectRepositoryModel
                        basename(extendField.relation.relationClass), // example: ProjectModel
                    ); // example dto name in result: ProjectSaveDto
                    if (relatedDto) {
                        const dtoClassName = basename(relatedDto.name);
                        property.jsType = dtoClassName;
                        decoratorParams.relationClass = toObjectValueExpression('() => ' + dtoClassName);
                        imports.push(importWithName(relatedDto.id, dtoClassName));
                    }
                }

                const extendClassName = basename(extendClassFileId);
                property.decorators.unshift(
                    {
                        name: FIELD_TYPE_EXTEND,
                        oldName: FIELD_TYPE_EXTEND,
                        arguments: [toObjectValueExpression(extendClassName)],
                    },
                );
                imports.push(importWithName(extendClassFileId, extendClassName));
                break;

            default:
                property.decorators.unshift(
                    createFieldDecorator(field, prevProperties),
                );
                break;
        }

        properties.push(property);
        imports.push(importWithName('node_modules/@steroidsjs/nest/infrastructure/decorators/fields/index.js', field.type));
    }

    return [
        properties,
        imports,
    ];
}
