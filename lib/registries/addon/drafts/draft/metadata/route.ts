import { action } from '@ember/object';
import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';

import Analytics from 'ember-osf-web/services/analytics';

import { DraftRoute } from 'registries/drafts/draft/navigation-manager';
import { DraftRouteModel } from '../route';

export default class DraftRegistrationMetadataRoute extends Route {
    @service analytics!: Analytics;
    @service store!: DS.Store;
    @service router!: RouterService;

    @task
    moveToFirstPage = task(function *(this: DraftRegistrationMetadataRoute) {
        const draftRouteModel = this.modelFor('drafts.draft') as DraftRouteModel;
        const { draftRegistrationManager } = draftRouteModel;
        yield draftRegistrationManager.initializePageManagersTask;
        const { pageManagers } = draftRegistrationManager;
        this.replaceWith(
            'drafts.draft.page',
            draftRegistrationManager.draftId,
            `1-${pageManagers[0].pageHeadingText}`,
        );
    });

    model(): DraftRouteModel {
        const draftRouteModel = this.modelFor('drafts.draft') as DraftRouteModel;
        const { navigationManager } = draftRouteModel;

        navigationManager.setPageAndRoute(DraftRoute.Metadata);
        return draftRouteModel;
    }

    @action
    activate() {
        this.moveToFirstPage.perform();
    }

    @action
    didTransition() {
        this.analytics.trackPage();
    }
}
