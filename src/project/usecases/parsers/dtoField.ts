import {SyntaxKind} from 'typescript';
import {generateObjectValue, parseObjectValue} from './objectValue';
import {IGeneratedCode, tab} from '../helpers';
import {SteroidsFieldsEnum} from '../../domain/enums/SteroidsFieldsEnum';
import {IGiiFile, loadFile} from './file';
import {IGiiProject} from './project';
import {parseDto} from './dto';

export interface IGiiDtoField {
    type: 'BooleanField'
        // | 'ComputableField'
        // | 'CoordinateField'
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

export interface IGiiDtoRawField {
    name: string,
    oldName?: string,
    jsType?: string,
    decorator: string,
    decoratorArgs?: string[],
    params: Record<string, any>,
    isArray?: boolean,
}

export const findExtendField = (project, extendClassFileId, fieldName) => {
    const modelFile = loadFile(project.path, extendClassFileId);
    const model = parseDto(project, modelFile);
    return model.fields.find(({name}) => fieldName === name);
};

export function parseDtoField(project: IGiiProject, file: IGiiFile, tsMember: any): IGiiDtoRawField | null {
    const handler = decorator => decorator.expression?.expression?.escapedText?.includes('Field');
    const fieldDecorator = tsMember.decorators?.find(handler) || tsMember.modifiers?.find(handler);
    if (!fieldDecorator) {
        return null;
    }

    const data = {
        name: tsMember.name.escapedText,
        oldName: tsMember.name.escapedText,
        decorator: fieldDecorator.expression.expression.escapedText,
        decoratorArgs: [],
        params: {},
    };

    for (const argument of fieldDecorator.expression.arguments) {
        switch (argument.kind) {
            case SyntaxKind.Identifier:
                data.decoratorArgs.push(parseObjectValue(project, file, argument));
                break;

            case SyntaxKind.ObjectLiteralExpression:
                for (const property of argument.properties || []) {
                    const key = property.name?.escapedText;
                    const value = parseObjectValue(project, file, property.initializer);
                    if (key) {
                        data.params[key] = value;
                    }
                }
                break;

            default:
                break;
        }
    }

    return data;
}

export function generateDtoField(project: IGiiProject, data: IGiiDtoRawField): IGeneratedCode {
    const imports = [];
    const type = data.jsType + (data.isArray ? '[]' : '');

    let params = '';
    for (const key of Object.keys(data.params)) {
        const [fieldCode, fieldImports] = generateObjectValue(project, key, data.params[key]);
        if (fieldCode) {
            params += `${tab(2)}${key}: ${fieldCode},\n`;
        }
        imports.push(...fieldImports);
    }

    return [
        [
            `${tab()}@${data.decorator}(`,
            [
                ...(data.decoratorArgs || []),
                params && `{\n${params}${tab()}}`,
            ].filter(Boolean).join(', '),
            ')\n',
            `${tab()}${data.name}: ${type};`,
        ].filter(Boolean).join(''),
        imports,
    ];
}
