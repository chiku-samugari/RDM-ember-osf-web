import { action, computed } from '@ember-decorators/object';
import { service } from '@ember-decorators/service';
import Route from '@ember/routing/route';
import ConfirmationMixin from 'ember-onbeforeunload/mixins/confirmation';

import Node from 'ember-osf-web/models/node';
import { GuidRouteModel } from 'ember-osf-web/resolve-guid/guid-route';
import Analytics from 'ember-osf-web/services/analytics';

import GuidNodeIntegromat from './controller';

export default class GuidNodeIntegromatRoute extends Route.extend(ConfirmationMixin, {}) {
    @service analytics!: Analytics;

    model(this: GuidNodeIntegromatRoute) {
        return this.modelFor('guid-node');
    }

    @action
    async didTransition() {
        const { taskInstance } = this.controller.model as GuidRouteModel<Node>;
        await taskInstance;
        const node = taskInstance.value;

        this.analytics.trackPage(node ? node.public : undefined, 'nodes');
    }

    // This tells ember-onbeforeunload's ConfirmationMixin whether or not to stop transitions
    @computed('controller.isPageDirty')
    get isPageDirty() {
        const controller = this.controller as GuidNodeIntegromat;
        return () => controller.isPageDirty;
    }
}
