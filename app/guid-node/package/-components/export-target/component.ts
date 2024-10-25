import Component from '@ember/component';
import EmberError from '@ember/error';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import FileProviderModel from 'ember-osf-web/models/file-provider';
import Node from 'ember-osf-web/models/node';
import Toast from 'ember-toastr/services/toast';

export default class ExportTarget extends Component {
    @service toast!: Toast;
    node?: Node;
    destinationProvider = '';
    providers?: FileProviderModel[];

    didReceiveAttrs() {
        if (!this.node) {
            return;
        }
        if (this.providers) {
            // Already loaded
            return;
        }
        later(async () => {
            const providers = await this.performLoadProviders();
            this.set('providers', providers);
            if (!providers) {
                // No providers
                return;
            }
            if (this.destinationProvider) {
                // Already selected
                return;
            }
            this.set('destinationProvider', providers[0].name);
        }, 0);
    }

    async performLoadProviders(): Promise<FileProviderModel[]> {
        if (!this.node) {
            throw new EmberError('Illegal state');
        }
        try {
            const providers = await this.node.loadAll('files');
            return providers.toArray();
        } catch (e) {
            this.toast.error(e.toString());
            return [];
        }
    }

    @action
    destinationChanged(value: string) {
        this.set('destinationProvider', value);
    }
}
