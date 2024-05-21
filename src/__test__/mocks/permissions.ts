export const PERMISSION_PROJECT_PROJECT_VIEW = 'project_project_view';
export const PERMISSION_PROJECT_PROJECT_EDIT = 'project_project_edit';

export default [
    {
        id: PERMISSION_PROJECT_PROJECT_VIEW,
        label: 'Просмотр «ProjectModel»',
        items: [
            {
                id: PERMISSION_PROJECT_PROJECT_EDIT,
                label: 'Редактирование «ProjectModel»',
            },
        ],
    },
];
