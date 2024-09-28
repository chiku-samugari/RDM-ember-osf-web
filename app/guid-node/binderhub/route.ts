import { action, computed } from '@ember/object';
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import ConfirmationMixin from 'ember-onbeforeunload/mixins/confirmation';

import GuidNodeBinderHub from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel from 'ember-osf-web/models/binderhub-config';
import Node from 'ember-osf-web/models/node';
import { GuidRouteModel } from 'ember-osf-web/resolve-guid/guid-route';
import Analytics from 'ember-osf-web/services/analytics';
import RSVP from 'rsvp';

export default class GuidNodeBinderHubRoute extends Route.extend(ConfirmationMixin, {}) {
    @service analytics!: Analytics;

    model(this: GuidNodeBinderHubRoute, params: object) {
        return RSVP.hash({
            node: this.modelFor('guid-node'),
            binderHubConfig: this.store.findRecord(
                'binderhub-config',
                (this.paramsFor('guid-node') as {guid: string}).guid,
            ),
        });
    }

    @action
    async didTransition() {
        const { taskInstance } = this.controller.model.node as GuidRouteModel<Node>;
        await taskInstance;
        const node = taskInstance.value;

        const controller = this.controller as GuidNodeBinderHub;
        await controller.ensureConfigFolder();

        this.analytics.trackPage(node ? node.public : undefined, 'nodes');
    }

    // This tells ember-onbeforeunload's ConfirmationMixin whether or not to stop transitions
    @computed('controller.isPageDirty')
    get isPageDirty() {
        const controller = this.controller as GuidNodeBinderHub;
        return () => controller.isPageDirty;
    }

    setupController(controller: GuidNodeBinderHub, model: {node: Node, config: BinderHubConfigModel}) {
        super.setupController(controller, model);
        controller.setup();
    }
}
