import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'ember-get-config';

import Intl from 'ember-intl/services/intl';
import Node from 'ember-osf-web/models/node';
import CurrentUser from 'ember-osf-web/services/current-user';
import pathJoin from 'ember-osf-web/utils/path-join';

import {
    TaskDialogSubmission,
    WorkflowActivationApiResponse,
    WorkflowRouteModel,
    WorkflowRunSummary,
    WorkflowTaskDetail,
    WorkflowTaskSummary,
    WorkflowTemplate,
    WorkflowVariable,
} from './types';

export {
    WorkflowTemplate,
    WorkflowRouteModel,
    WorkflowRunSummary,
    WorkflowTaskSummary,
    WorkflowTaskDetail,
    TaskDialogSubmission,
};

interface AjaxErrorShape {
    responseJSON?: { message?: string; data?: { message?: string } };
    payload?: unknown;
}

function isAjaxError(error: unknown): error is AjaxErrorShape {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const obj = error as Record<string, unknown> | null;
    if (!obj) {
        return false;
    }
    return 'responseJSON' in obj || 'payload' in obj;
}

function ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
}

function extractMessage(error: unknown, fallback: string): string {
    const err = error as any;
    const response: any = (err && err.responseJSON) || (err && err.payload && err.payload.responseJSON);
    if (response && response.message) {
        return response.message as string;
    }
    if (response && response.data && response.data.message) {
        return response.data.message as string;
    }
    return fallback;
}

export function normalizeTemplates(activations: WorkflowActivationApiResponse[]): WorkflowTemplate[] {
    return activations.map(entry => {
        const { template } = entry;
        const { id } = template;
        const shortLabel = template.label || template.definition_name
            || template.definition_key || template.definition_id || id;
        const displayLabel = !template.is_local && template.node_title
            ? `${shortLabel} [${template.node_title}]`
            : shortLabel;
        return {
            id: String(id),
            label: template.label ? String(template.label) : undefined,
            shortLabel,
            displayLabel,
            definitionId: template.definition_id ? String(template.definition_id) : undefined,
            definitionKey: template.definition_key ? String(template.definition_key) : undefined,
            definitionName: template.definition_name ? String(template.definition_name) : undefined,
            description: template.description ? String(template.description) : undefined,
            nodeTitle: template.node_title ? String(template.node_title) : undefined,
            isLocal: Boolean(template.is_local),
            isActive: template.is_active !== false,
            isEnabled: entry.is_enabled !== false,
            definitionFormSchema: template.definition_form_schema,
        } as WorkflowTemplate;
    });
}

export default class GuidNodeWorkflowController extends Controller {
    @service currentUser!: CurrentUser;
    @service intl!: Intl;

    @tracked templates: WorkflowTemplate[] = [];
    @tracked templatesError: string | null = null;
    @tracked isRefreshing = false;

    @tracked selectedTemplateId = '';
    @tracked startFormVariables: WorkflowVariable[] = [];
    @tracked prefilledStartFormVariables: WorkflowVariable[] = [];
    @tracked isStartFormValid = true;

    @tracked isSubmitting = false;
    @tracked submitError: string | null = null;
    @tracked submitSuccess: string | null = null;

    @tracked runs: WorkflowRunSummary[] = [];
    @tracked runsError: string | null = null;
    @tracked isRefreshingRuns = false;
    @tracked runsLoaded = false;
    @tracked hideCompletedRuns = true;

    @tracked isCancelDialogOpen = false;
    @tracked cancellingRun: WorkflowRunSummary | null = null;
    @tracked isCancellingRun = false;
    @tracked cancelRunError: string | null = null;

    get visibleRuns(): WorkflowRunSummary[] {
        if (!this.hideCompletedRuns) {
            return this.runs;
        }
        return this.runs.filter(run => run.status === 'running');
    }

