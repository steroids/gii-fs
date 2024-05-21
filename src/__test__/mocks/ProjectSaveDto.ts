import {ExtendField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ProjectModel} from './ProjectModel';

/**
 * @extend-model ProjectModel
 */
export class ProjectSaveDto {
    @ExtendField(ProjectModel)
    id: number;

    @ExtendField(ProjectModel)
    createTime: string;
}
