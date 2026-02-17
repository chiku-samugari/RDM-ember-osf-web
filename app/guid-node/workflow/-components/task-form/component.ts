import Component from '@glimmer/component';

import Node from 'ember-osf-web/models/node';
import {
    WorkflowTaskForm,
    WorkflowVariable,
} from '../../types';
import { isCedarForm, isFlowableForm } from '../../utils';

interface TaskFormArgs {
    form: WorkflowTaskForm;
    variables: WorkflowVariable[];
    node?: Node;
    onChange: (variables: WorkflowVariable[], isValid: boolean) => void;
}

export default class TaskForm extends Component<TaskFormArgs> {
    get hasFlowableForm(): boolean {
        return isFlowableForm(this.args.form);
    }

    get hasCedarForm(): boolean {
        return isCedarForm(this.args.form);
    }

    get noFormAvailable(): boolean {
        return !this.hasFlowableForm && !this.hasCedarForm;
    }
}
