import {
    PrimaryKeyField,
    CreateTimeField,
    UpdateTimeField,
} from '@steroidsjs/nest/infrastructure/decorators/fields';

export class ProjectModel {
    @PrimaryKeyField()
    id: number;

    @CreateTimeField()
    createTime: string;

    @UpdateTimeField()
    updateTime: string;
}
