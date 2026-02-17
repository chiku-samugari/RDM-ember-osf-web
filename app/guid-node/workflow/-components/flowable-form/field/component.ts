import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { WorkflowVariable } from '../../../types';
import { parseProgressSteps, ProgressStep } from '../../progress-sidebar/utils';
import { resolveFlowableType } from '../component';
import { FieldValueWithType, WorkflowTaskField, WorkflowTaskFieldOption } from '../types';
import { extractFileMetadata, extractProjectMetadata } from '../utils';

function getOptionValue(option: WorkflowTaskFieldOption): string | undefined {
    return (option.id !== undefined && option.id !== null) ? option.id : option.name;
}

function isValidFieldValue(field: WorkflowTaskField, value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return false;
    }
    const type = field.type.toLowerCase();
    if (['dropdown', 'select', 'radio-buttons', 'radio'].includes(type)) {
        const options = field.options || [];
        const validValues = options.map(getOptionValue).filter(v => v !== undefined && v !== null && v !== '');
        if (validValues.length > 0 && !validValues.includes(String(value))) {
            return false;
        }
    }
    return true;
}

function toStringValue(fieldValue: FieldValueWithType): string {
    if (fieldValue.type === 'string') {
        return fieldValue.value as string;
    }
    const val = fieldValue.value;
    if (val === null || val === undefined) {
        return '';
    }
    return String(val);
}

function toBooleanValue(fieldValue: FieldValueWithType): boolean {
    if (fieldValue.type === 'boolean') {
        return fieldValue.value as boolean;
    }
    if (fieldValue.type === 'string') {
        const val = fieldValue.value as string;
        return val.toLowerCase() === 'true';
    }
    return false;
}

export { isValidFieldValue, getOptionValue, toStringValue, toBooleanValue };

interface TaskFormFieldArgs {
    field: WorkflowTaskField;
    fieldValues: Record<string, FieldValueWithType>;
    variables: WorkflowVariable[];
    node?: any;
    onChange: (fieldId: string, valueWithType: FieldValueWithType) => void;
}

export default class TaskFormField extends Component<TaskFormFieldArgs> {
    @tracked updatedValue: FieldValueWithType | null = null;

    @action
    handleChange(event: Event): void {
        const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        let value: unknown;

        if (this.isBoolean) {
            const input = target as HTMLInputElement;
            value = input.checked;
        } else if (this.type === 'integer' || this.type === 'long') {
            const stringValue = target.value;
            if (stringValue === '') {
                value = null;
            } else {
                const parsed = parseInt(stringValue, 10);
                value = Number.isNaN(parsed) ? null : parsed;
            }
        } else if (this.isNumber) {
            const stringValue = target.value;
            if (stringValue === '') {
                value = null;
            } else {
                const parsed = parseFloat(stringValue);
                value = Number.isNaN(parsed) ? null : parsed;
            }
        } else {
            // string, date, etc.
            const stringValue = target.value;
            value = stringValue === '' ? null : stringValue;
        }

        const valueWithType: FieldValueWithType = {
            value: value !== undefined ? value : null,
            type: resolveFlowableType(this.args.field.type),
        };
        this.updatedValue = valueWithType;
        this.args.onChange(this.args.field.id, valueWithType);
    }

    @action
    handleProjectMetadataSelection(valueWithType: FieldValueWithType): void {
        this.updatedValue = valueWithType;
        this.args.onChange(this.args.field.id, valueWithType);
    }

    @action
    handleFileMetadataSelection(valueWithType: FieldValueWithType): void {
        this.updatedValue = valueWithType;
        this.args.onChange(this.args.field.id, valueWithType);
    }

    get displayValue(): unknown {
        return this.updatedValue !== null ? this.updatedValue.value : this.currentValue;
    }

    get hasError(): boolean {
        if (!this.isRequired) {
            return false;
        }
        const val = this.displayValue;
        const isValid = isValidFieldValue(this.args.field, val);
        return !isValid;
    }
    get type(): string {
        return this.args.field.type;
    }

    get fieldId(): string {
        return `workflow-field-${this.args.field.id}`;
    }

    get isRequired(): boolean {
        return this.args.field.required === true;
    }

    get isReadOnly(): boolean {
        return this.args.field.readOnly === true;
    }

    get placeholder(): string | undefined {
        return this.args.field.placeholder;
    }

    get fieldLabel(): string {
        return this.args.field.name || this.args.field.id;
    }

    get currentValue(): FieldValueWithType | undefined {
        return this.args.fieldValues[this.args.field.id];
    }

