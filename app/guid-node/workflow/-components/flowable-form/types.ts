interface WorkflowTaskFieldOption {
    id?: string;
    name?: string;
    value?: string;
}

interface WorkflowTaskField {
    id: string;
    name?: string;
    type: string;
    value?: unknown;
    defaultValue?: unknown;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    options?: WorkflowTaskFieldOption[];
    hasEmptyValue?: boolean;
    expression?: string;
    params?: {
        hyperlinkUrl?: string;
        [key: string]: unknown;
    };
}

interface FieldValueWithType {
    value: unknown;
    type: string;
}

export {
    WorkflowTaskField,
    WorkflowTaskFieldOption,
    FieldValueWithType,
};
