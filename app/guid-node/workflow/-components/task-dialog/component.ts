import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import Intl from 'ember-intl/services/intl';
import Node from 'ember-osf-web/models/node';

import {
    TaskDialogSubmission,
    WorkflowTaskDetail,
    WorkflowVariable,
} from '../../types';
import { isFinalStep } from '../progress-sidebar/utils';

interface WorkflowTaskDialogArgs {
    open: boolean;
    task: WorkflowTaskDetail | null;
    node: Node;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    actionError: string | null;
    onClose: () => void;
    onSubmit: (submission: TaskDialogSubmission) => void;
}

export default class WorkflowTaskDialog extends Component<WorkflowTaskDialogArgs> {
    @service intl!: Intl;
    @tracked formVariables: WorkflowVariable[] = [];
    @tracked isFormValid = true;

    get hasTask(): boolean {
        return Boolean(this.args.task);
    }

    get taskTitle(): string {
        const { task } = this.args;
        if (task && task.name) {
            return task.name;
        }
        return '';
    }

    get assigneeLabel(): string {
        const { task } = this.args;
        const assignee = task && task.assignee;
        if (!assignee) {
            return this.intl.t('workflow.console.tasks.dialog.unassigned') as string;
        }
        const lower = assignee.toLowerCase();
        if (lower === 'executor') {
            return this.intl.t('workflow.console.tasks.assignee.executor') as string;
        }
        if (lower === 'creator') {
            return this.intl.t('workflow.console.tasks.assignee.creator') as string;
        }
        if (lower === 'manager') {
            return this.intl.t('workflow.console.tasks.assignee.manager') as string;
        }
        if (lower === 'contributor') {
            return this.intl.t('workflow.console.tasks.assignee.contributor') as string;
        }
        return assignee;
    }

    get canComplete(): boolean {
        const { task } = this.args;
        return !task || task.can_complete !== false;
    }

    get isFinalStep(): boolean {
        const { task } = this.args;
        if (!task) {
            return true;
        }
        return isFinalStep(task.form || undefined, task.variables);
    }

    @action
    handleFormChange(variables: WorkflowVariable[], isValid: boolean): void {
        this.formVariables = variables;
        this.isFormValid = isValid;
    }

    @action
    handleSubmit(): void {
        if (!this.args.task) {
            return;
        }

        const submission: TaskDialogSubmission = {
            action: 'complete',
            variables: this.formVariables,
        };

        this.args.onSubmit(submission);
    }
}
