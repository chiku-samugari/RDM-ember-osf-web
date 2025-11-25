import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';

import config from 'ember-get-config';
import { layout } from 'ember-osf-web/decorators/component';
import DraftRegistration from 'ember-osf-web/models/draft-registration';
import MetadataNodeSchemaModel from 'ember-osf-web/models/metadata-node-schema';
import Analytics from 'ember-osf-web/services/analytics';
import { METADATA_TITLE_FIELD_PRIORITY } from 'ember-osf-web/utils/metadata-title-field-priority';
import pathJoin from 'ember-osf-web/utils/path-join';

import styles from './styles';
import template from './template';

const { OSF: { url: baseURL } } = config;

@layout(template, styles)
@tagName('')
export default class DraftRegistrationCard extends Component {
    @service analytics!: Analytics;

    // Required arguments
    draftRegistration!: DraftRegistration;

    // Optional arguments
    onDelete?: (draftRegistration?: DraftRegistration) => void;

    // Optional arguments
    metadataSchema?: MetadataNodeSchemaModel;

    // Private properties
    deleteModalOpen = false;

    @computed('draftRegistration')
    get exportCsvUrl() {
        const draftRegistration = this.get('draftRegistration');
        const node = draftRegistration.get('branchedFrom');
        return pathJoin(
            baseURL,
            node.get('id'),
            `metadata/draft_registrations/${draftRegistration.get('id')}/csv`,
        );
    }

    @computed('node')
    get registrationSchemaId(): string | null {
        const draftRegistration = this.get('draftRegistration');
        return draftRegistration.registrationSchema.get('id');
    }

    @computed('draftRegistration.{registrationResponses,title}')
    get displayTitle(): string {
        const draftRegistration = this.get('draftRegistration');
        if (!draftRegistration) {
            return '';
        }
        const responses = draftRegistration.registrationResponses;
        if (responses) {
            for (const field of METADATA_TITLE_FIELD_PRIORITY) {
                // __responseKey_ プレフィックス付きと無し両方を試す
                const responseKeyField = `__responseKey_${field}`;
                const value = responses[responseKeyField] || responses[field];
                if (typeof value === 'string' && value.trim()) {
                    return value.trim();
                }
            }
        }
        // フォールバック: title属性を使用
        return draftRegistration.title || '';
    }

    @computed('draftRegistration.registrationResponses')
    get wekoItemId(): string | null {
        const draftRegistration = this.draftRegistration;
        if (!draftRegistration) {
            return null;
        }
        const { registrationResponses: responses } = draftRegistration;
        if (!responses || typeof responses !== 'object') {
            return null;
        }
        const wekoIdKey = 'internal:weko-item-id';
        const prefixedWekoIdKey = `__responseKey_${wekoIdKey}`;
        const wekoIdValue = responses[wekoIdKey] || responses[prefixedWekoIdKey];

        if (wekoIdValue && typeof wekoIdValue === 'string' && wekoIdValue.trim()) {
            return wekoIdValue.trim();
        }

        return null;
    }

    @action
    delete() {
        this.set('deleteModalOpen', true);
    }

    @action
    cancelDelete() {
        this.set('deleteModalOpen', false);
    }

    @action
    async confirmDelete() {
        this.set('deleteModalOpen', false);
        await this.draftRegistration.destroyRecord();
        if (this.onDelete) {
            this.onDelete(this.draftRegistration);
        }
    }
}
