import { WorkflowTaskField } from './types';

interface MetadataPlaceholder {
    schemaName: string;
    options: string[];
    multiSelect: boolean;
}

export type ProjectMetadataPlaceholder = MetadataPlaceholder;

export type FileMetadataPlaceholder = MetadataPlaceholder;

function extractMetadataPlaceholder(field: WorkflowTaskField, token: '_PROJECT_METADATA' | '_FILE_METADATA'):
MetadataPlaceholder | null {
    if (field.type !== 'multi-line-text') {
        return null;
    }
    const { placeholder } = field;
    if (!placeholder) {
        return null;
    }
    const pattern = new RegExp(`^${token}\\((.+)\\)$`);
    const match = placeholder.match(pattern);
    if (!match) {
        return null;
    }
    const raw = match[1];
    const segments = raw.split(',').map(part => part.trim()).filter(part => part.length > 0);
    if (segments.length === 0) {
        return null;
    }
    const [schemaName, ...options] = segments;
    const normalizedOptions = options.map(option => option.toUpperCase());
    return {
        schemaName,
        options,
        multiSelect: normalizedOptions.includes('MULTISELECT'),
    };
}

export function extractProjectMetadata(field: WorkflowTaskField): ProjectMetadataPlaceholder | null {
    return extractMetadataPlaceholder(field, '_PROJECT_METADATA');
}

export function extractFileMetadata(field: WorkflowTaskField): FileMetadataPlaceholder | null {
    return extractMetadataPlaceholder(field, '_FILE_METADATA');
}
