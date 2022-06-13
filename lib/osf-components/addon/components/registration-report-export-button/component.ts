import Component from '@ember/component';
import { action, computed } from '@ember/object';
import $ from 'jquery';

import { layout } from 'ember-osf-web/decorators/component';
import MetadataNodeSchemaModel, { Format } from 'ember-osf-web/models/metadata-node-schema';

import styles from './styles';
import template from './template';

@layout(template, styles)
export default class RegistrationReportExportButton extends Component {
    exportCsvUrl?: string;

    metadataSchema?: MetadataNodeSchemaModel;

    registrationSchemaId?: string | null = null;

    dialogOpen: boolean = false;

    @computed('metadataSchema')
    get metadataFormats(): Format[] {
        if (!this.metadataSchema) {
            return [];
        }
        return this.metadataSchema.formats
            .filter(format => format.schema_id === this.registrationSchemaId);
    }

    @computed('metadataFormats')
    get hasNoFormats(): boolean {
        return this.metadataFormats.length === 0;
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
        const name = $('#registration-report-format-selection').val();
        window.open(`${this.exportCsvUrl}?name=${name}`);
        this.set('dialogOpen', false);
    }

    @action
    hideDialog() {
        this.set('dialogOpen', false);
    }
}
