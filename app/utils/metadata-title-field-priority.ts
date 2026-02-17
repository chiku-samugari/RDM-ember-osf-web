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

/**
 * Extract display title from registration responses based on METADATA_TITLE_FIELD_PRIORITY.
 * Tries both `__responseKey_${field}` and `${field}` for each priority field.
 * @param responses - The registration responses object
 * @param fallbackTitle - The fallback title to use if no field is found
 * @returns The extracted title or fallback
 */
export function getMetadataDisplayTitle(
    responses: { [key: string]: unknown } | undefined,
    fallbackTitle: string,
): string {
    if (!responses) {
        return fallbackTitle;
    }
    for (const field of METADATA_TITLE_FIELD_PRIORITY) {
        const responseKeyField = `__responseKey_${field}`;
        const value = responses[responseKeyField] || responses[field];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return fallbackTitle;
}
