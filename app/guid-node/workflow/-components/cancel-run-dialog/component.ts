import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface WorkflowCancelRunDialogArgs {
    open: boolean;
    run: {
        id: string;
        status?: string;
        statusRaw?: string;
        started_at?: string; // eslint-disable-line camelcase
        created?: string;
    } | null;
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export default class WorkflowCancelRunDialog extends Component<WorkflowCancelRunDialogArgs> {
    @tracked reason = '';

    @action
    updateReason(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        this.reason = target.value;
    }

    @action
    handleConfirm(): void {
        this.args.onConfirm(this.reason);
    }
}

declare module '@glimmer/component' {
    export default interface Registry {
        'Workflow::CancelRunDialog': typeof WorkflowCancelRunDialog;
    } // eslint-disable-line semi
}
