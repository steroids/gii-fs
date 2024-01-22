import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ModelEnumScheme} from './ModelEnumScheme';
import {ProjectModuleModel} from '../../domain/models/ProjectModuleModel';
import {EnumEnumScheme} from './EnumEnumScheme';
import {ModelScheme} from './ModelScheme';
import {EnumScheme} from './EnumScheme';

export class ModuleDetailScheme {
    @ExtendField(ProjectModuleModel)
    name: string;

    @ExtendField(ProjectModuleModel, {
        relationClass: () => ModelScheme,
    })
    models: ModelScheme[];

    @ExtendField(ProjectModuleModel, {
        relationClass: () => ModelScheme,
    })
    enums: EnumScheme[];
}
