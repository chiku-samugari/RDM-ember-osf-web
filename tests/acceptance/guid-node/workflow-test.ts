import { click, currentRouteName, fillIn } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { module, test } from 'qunit';
import sinon from 'sinon';

import {
    WorkflowActivationApiResponse, WorkflowTaskDetail, WorkflowTaskSummary,
} from 'ember-osf-web/guid-node/workflow/types';
import { Permission } from 'ember-osf-web/models/osf-model';
import CurrentUser from 'ember-osf-web/services/current-user';
import { currentURL, setupOSFApplicationTest, visit } from 'ember-osf-web/tests/helpers';

interface WorkflowStubConfig {
    activations?: WorkflowActivationApiResponse[];
    runs?: any[];
    tasks?: WorkflowTaskSummary[];
    taskDetail?: WorkflowTaskDetail;
    activationsError?: unknown;
    runsError?: unknown;
    tasksError?: unknown;
    taskSubmitError?: unknown;
    postSubmitTasks?: WorkflowTaskSummary[];
}

function stubWorkflowRequests(
    sandbox: sinon.SinonSandbox,
    currentUser: CurrentUser,
    config: WorkflowStubConfig,
) {
    const originalMethod = currentUser.authenticatedAJAX.bind(currentUser);
    return sandbox.stub(currentUser, 'authenticatedAJAX').callsFake((options: JQuery.AjaxSettings) => {
        const url = String(options.url || '');
        const method = (options.type || 'GET').toString().toUpperCase();

        if (url.includes('/workflow/activations/')) {
            if (config.activationsError) {
                return Promise.reject(config.activationsError);
            }
            return Promise.resolve({ data: config.activations || [] });
        }

        if (url.includes('/workflow/runs/')) {
            if (config.runsError) {
                return Promise.reject(config.runsError);
            }
            return Promise.resolve({ data: config.runs || [] });
        }

        if (url.includes('/workflow/tasks/') && !url.includes('/workflow/engines/')) {
            if (config.tasksError) {
                return Promise.reject(config.tasksError);
            }
            return Promise.resolve({ data: config.tasks || [] });
        }

        if (url.includes('/workflow/templates/') && method === 'POST') {
            return Promise.resolve({
                data: {
                    job_id: 'test-job-start',
                    status: 'pending',
                    status_url: '/api/v1/project/test/workflow/jobs/test-job-start/',
                },
            });
        }

        if (url.includes('/workflow/engines/') && url.includes('/tasks/') && method === 'GET') {
            if (!config.taskDetail) {
                throw new Error('Task detail requested but not provided');
            }
            return Promise.resolve({ data: config.taskDetail });
        }

        if (url.includes('/workflow/engines/') && url.includes('/actions') && method === 'POST') {
            if (config.taskSubmitError) {
                return Promise.reject(config.taskSubmitError);
            }
            if (config.postSubmitTasks) {
                config.tasks = config.postSubmitTasks; // eslint-disable-line no-param-reassign
            }
            return Promise.resolve({
                data: {
                    job_id: 'test-job-1',
                    status: 'pending',
                    status_url: '/api/v1/project/test/workflow/jobs/test-job-1/',
                },
            });
        }

        if (url.includes('/workflow/jobs/') && method === 'GET') {
            return Promise.resolve({ data: { status: 'completed' } });
        }

        // Pass through to original method (Mirage) for unhandled requests
        return originalMethod(options);
    });
}

