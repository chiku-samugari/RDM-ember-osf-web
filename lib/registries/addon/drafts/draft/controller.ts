import Controller from '@ember/controller';
import { action } from '@ember/object';
import { not } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import RouterService from '@ember/routing/router-service';
import Media from 'ember-responsive';

export default class RegistriesDraft extends Controller {
    @service media!: Media;
    @service router!: RouterService;

    @not('media.isDesktop') showMobileView!: boolean;

    @action
    onSubmitRedirect(nodeId: string) {
        this.router.transitionTo('guid-node.metadata', nodeId, {
            queryParams: { tab: 'reports' },
        });
    }
}
