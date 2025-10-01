import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import config from 'ember-get-config';

import GuidNodeWorkflowController, {
    normalizeTemplates,
    WorkflowTemplate,
} from 'ember-osf-web/guid-node/workflow/controller';
import { WorkflowActivationApiResponse } from 'ember-osf-web/guid-node/workflow/types';
import Node from 'ember-osf-web/models/node';
import { GuidRouteModel } from 'ember-osf-web/resolve-guid/guid-route';
import CurrentUser from 'ember-osf-web/services/current-user';

function buildProjectWorkflowBase(guid: string): string {
    const { OSF } = config;
    const host = OSF.url.replace(/\/$/, '');
    const namespace = OSF.webApiNamespace.replace(/^\//, '').replace(/\/$/, '');
    const base = namespace ? `${host}/${namespace}` : host;
    return `${base}/project/${guid}/workflow/`;
}

function extractErrorMessage(error: unknown): string {
    const err = error as any;
    const response: any = (err && err.responseJSON) || (err && err.payload && err.payload.responseJSON);
    if (response && response.message) {
        return response.message as string;
    }
    if (response && response.data && response.data.message) {
        return response.data.message as string;
    }
    const text = (err && err.responseText) || (err && err.payload && err.payload.responseText);
    if (typeof text === 'string' && text.trim()) {
        return text;
    }
    const message = err && err.message;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    return 'Failed to load workflow data.';
}

interface RouteModel {
    node: Node;
    templates: WorkflowTemplate[];
    apiBaseUrl: string;
    templatesError?: string | null;
}

export default class GuidNodeWorkflowRoute extends Route {
    @service currentUser!: CurrentUser;

    activate(): void {
        if (typeof window === 'undefined') {
            return;
        }
        window.addEventListener('hashchange', this.hashChangeHandler);
    }

    deactivate(): void {
        if (typeof window === 'undefined') {
            return;
        }
        window.removeEventListener('hashchange', this.hashChangeHandler);
    }

    async model(): Promise<RouteModel> {
        const nodeModel = this.modelFor('guid-node') as GuidRouteModel<Node>;
        const { taskInstance } = nodeModel;
        const node = await taskInstance;
        const guid = node.id;
        const apiBaseUrl = buildProjectWorkflowBase(guid);

        let templates: WorkflowTemplate[] = [];
        let templatesError: string | null = null;

        try {
            const response: { data: WorkflowActivationApiResponse[] } = await this.currentUser.authenticatedAJAX({
                url: `${apiBaseUrl}activations/`,
                type: 'GET',
            });
            templates = normalizeTemplates(response.data);
        } catch (error) {
            templatesError = extractErrorMessage(error);
        }

        return {
            node,
            templates,
            apiBaseUrl,
            templatesError,
        };
    }

    setupController(controller: Controller, model: RouteModel): void {
        super.setupController(controller, model);
        const workflowController = controller as GuidNodeWorkflowController;
        workflowController.initialize(
            {
                node: model.node,
                templates: model.templates,
                apiBaseUrl: model.apiBaseUrl,
                templatesError: model.templatesError,
            },
            typeof window !== 'undefined' ? window.location.hash : '',
        );
    }

    private hashChangeHandler = () => {
        if (typeof window === 'undefined') {
            return;
        }
        const controller = this.controllerFor('guid-node.workflow') as GuidNodeWorkflowController;
        controller.updateSelectionFromHash(window.location.hash);
    }
}
