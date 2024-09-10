import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import DS from 'ember-data';
import { requiredAction } from 'ember-osf-web/decorators/component';
import {
    BootstrapPath,
    isBinderHubConfigFulfilled,
} from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel, {
    Endpoint,
    Launcher,
} from 'ember-osf-web/models/binderhub-config';

export default class LaunchButtons extends Component {
    binderHubConfig: DS.PromiseObject<BinderHubConfigModel> & BinderHubConfigModel = this.binderHubConfig;

    @requiredAction onClick!: (path: BootstrapPath | null) => void;

    @computed('binderHubConfig.launcher')
    get launcher(): Launcher | null {
        if (!isBinderHubConfigFulfilled(this)) {
            return null;
        }
        return this.binderHubConfig.get('launcher');
    }

    @action
    launch(this: LaunchButtons, endpointId: string): void {
        if (!this.onClick) {
            return;
        }
        const endpoint = this.getEndpointById(endpointId);
        if (!endpoint) {
            throw new EmberError(`Unknown endpoint: ${endpointId}`);
        }
        this.onClick(endpoint.path ? {
            path: endpoint.path,
            pathType: 'url',
        } : null);
    }

    getEndpointById(endpointId: string): Endpoint | null {
        if (!this.launcher) {
            return null;
        }
        const endpoints = this.launcher.endpoints
            .filter(endpoint => endpoint.id === endpointId);
        if (endpoints.length === 0) {
            return null;
        }
        return endpoints[0];
    }
}
