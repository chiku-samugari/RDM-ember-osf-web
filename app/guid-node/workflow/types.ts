/* eslint-disable camelcase */
import Node from 'ember-osf-web/models/node';
import {
    WorkflowTaskField,
    WorkflowTaskFieldOption,
} from './-components/flowable-form/types';

export interface WorkflowActivationApiResponse {
    id: string;
    node_id: string;
    node_title: string;
    template_id: string;
    template: WorkflowTemplateApiResponse;
    is_enabled: boolean;
    activated_by: string;
}

export interface WorkflowTemplateApiResponse {
    id: string;
    label?: string;
    definition_id?: string;
    definition_key?: string;
    definition_name?: string;
    description?: string;
    node_title?: string;
    is_local: boolean;
    is_active: boolean;
    definition_form_schema: {
        fields: WorkflowTaskField[];
        data?: unknown;
    };
}

export interface WorkflowTemplate {
    id: string;
    label?: string;
    shortLabel: string;
    displayLabel: string;
    definitionId?: string;
    definitionKey?: string;
    definitionName?: string;
    description?: string;
    nodeTitle?: string;
    isLocal: boolean;
    isActive: boolean;
    isEnabled: boolean;
    definitionFormSchema: {
        fields: WorkflowTaskField[];
        data?: unknown;
    };
}

export interface WorkflowRouteModel {
    node: Node;
    templates: WorkflowTemplate[];
    apiBaseUrl: string;
    templatesError?: string | null;
}

export interface WorkflowRunSummary {
    id: string;
    label?: string;
    status?: string;
    statusRaw?: string;
    started_at?: string;
    created?: string;
    completed_at?: string;
    business_key?: string;
    engine_process_id?: string;
    node_id: string;
    node_title: string;
    isCancelling?: boolean;
}

export interface WorkflowTaskSummary {
    id: string;
    name?: string;
    assignee?: string;
    owner?: string;
    created?: string;
    completed?: string;
    task_status?: string;
    due?: string;
    business_key?: string;
    process_definition_id?: string;
    process_instance_id: string;
    engine_id: string;
    form_key?: string;
    has_form?: boolean;
    can_complete?: boolean;
    node_id: string;
    node_title: string;
}

export interface WorkflowTaskForm {
    id?: string;
    key?: string;
    name?: string;
    fields?: WorkflowTaskField[];
    data?: unknown;
}

export interface WorkflowVariable {
    name: string;
    value: unknown;
    type: string;
}

export interface WorkflowTaskDetail extends WorkflowTaskSummary {
    description?: string;
    priority?: number;
    category?: string;
    status?: string;
    form?: WorkflowTaskForm | null;
    variables: WorkflowVariable[];
}

export interface TaskDialogSubmission {
    action: string;
    variables: WorkflowVariable[];
    comment?: string;
    assignee?: string;
}

export {
    WorkflowTaskField,
    WorkflowTaskFieldOption,
};
/* eslint-enable camelcase */