module('Acceptance | guid-node/workflow', hooks => {
    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('start tab allows template selection and workflow start', async function(assert) {
        const sandbox = sinon.createSandbox();
        const guid = 'wflow';
        server.create('user', 'loggedIn');
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        const currentUser = this.owner.lookup('service:current-user') as CurrentUser;
        const activations: WorkflowActivationApiResponse[] = [
            {
                id: 'activation-1',
                node_id: guid,
                node_title: node.title,
                template_id: 'template-1',
                is_enabled: true,
                activated_by: 'system',
                template: {
                    id: 'template-1',
                    label: 'Example Template',
                    definition_id: 'def-1',
                    definition_key: 'example',
                    definition_name: 'Example Template',
                    description: 'Demonstration template',
                    node_title: node.title,
                    is_local: true,
                    is_active: true,
                    definition_form_schema: {
                        fields: [],
                    },
                },
            },
        ];
        stubWorkflowRequests(sandbox, currentUser, {
            activations,
            runs: [],
            tasks: [],
        });

        const url = `/${guid}/workflow`;
        await visit(url);

        assert.strictEqual(currentURL(), url, 'navigated to workflow route');
        assert.strictEqual(currentRouteName(), 'guid-node.workflow', 'workflow route active');

        assert.dom('[data-test-workflow-template-select]').exists('template select rendered');
        assert.dom('[data-test-workflow-start-button]').isDisabled('start disabled without selection');

        await fillIn('[data-test-workflow-template-select]', 'template-1');

        assert.dom('[data-test-workflow-start-button]').isNotDisabled('start enabled after selection');

        await click('[data-test-workflow-start-button]');

        assert.dom('[data-test-workflow-submit-success]').exists('success message shown after submitting');

        sandbox.restore();
    });

    test('start tab shows permission warning when user lacks write access', async function(assert) {
        const sandbox = sinon.createSandbox();
        const guid = 'wflow-readonly';
        server.create('user', 'loggedIn');
        server.create('node', {
            id: guid,
            currentUserPermissions: [],
        });
        const currentUser = this.owner.lookup('service:current-user') as CurrentUser;
        const activations: WorkflowActivationApiResponse[] = [
            {
                id: 'activation-1',
                node_id: guid,
                node_title: 'Read only project',
                template_id: 'template-1',
                is_enabled: true,
                activated_by: 'system',
                template: {
                    id: 'template-1',
                    label: 'Example Template',
                    definition_id: 'def-1',
                    definition_key: 'example',
                    definition_name: 'Example Template',
                    description: 'Demonstration template',
                    node_title: 'Read only project',
                    is_local: true,
                    is_active: true,
                    definition_form_schema: {
                        fields: [],
                    },
                },
            },
        ];
        stubWorkflowRequests(sandbox, currentUser, {
            activations,
            runs: [],
            tasks: [],
        });

        const url = `/${guid}/workflow`;
        await visit(url);

        assert.strictEqual(currentRouteName(), 'guid-node.workflow', 'workflow route active');
        assert.dom('[data-test-workflow-start-permission]').exists('permission warning shown');
        assert.dom('[data-test-workflow-template-select]').doesNotExist('form not rendered');
        assert.dom('[data-test-workflow-start-button]').doesNotExist('start button absent');

        sandbox.restore();
    });

    test('runs and tasks tabs display workflow data', async function(assert) {
        const sandbox = sinon.createSandbox();
        const guid = 'wflow2';
        server.create('user', 'loggedIn');
        const node = server.create('node', {
            id: guid,
            title: 'Workflow Node',
            currentUserPermissions: [Permission.Admin],
        });
        const currentUser = this.owner.lookup('service:current-user') as CurrentUser;
        const activations: WorkflowActivationApiResponse[] = [
            {
                id: 'activation-1',
                node_id: guid,
                node_title: node.title,
                template_id: 'template-1',
                is_enabled: true,
                activated_by: 'system',
                template: {
                    id: 'template-1',
                    label: 'Example Template',
                    definition_id: 'def-1',
                    definition_key: 'example',
                    definition_name: 'Example Template',
                    description: 'Demonstration template',
                    node_title: node.title,
                    is_local: true,
                    is_active: true,
                    definition_form_schema: {
                        fields: [],
                    },
                },
            },
        ];
        const runs = [
            {
                id: 'run-1',
                node_id: guid,
                node_title: node.title,
                engine_process_id: 'PROC-1',
                status: 'RUNNING',
                started_at: '2024-01-01T00:00:00Z',
                completed_at: null,
            },
        ];
        const tasks: WorkflowTaskSummary[] = [
            {
                id: 'task-1',
                name: 'Review data',
                process_instance_id: 'proc-1',
                engine_id: 'engine-1',
                node_id: guid,
                node_title: node.title,
                task_status: 'running',
                assignee: 'manager',
                can_complete: true,
                business_key: 'BK-1',
                created: '2024-01-02T00:00:00Z',
                due: '2024-01-10T00:00:00Z',
                process_definition_id: 'definition-1',
                form_key: 'form-1',
                has_form: true,
            },
        ];
        const taskDetail: WorkflowTaskDetail = {
            ...tasks[0],
            description: 'Ensure everything looks good',
            form: {
                fields: [],
            },
            variables: [],
        };

        stubWorkflowRequests(sandbox, currentUser, {
            activations,
            runs,
            tasks,
            taskDetail,
        });

        const url = `/${guid}/workflow`;
        await visit(url);

        await click('[data-test-workflow-tab-runs] a');
        assert.dom('[data-test-workflow-runs-table]').exists('runs table rendered');
        assert.dom('[data-test-workflow-run-row]').exists({ count: 1 }, 'running row visible');
        assert.dom('[data-test-workflow-run-cancel]').exists('cancel button shown for running run');

        await click('[data-test-workflow-tab-tasks] a');
        assert.dom('[data-test-workflow-tasks-table]').exists('tasks table rendered');
        assert.dom('[data-test-workflow-task-row]').exists({ count: 1 }, 'task row rendered');

        await click('[data-test-workflow-task-open]');
        assert.dom('.workflow-task-dialog').exists('task dialog opens');

        sandbox.restore();
    });

    test('task dialog submission refreshes tasks and shows success alert', async function(assert) {
        const sandbox = sinon.createSandbox();
        const guid = 'wflow-task-submit';
        server.create('user', 'loggedIn');
        const node = server.create('node', {
            id: guid,
            title: 'Workflow Node',
            currentUserPermissions: [Permission.Admin],
        });
        const currentUser = this.owner.lookup('service:current-user') as CurrentUser;
        const activations: WorkflowActivationApiResponse[] = [
            {
                id: 'activation-1',
                node_id: guid,
                node_title: node.title,
                template_id: 'template-1',
                is_enabled: true,
                activated_by: 'system',
                template: {
                    id: 'template-1',
                    label: 'Example Template',
                    definition_id: 'def-1',
                    definition_key: 'example',
                    definition_name: 'Example Template',
                    description: 'Demonstration template',
                    node_title: node.title,
                    is_local: true,
                    is_active: true,
                    definition_form_schema: {
                        fields: [],
                    },
                },
            },
        ];
        const tasks: WorkflowTaskSummary[] = [
            {
                id: 'task-1',
                name: 'Fill form',
                process_instance_id: 'proc-1',
                engine_id: 'engine-1',
                node_id: guid,
                node_title: node.title,
                task_status: 'running',
                assignee: 'creator',
                can_complete: true,
            },
        ] as WorkflowTaskSummary[];
        const refreshedTasks: WorkflowTaskSummary[] = [];
        const taskDetail: WorkflowTaskDetail = {
            ...tasks[0],
            description: 'Demo detail',
            form: {
                fields: [],
            },
            variables: [],
        };
        stubWorkflowRequests(sandbox, currentUser, {
            activations,
            runs: [],
            tasks,
            taskDetail,
            postSubmitTasks: refreshedTasks,
        });

        const url = `/${guid}/workflow`;
        await visit(url);

        await click('[data-test-workflow-tab-tasks] a');
        assert.dom('[data-test-workflow-task-row]').exists({ count: 1 }, 'initial task renders');

        await click('[data-test-workflow-task-open]');
        assert.dom('.workflow-task-dialog').exists('dialog opened before submit');
        await click('[data-test-task-dialog-submit]');

        assert.dom('[data-test-workflow-task-success]').exists('success message after submission');
        assert.dom('[data-test-workflow-task-row]').doesNotExist('task list refreshed with no tasks');

        sandbox.restore();
    });

    test('error alerts appear when workflow API calls fail', async function(assert) {
        const sandbox = sinon.createSandbox();
        const guid = 'wflow-errors';
        server.create('user', 'loggedIn');
        server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        const currentUser = this.owner.lookup('service:current-user') as CurrentUser;

        const makeError = (message: string) => ({
            responseJSON: { message },
        });

        stubWorkflowRequests(sandbox, currentUser, {
            activationsError: makeError('Templates failed'),
            runsError: makeError('Runs failed'),
            tasksError: makeError('Tasks failed'),
        });

        const url = `/${guid}/workflow`;
        await visit(url);

        assert.dom('[data-test-workflow-templates-error]').includesText('Templates failed', 'template error visible');

        await click('[data-test-workflow-tab-runs] a');
        assert.dom('[data-test-workflow-runs-error]').includesText('Runs failed', 'runs error surfaced');

        await click('[data-test-workflow-tab-tasks] a');
        assert.dom('[data-test-workflow-tasks-error]').includesText('Tasks failed', 'tasks error surfaced');

        sandbox.restore();
    });
});
