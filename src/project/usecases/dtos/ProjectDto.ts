import {RelationField, StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';
import {ModuleDto} from './ModuleDto';

export class ProjectDto {
    @StringField()
    name: string;

    @RelationField({
        type: 'ManyToMany',
        isOwningSide: true,
        relationClass: () => ModuleDto,
    })
    modules: ModuleDto[];
}
