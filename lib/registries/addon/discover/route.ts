import { action } from '@ember/object';
import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';

import Analytics from 'ember-osf-web/services/analytics';

export default class RegistriesDiscoverRoute extends Route {
    @service analytics!: Analytics;
    @service router!: RouterService;

    @action
    didTransition() {
        this.analytics.trackPage();
        // registries page is disabled for metadata addon
        this.router.transitionTo('/');
    }
}
