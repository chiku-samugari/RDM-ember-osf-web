import Component from '@ember/component';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import $ from 'jquery';

import { layout } from 'ember-osf-web/decorators/component';
import MetadataNodeSchemaModel, { Destination, Format, MetadataType } from 'ember-osf-web/models/metadata-node-schema';
import CurrentUser from 'ember-osf-web/services/current-user';
import Toast from 'ember-toastr/services/toast';

import styles from './styles';
import template from './template';

/* eslint-disable camelcase */
interface SwordV3Response {
    '@context': string;
    '@id': string;
    '@type': string;
    state: Array<{ '@id': string; description: string }>;
    actions?: Record<string, boolean>;
    links?: Array<{ '@id': string; contentType: string; rel: string[] }>;
}

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
        response?: SwordV3Response;
    };
}
/* eslint-enable camelcase */

@layout(template, styles)
export default class RegistrationReportExportButton extends Component {
    @service currentUser!: CurrentUser;

    @service toast!: Toast;

    buttonClass?: string;

    exportCsvUrl?: string;

    metadataSchema?: MetadataNodeSchemaModel;

    metadataSchemaLoading: boolean = false;

    registrationSchemaId?: string | null = null;

    dialogOpen: boolean = false;

    metadataType: MetadataType | null = null;

    metadataId: string | null = null;

    isUploading: boolean = false;

    resultDialogOpen: boolean = false;

    resultState: 'wekoIngested' | 'wekoInWorkflow' | null = null;

    resultUrl: string | null = null;

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
    hideResultDialog() {
        this.set('resultDialogOpen', false);
        this.set('resultState', null);
        this.set('resultUrl', null);
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
        if (progress.attributes.error) {
            this.set('isUploading', false);
            const { error } = progress.attributes;
            this.toast.error(error.toString());
            this.set('dialogOpen', false);
            return;
        }
        const { response } = progress.attributes;
        if (response && response['@context'] === 'https://swordapp.github.io/swordv3/swordv3.jsonld') {
            this.set('isUploading', false);
            this.set('dialogOpen', false);
            const stateUri = response.state[0]['@id'];
            if (stateUri.endsWith('/ingested')) {
                this.set('resultState', 'wekoIngested');
                this.set('resultUrl', progress.attributes.result);
            } else if (stateUri.endsWith('/inWorkflow')) {
                this.set('resultState', 'wekoInWorkflow');
                this.set('resultUrl', null);
            }
            this.set('resultDialogOpen', true);
            return;
        }
        if (progress.attributes.result) {
            this.set('isUploading', false);
            window.open(progress.attributes.result, '_blank');
            this.set('dialogOpen', false);
            return;
        }
        later(async () => {
            await this.checkProgress(progressApiUrl);
        }, 500);
    }
}
