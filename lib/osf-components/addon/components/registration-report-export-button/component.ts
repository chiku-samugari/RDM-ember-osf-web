import Component from '@ember/component';
import { action, computed } from '@ember/object';
import RouterService from '@ember/routing/router-service';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import Intl from 'ember-intl/services/intl';
import { layout } from 'ember-osf-web/decorators/component';
import { extractProjectMetadata } from 'ember-osf-web/guid-node/workflow/-components/flowable-form/utils';
import { normalizeTemplates, WorkflowTemplate } from 'ember-osf-web/guid-node/workflow/controller';
import { WorkflowActivationApiResponse } from 'ember-osf-web/guid-node/workflow/types';
import MetadataNodeSchemaModel, { Destination, Format, MetadataType } from 'ember-osf-web/models/metadata-node-schema';
import Node from 'ember-osf-web/models/node';
import CurrentUser from 'ember-osf-web/services/current-user';
import Toast from 'ember-toastr/services/toast';
import $ from 'jquery';

import styles from './styles';
import template from './template';

/* eslint-disable camelcase */
interface UploadingProgress {
    id: string;
    type: string;
    attributes: {
        metadata_type: string;
        metadata_id: string;
        progress?: {
            state: string;
            rate: number;
        };
        error?: string | null;
        progress_url?: string;
        result?: string | null;
    };
}
/* eslint-enable camelcase */

@layout(template, styles)
export default class RegistrationReportExportButton extends Component {
    @service currentUser!: CurrentUser;

    @service toast!: Toast;

    @service router!: RouterService;

    @service intl!: Intl;

    buttonClass?: string;

    vertical?: boolean;

    exportCsvUrl?: string;

    metadataSchema?: MetadataNodeSchemaModel;

    metadataSchemaLoading: boolean = false;

    registrationSchemaId?: string | null = null;

    dialogOpen: boolean = false;

    metadataType: MetadataType | null = null;

    metadataId: string | null = null;

    isUploading: boolean = false;

    node?: Node;

    schemaName?: string;

    workflowTemplates: WorkflowTemplate[] = [];

    workflowDialogOpen: boolean = false;

