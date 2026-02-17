import { WorkflowTaskForm } from './types';

export function isFlowableForm(form: WorkflowTaskForm | undefined | null): boolean {
    if (!form) {
        return false;
    }
    return Array.isArray(form.fields) && form.fields.length > 0;
}

export function isCedarForm(form: WorkflowTaskForm | undefined | null): boolean {
    if (!form) {
        return false;
    }
    return Boolean(form.data);
}
