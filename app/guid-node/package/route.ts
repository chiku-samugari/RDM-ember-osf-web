import { action } from '@ember/object';
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import ConfirmationMixin from 'ember-onbeforeunload/mixins/confirmation';

import GuidNodePackage from 'ember-osf-web/guid-node/package/controller';
import Node from 'ember-osf-web/models/node';
import { GuidRouteModel } from 'ember-osf-web/resolve-guid/guid-route';
import Analytics from 'ember-osf-web/services/analytics';

export default class GuidNodePackageRoute extends Route.extend(ConfirmationMixin, {}) {
    @service analytics!: Analytics;

    model(this: GuidNodePackageRoute) {
        return this.modelFor('guid-node');
    }

    @action
    async didTransition() {
        const { taskInstance } = this.controller.model as GuidRouteModel<Node>;
        await taskInstance;
        const node = taskInstance.value;

        this.analytics.trackPage(node ? node.public : undefined, 'nodes');
    }

    setupController(controller: GuidNodePackage, model: GuidRouteModel<Node>): void {
        super.setupController(controller, model);
        controller.get('getRelatedAttrs').perform();
    }
}