    @task
    loadWorkflows = task(function *(this: RegistrationReportExportButton) {
        const response: Response = yield fetch(`/api/v1/project/${this.node!.get('id')}/workflow/activations/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch workflows: ${response.statusText}`);
        }
        const json: { data: WorkflowActivationApiResponse[] } = yield response.json();
        const allTemplates = normalizeTemplates(json.data);
        const filtered = allTemplates.filter(tpl => tpl.definitionFormSchema.fields.some(field => {
            const metadata = extractProjectMetadata(field);
            return metadata !== null && metadata.schemaName === this.schemaName;
        }));
        this.set('workflowTemplates', filtered);
    });

    @computed('metadataSchema')
    get metadataFormats(): Format[] {
        if (!this.metadataSchema) {
            return [];
        }
        return this.metadataSchema.formats
            .filter(format => this.metadataType === null || format.acceptable === null
                || format.acceptable === undefined || format.acceptable.includes(this.metadataType))
            .filter(format => format.schema_id === this.registrationSchemaId);
    }

    @computed('metadataSchema')
    get metadataDestinations(): Destination[] {
        if (!this.metadataSchema) {
            return [];
        }
        if (this.metadataSchema.destinations === undefined) {
            return [];
        }
        return this.metadataSchema.destinations
            .filter(destination => this.metadataType === null || destination.acceptable === null
                || destination.acceptable === undefined || destination.acceptable.includes(this.metadataType))
            .filter(destination => destination.schema_id === this.registrationSchemaId);
    }

    @computed('metadataFormats')
    get hasNoFormats(): boolean {
        return this.metadataFormats.length === 0;
    }

    @computed('metadataDestinations')
    get hasNoDestinations(): boolean {
        return this.metadataDestinations.length === 0;
    }

    @computed('metadataSchemaLoading', 'hasNoFormats', 'hasNoDestinations')
    get isDisabled(): boolean {
        return this.metadataSchemaLoading || (this.hasNoFormats && this.hasNoDestinations);
    }

    didReceiveAttrs() {
        super.didReceiveAttrs();
        if (this.node && this.schemaName) {
            this.loadWorkflows.perform();
        }
    }

    @action
    openWorkflowDialog() {
        this.set('workflowDialogOpen', true);
    }

    @action
    export() {
        if (!this.metadataSchema || !this.exportCsvUrl) {
            return;
        }
        const formats = this.metadataFormats;
        if (formats.length === 0) {
            return;
        }
        if (formats.length === 1) {
            window.open(this.exportCsvUrl);
            return;
        }
        this.set('dialogOpen', true);
    }

    @action
    submit() {
        const exportId = $('#registration-report-format-selection').val();
        const targetFormat = this.metadataFormats.find(format => format.id === exportId);
        const targetDestination = this.metadataDestinations.find(destination => destination.id === exportId);
        if (targetFormat) {
            const { name } = targetFormat;
            window.open(`${this.exportCsvUrl}?name=${name}`);
            this.set('dialogOpen', false);
            return;
        }
        if (!targetDestination) {
            throw new Error('Invalid destination');
        }
        if (!targetDestination.url || !this.metadataId) {
            throw new Error('Invalid destination');
        }
        this.upload(targetDestination.url, this.metadataId)
            .catch(error => {
                this.set('dialogOpen', false);
                this.toast.error(`Upload failed: ${error.toString()}`);
            });
    }

    @action
    hideDialog() {
        this.set('dialogOpen', false);
    }

    @action
    submitWorkflow() {
        const workflowId = $('#workflow-selection').val() as string;
        this.startWorkflow(workflowId);
    }

    async upload(url: string, metadataId: string) {
        this.set('isUploading', true);
        try {
            const resp = await this.currentUser.authenticatedAJAX({
                url: `${url}/${metadataId}`,
                type: 'PUT',
                xhrFields: {
                    withCredentials: true,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const progress = resp.data as UploadingProgress;
            const { progress_url: progressApiUrl } = progress.attributes;
            if (!progressApiUrl) {
                if (progress.attributes.result) {
                    this.set('isUploading', false);
                    window.open(progress.attributes.result, '_blank');
                    this.set('dialogOpen', false);
                    return;
                }
                throw new Error('Invalid progress URL');
            }
            later(async () => {
                await this.checkProgress(progressApiUrl);
            }, 500);
        } catch (e) {
            this.set('isUploading', false);
            throw e;
        }
    }

    async checkProgress(progressApiUrl: string) {
        const resp = await this.currentUser.authenticatedAJAX({
            url: progressApiUrl,
            type: 'GET',
            xhrFields: { withCredentials: true },
        });
        const progress = resp.data as UploadingProgress;
        if (progress.attributes.result) {
            this.set('isUploading', false);
            window.open(progress.attributes.result, '_blank');
            this.set('dialogOpen', false);
            return;
        }
        if (progress.attributes.error) {
            this.set('isUploading', false);
            const { error } = resp;
            this.toast.error(error.toString());
            this.set('dialogOpen', false);
            return;
        }
        later(async () => {
            await this.checkProgress(progressApiUrl);
        }, 500);
    }

    startWorkflow(workflowId: string) {
        this.set('workflowDialogOpen', false);
        const workflow = this.workflowTemplates.find(w => w.id === workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const targetField = workflow.definitionFormSchema.fields.find(field => {
            const metadata = extractProjectMetadata(field);
            return metadata !== null && metadata.schemaName === this.schemaName;
        });

        if (!targetField) {
            throw new Error(`No matching field found for schema ${this.schemaName}`);
        }

        const fieldKey = `field_${encodeURIComponent(targetField.id)}`;
        const hash = `#start=${encodeURIComponent(workflowId)}&${fieldKey}=${encodeURIComponent(this.metadataId!)}`;
        const url = this.router.urlFor('guid-node.workflow', this.node!.get('id'));
        window.location.href = `${url}${hash}`;
    }
}