    get stringValue(): string {
        const current = this.currentValue;
        if (!current) {
            return '';
        }
        return toStringValue(current);
    }

    get booleanValue(): boolean {
        const current = this.currentValue;
        if (!current) {
            return false;
        }
        return toBooleanValue(current);
    }

    get options(): WorkflowTaskFieldOption[] {
        return this.args.field.options || [];
    }

    get optionsWithValue(): Array<{ option: WorkflowTaskFieldOption; value: string }> {
        let opts = this.options;
        if (this.args.field.hasEmptyValue && opts.length > 0) {
            opts = opts.slice(1);
        }
        return opts.map(opt => ({
            option: opt,
            value: getOptionValue(opt) || '',
        }));
    }

    get hasOptions(): boolean {
        return this.options.length > 0;
    }

    get isTextField(): boolean {
        return this.type === 'text' || this.type === 'string';
    }

    get isTextarea(): boolean {
        if (this.isProjectMetadataSelector) {
            return false;
        }
        return this.type === 'multi-line-text' || this.type === 'textarea';
    }

    get projectMetadataPlaceholder() {
        return extractProjectMetadata(this.args.field);
    }

    get isProjectMetadataSelector(): boolean {
        return this.projectMetadataPlaceholder !== null;
    }

    get projectMetadataSchemaName(): string | null {
        return this.projectMetadataPlaceholder ? this.projectMetadataPlaceholder.schemaName : null;
    }

    get projectMetadataMultiSelect(): boolean {
        const placeholder = this.projectMetadataPlaceholder;
        return placeholder ? placeholder.multiSelect : false;
    }

    get fileMetadataPlaceholder() {
        return extractFileMetadata(this.args.field);
    }

    get isFileMetadataSelector(): boolean {
        return this.fileMetadataPlaceholder !== null;
    }

    get fileMetadataSchemaName(): string | null {
        return this.fileMetadataPlaceholder ? this.fileMetadataPlaceholder.schemaName : null;
    }

    get fileMetadataMultiSelect(): boolean {
        const placeholder = this.fileMetadataPlaceholder;
        return placeholder ? placeholder.multiSelect : false;
    }

    get isPassword(): boolean {
        return this.type === 'password';
    }

    get isNumber(): boolean {
        return ['number', 'integer', 'decimal', 'double', 'long'].includes(this.type);
    }

    get isBoolean(): boolean {
        return this.type === 'boolean' || this.type === 'checkbox';
    }

    get isDate(): boolean {
        return this.type === 'date';
    }

    get isSelect(): boolean {
        return this.type === 'select' || this.type === 'dropdown';
    }

    get isRadio(): boolean {
        return this.type === 'radio-buttons' || this.type === 'radio';
    }

    get isUpload(): boolean {
        return this.type === 'upload' || this.type === 'file';
    }

    get isExpression(): boolean {
        return this.type === 'expression';
    }

    get isHyperlink(): boolean {
        return this.type === 'hyperlink' || this.type === 'link';
    }

    get isHeadline(): boolean {
        return this.type === 'headline';
    }

    get isHeadlineWithLine(): boolean {
        return this.type === 'headline-with-line';
    }

    get isSpacer(): boolean {
        return this.type === 'spacer';
    }

    get isHorizontalLine(): boolean {
        return this.type === 'horizontal-line';
    }

    get isDisplayOnly(): boolean {
        return this.isExpression || this.isHyperlink || this.isHeadline
            || this.isHeadlineWithLine || this.isSpacer || this.isHorizontalLine;
    }

    get expressionText(): string {
        const field = this.args.field as unknown as { expression?: string };
        const expression = field.expression || '';

        return expression.replace(/\$\{([^}]+)\}/g, (_match, varName) => { // tslint:disable-line:variable-name
            const trimmed = varName.trim();
            const variable = this.args.variables.find(v => v.name === trimmed);
            if (variable) {
                return toStringValue(variable);
            }
            const fieldValue = this.args.fieldValues[trimmed];
            if (fieldValue) {
                return toStringValue(fieldValue);
            }
            return '';
        });
    }

    get hyperlinkUrl(): string {
        const field = this.args.field as unknown as { params?: { hyperlinkUrl?: string } };
        return (field.params && field.params.hyperlinkUrl) || '#';
    }

    get parsedExpression(): { steps: ProgressStep[]; remainingText: string } {
        return parseProgressSteps(this.expressionText);
    }

    get hasProgressSteps(): boolean {
        return this.parsedExpression.steps.length > 0;
    }

    get remainingExpressionText(): string {
        return this.parsedExpression.remainingText;
    }
}
