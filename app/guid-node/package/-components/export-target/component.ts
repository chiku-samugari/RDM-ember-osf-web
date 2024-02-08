import Component from '@ember/component';
import EmberError from '@ember/error';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import FileProviderModel from 'ember-osf-web/models/file-provider';
import Node from 'ember-osf-web/models/node';

export default class ExportTarget extends Component {
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
        const providers = await this.node.get('files');
        return providers.toArray();
    }

    @action
    destinationChanged(value: string) {
        this.set('destinationProvider', value);
    }
}