    get runsWithActions(): Array<
        WorkflowRunSummary & { projectUrl: string; isCurrentProject: boolean; canCancel: boolean }
        > {
        if (!this.node) {
            return [];
        }
        const currentNodeId = this.node.id;
        const hasAdminPermission = Boolean(this.node && this.node.userHasAdminPermission);
        const filtered = this.hideCompletedRuns
            ? this.runs.filter(run => run.status === 'running')
            : this.runs;
        return filtered.map(run => {
            const isCompleted = run.status === 'completed' || run.status === 'cancelled' || run.status === 'failed';
            const canCancel = hasAdminPermission && !isCompleted && run.node_id === currentNodeId;
            return {
                ...run,
                projectUrl: pathJoin(config.OSF.url, run.node_id),
                isCurrentProject: run.node_id === currentNodeId,
                canCancel,
            };
        });
    }

    @tracked tasks: WorkflowTaskSummary[] = [];
    @tracked tasksError: string | null = null;
    @tracked isRefreshingTasks = false;
    @tracked tasksLoaded = false;
    @tracked hideCompletedTasks = true;

    get tasksWithActions(): Array<
        WorkflowTaskSummary & {
            canComplete: boolean; assigneeDisplay: string; projectUrl: string; isCurrentProject: boolean;
        }
        > {
        if (!this.node) {
            return [];
        }
        const currentNodeId = this.node.id;
        const filtered = this.hideCompletedTasks
            ? this.tasks.filter(task => task.task_status === 'running')
            : this.tasks;
        return filtered.map(task => ({
            ...task,
            canComplete: task.can_complete !== false,
            assigneeDisplay: this.assigneeLabel(task.assignee),
            projectUrl: pathJoin(config.OSF.url, task.node_id),
            isCurrentProject: task.node_id === currentNodeId,
        }));
    }

    get assignedTaskCount(): number {
        return this.tasksWithActions.filter(task => task.canComplete).length;
    }

    @tracked selectedTask: WorkflowTaskDetail | null = null;
    @tracked isTaskDialogOpen = false;
    @tracked isLoadingTaskDetail = false;
    @tracked taskDetailError: string | null = null;
    @tracked isSubmittingTaskAction = false;
    @tracked taskActionError: string | null = null;
    @tracked taskActionSuccess: string | null = null;

    @tracked activeTab: 'start' | 'runs' | 'tasks' = 'start';

    apiBaseUrl = '';
    node?: Node;

    runStatusLabels: Record<string, string> = {};

    get activeTemplates(): WorkflowTemplate[] {
        return this.templates.filter(entry => entry.isActive && entry.isEnabled);
    }

    get canStartWorkflow(): boolean {
        return Boolean(this.node && this.node.userHasWritePermission);
    }

    get selectedTemplate(): WorkflowTemplate | undefined {
        return this.activeTemplates.find(entry => entry.id === this.selectedTemplateId);
    }

    get startDisabled(): boolean {
        return !this.canStartWorkflow || !this.selectedTemplateId || this.isSubmitting || !this.isStartFormValid;
    }

    get nodeTitle(): string {
        return (this.node && this.node.title) || this.intl.t('workflow.console.heading') as string;
    }

    initialize(model: WorkflowRouteModel, hash: string): void {
        this.node = model.node;
        this.apiBaseUrl = ensureTrailingSlash(model.apiBaseUrl);
        this.templates = model.templates;
        this.templatesError = model.templatesError || null;

        this.runStatusLabels = {
            queued: this.intl.t('workflow.console.status.queued') as string,
            running: this.intl.t('workflow.console.status.running') as string,
            completed: this.intl.t('workflow.console.status.completed') as string,
            failed: this.intl.t('workflow.console.status.failed') as string,
            cancelled: this.intl.t('workflow.console.status.cancelled') as string,
        };

        const hasStartHash = this.updateSelectionFromHash(hash);
        const taskToOpen = this.extractTaskFromHash(hash);
        this.refreshRuns();
        this.refreshTasks().then(() => {
            if (taskToOpen) {
                this.activeTab = 'tasks';
                const task = this.tasks.find(t => t.id === taskToOpen.taskId && t.engine_id === taskToOpen.engineId);
                if (task) {
                    this.openTask(task);
                }
            } else if (!hasStartHash) {
                const hasAssignedTasks = this.tasksWithActions.some(task => task.canComplete);
                if (hasAssignedTasks) {
                    this.activeTab = 'tasks';
                }
            }
        });
    }

