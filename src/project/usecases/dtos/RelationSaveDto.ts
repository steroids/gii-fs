import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields/ExtendField';
import {ProjectRelationModel} from '../../domain/models/ProjectRelationModel';

export class RelationSaveDto {
    @ExtendField(ProjectRelationModel)
    type: string;

    @ExtendField(ProjectRelationModel)
    modelId: string;

    @ExtendField(ProjectRelationModel)
    isOwningSide?: boolean;

    @ExtendField(ProjectRelationModel)
    inverseSide: string;
}
