import { action } from '@ember/object';
import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';

import { TaskInstance } from 'ember-concurrency';
import requireAuth from 'ember-osf-web/decorators/require-auth';
import DraftRegistration from 'ember-osf-web/models/draft-registration';
import MetadataNodeEradModel from 'ember-osf-web/models/metadata-node-erad';
import MetadataNodeProjectModel from 'ember-osf-web/models/metadata-node-project';
import NodeModel from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import DraftRegistrationManager from 'registries/drafts/draft/draft-registration-manager';
import NavigationManager from 'registries/drafts/draft/navigation-manager';

export interface DraftRouteModel {
    draftRegistrationManager: DraftRegistrationManager;
    navigationManager: NavigationManager;
}

@requireAuth()
export default class DraftRegistrationRoute extends Route {
    @service analytics!: Analytics;
    @service store!: DS.Store;
    @service router!: RouterService;

    @task
    loadDraftRegistrationAndNode = task(function *(this: DraftRegistrationRoute, draftId: string) {
        try {
            const draftRegistration: DraftRegistration = yield this.store.findRecord(
                'draft-registration',
                draftId,
                { adapterOptions: { include: 'branched_from' } },
            );
            const draftRegistrationSubjects = yield draftRegistration.loadAll('subjects');
            draftRegistration.set('subjects', draftRegistrationSubjects);
            const node: NodeModel = yield draftRegistration.branchedFrom;
            return { draftRegistration, node };
        } catch (error) {
            this.transitionTo('page-not-found', this.router.currentURL.slice(1));
            return undefined;
        }
    });

    @task
    loadMetadataNode = task(function *(
        this: DraftRegistrationRoute,
        draftRegistrationAndNodeTask: TaskInstance<{draftRegistration: DraftRegistration, node: NodeModel}>,
    ) {
        const { node } = yield draftRegistrationAndNodeTask;
        const metadataNodeErad: MetadataNodeEradModel = yield this.store.findRecord('metadata-node-erad', node.id);
        const metadataNodeProject: MetadataNodeProjectModel = yield this.store.findRecord(
            'metadata-node-project',
            node.id,
        );
        return { metadataNodeErad, metadataNodeProject };
    });

    model(params: { id: string }): DraftRouteModel {
        const { id: draftId } = params;
        const draftRegistrationAndNodeTask = this.loadDraftRegistrationAndNode.perform(draftId);
        const metadataNodeTask = this.loadMetadataNode.perform(draftRegistrationAndNodeTask);
        const draftRegistrationManager = new DraftRegistrationManager(
            draftRegistrationAndNodeTask,
            metadataNodeTask,
        );
        const navigationManager = new NavigationManager(draftRegistrationManager);
        return {
            navigationManager,
            draftRegistrationManager,
        };
    }

    @action
    didTransition() {
        this.analytics.trackPage();
    }
}
