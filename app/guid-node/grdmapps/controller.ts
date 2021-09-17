import Intl from 'ember-intl/services/intl';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import DS from 'ember-data';

import GrdmappsConfigModel from 'ember-osf-web/models/grdmapps-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

export default class GuidNodeGrdmapps extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service intl!: Intl;
	
    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<GrdmappsConfigModel>;

    @computed('config.isFulfilled')
    get loading(): boolean {
        return !this.config || !this.config.get('isFulfilled');
    }

    @action
    save(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as GrdmappsConfigModel;

        config.save()
            .then(() => {
                this.set('isPageDirty', false);
            })
            .catch(() => {
                this.saveError(config);
            });
    }

    saveError(config: GrdmappsConfigModel) {
        config.rollbackAttributes();
        const message = this.intl.t('integromat.failed_to_save');
        this.toast.error(message);
    }

    @computed('node')
    get config(): DS.PromiseObject<GrdmappsConfigModel> | undefined {
        if (this.configCache) {
            return this.configCache;
        }
        if (!this.node) {
            return undefined;
        }
        this.configCache = this.store.findRecord('grdmapps-config', this.node.id);
        return this.configCache!;
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/grdmapps': GuidNodeGrdmapps;
    }
}