    applyHash(hash?: string): boolean {
        if (!hash) {
            return false;
        }
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const startValue = params.get('start');
        if (!startValue) {
            return false;
        }
        if (this.activeTemplates.some(entry => String(entry.id) === startValue)) {
            this.selectedTemplateId = startValue;

            const variables: WorkflowVariable[] = [];
            params.forEach((value, key) => {
                if (key.startsWith('field_')) {
                    const fieldId = key.substring(6);
                    variables.push({
                        name: fieldId,
                        value,
                        type: 'string',
                    });
                }
            });
            this.prefilledStartFormVariables = variables;

            return true;
        }
        return false;
    }

    updateSelectionFromHash(hash?: string): boolean {
        const candidate = hash !== undefined ? hash : window.location.hash;
        return this.applyHash(candidate);
    }

    extractTaskFromHash(hash?: string): { taskId: string; engineId: string } | null {
        const candidate = hash !== undefined ? hash : window.location.hash;
        if (!candidate) {
            return null;
        }
        const params = new URLSearchParams(candidate.replace(/^#/, ''));
        const taskId = params.get('taskId');
        const engineId = params.get('engineId');
        if (taskId && engineId) {
            return { taskId, engineId };
        }
        return null;
    }

    formatDate(value?: string | null): string {
        if (!value) {
            return '';
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString();
        }
        return value;
    }

    @action
    selectTemplate(event: Event): void {
        const target = event.target as HTMLSelectElement | null;
        const value = (target && target.value) || '';
        this.selectedTemplateId = value;
        this.submitError = null;
        this.submitSuccess = null;
        this.startFormVariables = [];
        this.prefilledStartFormVariables = [];
        if (value) {
            window.location.hash = `start=${encodeURIComponent(value)}`;
        } else {
            const { pathname, search } = window.location;
            window.history.replaceState(null, document.title, `${pathname}${search}`);
        }
    }

    runStatusLabel(run: WorkflowRunSummary & { statusRaw?: unknown }): string {
        if (run.status) {
            const localized = this.runStatusLabels[run.status];
            if (localized) {
                return localized;
            }
        }
        if (typeof run.statusRaw === 'string' && run.statusRaw.trim()) {
            return run.statusRaw;
        }
        if (run.status) {
            return run.status;
        }
        return '';
    }

    @action
    setActiveTab(tab: 'start' | 'runs' | 'tasks'): void {
        if (this.activeTab === tab) {
            return;
        }
        this.activeTab = tab;
        if (tab === 'runs' && !this.runsLoaded) {
            this.refreshRuns();
        }
        if (tab === 'tasks' && !this.tasksLoaded) {
            this.refreshTasks();
        }
    }

    @action
    toggleHideCompletedRuns(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        this.hideCompletedRuns = Boolean(target && target.checked);
    }

    @action
    toggleHideCompletedTasks(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        this.hideCompletedTasks = Boolean(target && target.checked);
    }

    @action
    async refreshRuns(): Promise<void> {
        if (!this.apiBaseUrl) {
            return;
        }
        this.isRefreshingRuns = true;
        this.runsError = null;
        try {
            const response = await this.currentUser.authenticatedAJAX({
                url: `${this.apiBaseUrl}runs/`,
                type: 'GET',
                data: { limit: 25 },
            });
            const data = (response && (response as any).data) || [];
            this.runs = data.map((entry: any) => {
                const rawStatus = entry.status;
                const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
                return {
                    ...entry,
                    status: normalizedStatus,
                    statusRaw: rawStatus,
                };
            });
            this.runsLoaded = true;
        } catch (error) {
            if (isAjaxError(error)) {
                this.runsError = extractMessage(
                    error,
                    this.intl.t('workflow.console.runs.loadError') as string,
                );
            } else {
                throw error;
            }
        } finally {
            this.isRefreshingRuns = false;
        }
    }

    @action
    openCancelDialog(run: WorkflowRunSummary): void {
        this.cancellingRun = run;
        this.isCancelDialogOpen = true;
        this.cancelRunError = null;
    }

    @action
    closeCancelDialog(): void {
        this.isCancelDialogOpen = false;
        this.cancellingRun = null;
        this.cancelRunError = null;
    }

    @action
    async confirmCancelRun(reason: string): Promise<void> {
        const run = this.cancellingRun;
        if (!this.apiBaseUrl || !run) {
            return;
        }

        const runId = run.id;
        this.isCancellingRun = true;
        this.cancelRunError = null;

        // Mark as cancelling in the list
        this.runs = this.runs.map(r => (r.id === runId ? { ...r, isCancelling: true } : r));

        try {
            await this.currentUser.authenticatedAJAX({
                url: `${this.apiBaseUrl}runs/${encodeURIComponent(runId)}/`,
                type: 'DELETE',
                data: reason ? { reason } : undefined,
            });

            this.closeCancelDialog();
            await this.refreshRuns();
        } catch (error) {
            this.cancelRunError = extractMessage(
                error,
                this.intl.t('workflow.console.runs.cancelError') as string,
            );

            // Remove cancelling flag on error
            this.runs = this.runs.map(r => (r.id === runId ? { ...r, isCancelling: false } : r));
        } finally {
            this.isCancellingRun = false;
        }
    }

    @action
    async refreshTasks(): Promise<void> {
        if (!this.apiBaseUrl) {
            return;
        }
        this.isRefreshingTasks = true;
        this.tasksError = null;
        try {
            const response = await this.currentUser.authenticatedAJAX({
                url: `${this.apiBaseUrl}tasks/`,
                type: 'GET',
                data: { limit: 25 },
            });
            this.tasks = (response as any).data;
            this.tasksLoaded = true;
        } catch (error) {
            if (isAjaxError(error)) {
                this.tasksError = extractMessage(
                    error,
                    this.intl.t('workflow.console.tasks.loadError') as string,
                );
            } else {
                throw error;
            }
        } finally {
            this.isRefreshingTasks = false;
        }
    }

    @action
    async openTask(task: WorkflowTaskSummary): Promise<void> {
        this.taskDetailError = null;
        this.selectedTask = null;
        this.isTaskDialogOpen = true;
        this.isLoadingTaskDetail = true;
        this.taskActionError = null;
        this.taskActionSuccess = null;

        try {
            const taskUrl = `${this.apiBaseUrl}engines/${encodeURIComponent(task.engine_id)}`
                + `/tasks/${encodeURIComponent(task.id)}/`;
            const response = await this.currentUser.authenticatedAJAX({
                url: taskUrl,
                type: 'GET',
                data: { include_form: 'true' },
            });
            const data = (response && (response as any).data) || null;
            if (!data) {
                throw new Error('Task payload not found.');
            }
            this.selectedTask = data;
        } catch (error) {
            if (isAjaxError(error)) {
                this.taskDetailError = extractMessage(
                    error,
                    this.intl.t('workflow.console.tasks.detailLoadError') as string,
                );
            } else {
                const err = error as Error;
                this.taskDetailError = (err && err.message) || String(error);
            }
        } finally {
            this.isLoadingTaskDetail = false;
        }
    }

    @action
    closeTaskDialog(): void {
        this.isTaskDialogOpen = false;
        this.selectedTask = null;
        this.taskDetailError = null;
        this.taskActionError = null;
        this.isLoadingTaskDetail = false;
        this.isSubmittingTaskAction = false;
    }

    @action
    async handleTaskSubmit(submission: TaskDialogSubmission): Promise<void> {
        if (!this.selectedTask) {
            throw new Error('No task selected');
        }

        const processInstanceId = this.selectedTask.process_instance_id;

        this.isSubmittingTaskAction = true;
        this.taskActionError = null;
        try {
            const actionUrl = `${this.apiBaseUrl}engines/${encodeURIComponent(this.selectedTask.engine_id)}`
                + `/tasks/${encodeURIComponent(this.selectedTask.id)}/actions/`;
            await this.currentUser.authenticatedAJAX({
                url: actionUrl,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    action: submission.action,
                    variables: submission.variables,
                    ...(submission.assignee ? { assignee: submission.assignee } : {}),
                }),
            });
            this.taskActionSuccess = this.intl.t('workflow.console.tasks.submitSuccess') as string;
            await this.refreshTasks();

            const nextTask = this.tasksWithActions.find(
                task => task.process_instance_id === processInstanceId && task.canComplete,
            );

            if (nextTask) {
                this.openTask(nextTask);
            } else {
                this.closeTaskDialog();
            }
        } catch (error) {
            if (isAjaxError(error)) {
                this.taskActionError = extractMessage(
                    error,
                    this.intl.t('workflow.console.tasks.submitFailed') as string,
                );
            } else {
                const err = error as Error;
                this.taskActionError = (err && err.message) || String(error);
            }
        } finally {
            this.isSubmittingTaskAction = false;
        }
    }

