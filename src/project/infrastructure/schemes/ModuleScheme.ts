import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ModelEnumScheme} from './ModelEnumScheme';
import {ProjectModuleModel} from '../../domain/models/ProjectModuleModel';
import {EnumEnumScheme} from './EnumEnumScheme';

export class ModuleScheme {
    @ExtendField(ProjectModuleModel)
    name: string;

    @ExtendField(ProjectModuleModel, {
        relationClass: () => ModelEnumScheme,
    })
    models: ModelEnumScheme[];

    @ExtendField(ProjectModuleModel, {
        relationClass: () => EnumEnumScheme,
    })
    enums: EnumEnumScheme[];
}
