import Component from '@glimmer/component';

import { WorkflowTaskForm, WorkflowVariable } from '../../types';

import {
    getExpressionText,
    markActiveSteps,
    parseProgressSteps,
    ProgressStep,
} from './utils';

interface ProgressSidebarArgs {
    form?: WorkflowTaskForm;
    variables?: WorkflowVariable[];
}

export default class ProgressSidebar extends Component<ProgressSidebarArgs> {
    get expressionText(): string {
        return getExpressionText(this.args.form, this.args.variables);
    }

    get parsedExpression(): { steps: ProgressStep[]; remainingText: string } {
        const result = parseProgressSteps(this.expressionText);
        markActiveSteps(result.steps);
        return result;
    }

    get hasProgressSteps(): boolean {
        return this.parsedExpression.steps.length > 0;
    }

    get progressSteps(): ProgressStep[] {
        return this.parsedExpression.steps;
    }
}
