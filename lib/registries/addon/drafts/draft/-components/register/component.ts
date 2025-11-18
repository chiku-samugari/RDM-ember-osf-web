import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';
import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { run } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import DS from 'ember-data';

import config from 'ember-get-config';
import DraftRegistration from 'ember-osf-web/models/draft-registration';
import MetadataNodeSchemaModel from 'ember-osf-web/models/metadata-node-schema';
import NodeModel from 'ember-osf-web/models/node';
import Registration from 'ember-osf-web/models/registration';
import pathJoin from 'ember-osf-web/utils/path-join';
import DraftRegistrationManager from 'registries/drafts/draft/draft-registration-manager';

const { OSF: { url: baseURL } } = config;

@tagName('')
export default class Register extends Component.extend({
    onClickRegister: task(function*(this: Register) {
        if (!this.registration) {
            const registration = this.store.createRecord('registration', {
                draftRegistrationId: this.draftRegistration.id,
                registeredFrom: this.draftRegistration.branchedFrom,
            });

            this.setProperties({ registration });
        }
        if (this.node) {
            yield this.node.loadRelatedCount('children');
        }
        if (this.node && this.node.relatedCounts.children > 0) {
            this.showPartialRegDialog();
        } else {
            this.showFinalizeRegDialog();
        }
    }),
}) {
    @service store!: DS.Store;

    // Required
    draftManager!: DraftRegistrationManager;

    // Optional arguments
    metadataSchema?: MetadataNodeSchemaModel;

    metadataSchemaLoading = false;

    showMobileView = false;

    // Private
    registration!: Registration;
    onSubmitRedirect?: (nodeId: string) => void;
    @alias('draftManager.hasInvalidResponses') isInvalid?: boolean;
    @alias('draftManager.draftRegistration') draftRegistration!: DraftRegistration;
    @alias('draftManager.node') node?: NodeModel;

    partialRegDialogIsOpen = false;
    finalizeRegDialogIsOpen = false;

    didReceiveAttrs() {
        assert('@draftManager is required!', Boolean(this.draftManager));
    }

    @computed('draftRegistration')
    get registrationSchemaId(): string | null {
        const draftRegistration = this.get('draftRegistration');
        return draftRegistration.registrationSchema.get('id');
    }

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

    @computed('draftRegistration.registrationResponses')
    get wekoItemId(): string | null {
        const draftRegistration = this.draftRegistration;
        if (!draftRegistration) {
            return null;
        }
        const responses = draftRegistration.registrationResponses;
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

    @computed('showMobileView')
    get registerButtonClass() {
        let classes = 'registerButton exportButton';
        if (this.showMobileView) {
            classes += ' mobileReviewButtonItem';
        }
        return classes;
    }

    @action
    onSubmitRegistration(nodeId: string) {
        this.closeAllDialogs();

        if (this.onSubmitRedirect) {
            this.onSubmitRedirect(nodeId);
            this.draftRegistration.unloadRecord();
        }
    }

    @action
    showFinalizeRegDialog() {
        this.set('finalizeRegDialogIsOpen', true);
    }

    @action
    showPartialRegDialog() {
        this.set('partialRegDialogIsOpen', true);
    }

    @action
    closeFinalizeRegDialog() {
        this.set('finalizeRegDialogIsOpen', false);
    }

    @action
    closePartialRegDialog() {
        this.set('partialRegDialogIsOpen', false);
    }

    @action
    closeAllDialogs() {
        this.set('partialRegDialogIsOpen', false);
        this.set('finalizeRegDialogIsOpen', false);
    }

    @action
    onContinue(nodes: Node[]) {
        const includedNodeIds = nodes.mapBy('id');
        this.registration.setProperties({ includedNodeIds });

        this.closePartialRegDialog();
        run.next(this, () => {
            this.showFinalizeRegDialog();
        });
    }

    @action
    onBack() {
        this.closeFinalizeRegDialog();
        if (this.node && this.node.relatedCounts.children > 0) {
            run.next(this, () => {
                this.showPartialRegDialog();
            });
        }
    }
}
