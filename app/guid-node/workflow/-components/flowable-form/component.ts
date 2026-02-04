import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import Node from 'ember-osf-web/models/node';
import {
    WorkflowTaskField,
    WorkflowTaskForm,
    WorkflowVariable,
} from '../../types';
import { isValidFieldValue } from './field/component';
import { FieldValueWithType } from './types';

interface FlowableFormArgs {
    form: WorkflowTaskForm;
    variables?: WorkflowVariable[];
    node?: Node;
    onChange: (variables: WorkflowVariable[], isValid: boolean) => void;
}

export function resolveFlowableType(fieldType: string | undefined): string {
    if (!fieldType) {
        return 'string';
    }
    const normalized = fieldType.toLowerCase();
    if (normalized === 'boolean') {
        return 'boolean';
    }
    if (normalized === 'date') {
        return 'date';
    }
    if (normalized === 'integer' || normalized === 'long') {
        return 'integer';
    }
    if (['double', 'decimal', 'number'].includes(normalized)) {
        return 'double';
    }
    return 'string';
}

export default class FlowableForm extends Component<FlowableFormArgs> {
    @tracked fieldValues: Record<string, FieldValueWithType> = {};
    @tracked updatedFieldValues: Record<string, FieldValueWithType> = {};

    get fields(): WorkflowTaskField[] {
        return this.args.form.fields || [];
    }

    get hasFields(): boolean {
        return this.fields.length > 0;
    }

    get isValid(): boolean {
        return this.fields
            .filter(field => this.isSubmittableField(field))
            .every(field => {
                if (!field.required) {
                    return true;
                }
                const fieldValue = this.updatedFieldValues[field.id];
                const value = fieldValue && fieldValue.value;
                return isValidFieldValue(field, value);
            });
    }

    @action
    initialize(_element?: Element): void { // tslint:disable-line:variable-name
        const variables: WorkflowVariable[] = this.args.variables || [];
        const nextValues: Record<string, FieldValueWithType> = {};
        const nextUpdatedValues: Record<string, FieldValueWithType> = {};
        this.fields.forEach(field => {
            const variable = variables.find(v => v.name === field.id);
            let fieldValue: FieldValueWithType;

            if (variable) {
                fieldValue = {
                    ...variable,
                };
            } else {
                let initial = null;
                if (field.value !== undefined) {
                    initial = field.value;
                } else if (field.defaultValue !== undefined) {
                    initial = field.defaultValue;
                }
                fieldValue = {
                    value: initial,
                    type: resolveFlowableType(field.type),
                };
            }

            nextValues[field.id] = fieldValue;
            nextUpdatedValues[field.id] = fieldValue;
        });
        this.fieldValues = nextValues;
        this.updatedFieldValues = nextUpdatedValues;
        this.notifyChange();
    }

    @action
    handleFieldChange(fieldId: string, valueWithType: FieldValueWithType): void {
        this.updatedFieldValues = {
            ...this.updatedFieldValues,
            [fieldId]: valueWithType,
        };
        this.notifyChange();
    }

    private isSubmittableField(field: WorkflowTaskField): boolean {
        const type = field.type.toLowerCase();
        const displayOnlyTypes = [
            'expression', 'hyperlink', 'link', 'headline', 'headline-with-line', 'spacer', 'horizontal-line',
        ];
        if (displayOnlyTypes.includes(type)) {
            return false;
        }
        if (field.readOnly) {
            return false;
        }
        return true;
    }

    private notifyChange(): void {
        const variables = this.fields
            .filter(field => this.isSubmittableField(field))
            .map(field => {
                const fieldValue = this.updatedFieldValues[field.id];
                return {
                    name: field.id,
                    ...fieldValue,
                };
            });

        this.args.onChange(variables, this.isValid);
    }
}
