import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectEnumModel} from '../../domain/models/ProjectEnumModel';
import {EnumFieldSaveDto} from './EnumFieldSaveDto';

export class EnumSaveDto {
    @ExtendField(ProjectEnumModel)
    name: string;

    @ExtendField(ProjectEnumModel, {
        relationClass: () => EnumFieldSaveDto,
    })
    fields: EnumFieldSaveDto[];
}