    @action
    async refreshTemplates(): Promise<void> {
        if (!this.apiBaseUrl) {
            return;
        }
        this.isRefreshing = true;
        this.templatesError = null;
        try {
            const response: { data: WorkflowActivationApiResponse[] } = await this.currentUser.authenticatedAJAX({
                url: `${this.apiBaseUrl}activations/`,
                type: 'GET',
            });
            this.templates = normalizeTemplates(response.data);
            if (this.selectedTemplateId && !this.activeTemplates.some(entry => entry.id === this.selectedTemplateId)) {
                this.selectedTemplateId = '';
            }
            this.updateSelectionFromHash();
        } catch (error) {
            if (isAjaxError(error)) {
                this.templatesError = extractMessage(
                    error,
                    this.intl.t('workflow.console.loadError') as string,
                );
            } else {
                throw error;
            }
        } finally {
            this.isRefreshing = false;
        }
    }

    @action
    handleStartFormChange(variables: WorkflowVariable[], isValid: boolean): void {
        this.startFormVariables = variables;
        this.isStartFormValid = isValid;
    }

    @action
    async handleStartFormSubmit(): Promise<void> {
        if (!this.canStartWorkflow || !this.selectedTemplateId || !this.apiBaseUrl) {
            return;
        }

        const payload: Record<string, unknown> = {};

        if (this.startFormVariables.length > 0) {
            payload.variables = this.startFormVariables;
        }

        this.isSubmitting = true;
        this.submitError = null;
        this.submitSuccess = null;

        try {
            await this.currentUser.authenticatedAJAX({
                url: `${this.apiBaseUrl}templates/${encodeURIComponent(this.selectedTemplateId)}/runs/`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
            });
            this.submitSuccess = this.intl.t('workflow.console.startSuccess') as string;
            this.startFormVariables = [];
            await this.refreshTasks();
            const hasAssignedTasks = this.tasksWithActions.some(task => task.canComplete);
            if (hasAssignedTasks) {
                this.activeTab = 'tasks';
            }
        } catch (error) {
            const fallback = this.intl.t('workflow.console.startFailed') as string;
            if (isAjaxError(error)) {
                this.submitError = extractMessage(error, fallback);
            } else {
                throw error;
            }
        } finally {
            this.isSubmitting = false;
        }
    }

    private assigneeLabel(assignee?: string): string {
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
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node.workflow': GuidNodeWorkflowController;
    }
}
