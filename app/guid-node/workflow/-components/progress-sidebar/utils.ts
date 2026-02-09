import { WorkflowTaskField, WorkflowTaskForm, WorkflowVariable } from '../../types';
import { FieldValueWithType } from '../flowable-form/types';

export type StepStatus = 'completed' | 'current' | 'pending';

export interface ProgressStep {
    name: string;
    status: StepStatus;
    level: number;
    children: ProgressStep[];
    isActive: boolean;
}

export function toStringValue(fieldValue: FieldValueWithType | WorkflowVariable): string {
    if (fieldValue.type === 'string') {
        return fieldValue.value as string;
    }
    const val = fieldValue.value;
    if (val === null || val === undefined) {
        return '';
    }
    return String(val);
}

export function parseProgressSteps(text: string): { steps: ProgressStep[]; remainingText: string } {
    const lines = text.split('\n');
    const stepLines: string[] = [];
    let remainingStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*-\s*\[[x>\s]\]/.test(line)) {
            stepLines.push(line);
            remainingStartIndex = i + 1;
        } else if (stepLines.length > 0 && line.trim() === '') {
            remainingStartIndex = i + 1;
            break;
        } else if (stepLines.length > 0) {
            break;
        }
    }

    if (stepLines.length === 0) {
        return { steps: [], remainingText: text };
    }

    const rootSteps: ProgressStep[] = [];
    const stack: Array<{ step: ProgressStep; level: number }> = [];

    for (const line of stepLines) {
        const match = line.match(/^(\s*)-\s*\[([x>\s])\]\s*(.+)$/);
        if (!match) {
            continue;
        }

        const indent = match[1].length;
        const marker = match[2];
        const name = match[3].trim();

        let status: StepStatus;
        if (marker === 'x') {
            status = 'completed';
        } else if (marker === '>') {
            status = 'current';
        } else {
            status = 'pending';
        }

        const step: ProgressStep = { name, status, level: indent, children: [], isActive: false };

        while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
            stack.pop();
        }

        if (stack.length === 0) {
            rootSteps.push(step);
        } else {
            stack[stack.length - 1].step.children.push(step);
        }

        stack.push({ step, level: indent });
    }

    const remainingText = lines.slice(remainingStartIndex).join('\n').trim();
    return { steps: rootSteps, remainingText };
}

export function hasCurrentInChildren(step: ProgressStep): boolean {
    if (step.status === 'current') {
        return true;
    }
    for (const child of step.children) {
        if (hasCurrentInChildren(child)) {
            return true;
        }
    }
    return false;
}

export function markActiveSteps(steps: ProgressStep[]): void {
    for (const step of steps) {
        if (step.status === 'current' || hasCurrentInChildren(step)) {
            step.isActive = true;
        }
        markActiveSteps(step.children);
    }
}

export function getExpressionText(
    form: WorkflowTaskForm | undefined,
    variables: WorkflowVariable[] | undefined,
): string {
    if (!form || !form.fields) {
        return '';
    }

    const expressionField = form.fields.find(f => f.type === 'expression') as
        (WorkflowTaskField & { expression?: string }) | undefined;

    if (!expressionField || !expressionField.expression) {
        return '';
    }

    return expressionField.expression.replace(/\$\{([^}]+)\}/g, (_, name) => {
        const trimmed = name.trim();
        const variable = (variables || []).find(v => v.name === trimmed);
        if (variable) {
            return toStringValue(variable);
        }
        return '';
    });
}

export function isFinalStep(form: WorkflowTaskForm | undefined, variables: WorkflowVariable[] | undefined): boolean {
    const text = getExpressionText(form, variables);
    const { steps } = parseProgressSteps(text);

    if (steps.length === 0) {
        return true;
    }

    const lastTopLevelStep = steps[steps.length - 1];
    return lastTopLevelStep.status === 'current' || hasCurrentInChildren(lastTopLevelStep);
}
