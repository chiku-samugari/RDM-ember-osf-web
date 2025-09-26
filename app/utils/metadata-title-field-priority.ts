/**
 * Priority order for title fields in registration metadata responses.
 * The first matching field with a value will be used as the display title.
 */
export const METADATA_TITLE_FIELD_PRIORITY = [
    'project-name-ja',
    'project-name-en',
    'title-of-dataset',
    'title-of-dataset-en',
] as const;

export type MetadataTitleFieldType = typeof METADATA_TITLE_FIELD_PRIORITY[number];
