import {IGiiFile} from '../file';
import {updateFileContent} from '../../helpers';
import {importDefault, replaceImports} from '../typescript/imports';
import {IGiiProject} from '../project';
import {generateClass, IGiiTsClass, parseClass} from '../typescript/class';
import {toObjectKeyExpression} from '../typescript/objectValue';

export interface IGiiEnumField {
    name: string,
    oldName: string,
    value?: string,
    label?: string,
}

export interface IGiiEnum {
    id: string,
    name: string,
    oldName: string,
    description?: string,
    fields?: IGiiEnumField[],
}

const LABELS_FUNCTION_NAME = 'getLabels';

export const PARSER_NEST_ENUM = 'enum';

const isConstantName = name => /^[A-Z][A-Z0-9_]+$/.test(name);

export function parseEnum(project: IGiiProject, file: IGiiFile): IGiiEnum {
    const data = parseClass(project, file);

    const labelsRaw = data.methods
        .find(method => method.name === LABELS_FUNCTION_NAME)
        ?.bodyReturn?.value;

    return {
        id: file.id,
        name: data.name,
        oldName: data.oldName,
        description: data.description,
        fields: data.properties
            .filter(property => isConstantName(property.name))
            .map(property => ({
                name: property.name,
                oldName: property.oldName,
                value: JSON.parse(property.defaultValue),
                label: labelsRaw?.[toObjectKeyExpression('[this.' + property.name + ']')] || '',
            })),
    };
}

export function generateEnum(project: IGiiProject, file: IGiiFile, data: IGiiEnum): IGiiFile[] {
    if (!file.code) {
        file = {
            ...file,
            code: `\n\nexport class ${data.name} extends BaseEnum {\n}\n`,
        };
    }

    const prevData = parseClass(project, file);

    const classData: IGiiTsClass = {
        ...prevData,
        name: data.name,
        oldName: data.oldName,
        description: data.description,
        properties: prevData.properties
            .filter(property => !isConstantName(property.name))
            .concat(
                data.fields.map(field => ({
                    name: field.name.toUpperCase(),
                    oldName: field.oldName,
                    defaultValue: "'" + field.value + "'",
                    isStatic: true,
                })),
            ),
        methods: prevData.methods
            .filter(method => method.name !== LABELS_FUNCTION_NAME)
            .concat({
                name: LABELS_FUNCTION_NAME,
                oldName: LABELS_FUNCTION_NAME,
                isStatic: true,
                bodyReturn: {
                    value: data.fields.reduce(
                        (obj, field) => {
                            obj[toObjectKeyExpression('[this.' + field.name.toUpperCase() + ']')] = field.label;
                            return obj;
                        },
                        {},
                    ),
                },
            }),
    };

    const imports = [
        importDefault('node_modules/@steroidsjs/nest/domain/base/BaseEnum', 'BaseEnum'),
    ];

    const [fragments, classImports] = generateClass(project, file, classData);
    const newFile = {...file};
    newFile.code = updateFileContent(newFile.code, fragments);
    newFile.code = replaceImports(
        project,
        newFile,
        {
            ...imports,
            ...classImports,
        },
    );

    return [newFile];
}
