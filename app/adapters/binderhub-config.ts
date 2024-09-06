import DS from 'ember-data';
import config from 'ember-get-config';
import OsfAdapter from './osf-adapter';

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

export default class BinderHubConfigAdapter extends OsfAdapter {
    host = host.replace(/\/+$/, '');
    namespace = namespace;

    buildURL(
        _: string | undefined,
        id: string | null,
        __: DS.Snapshot | null,
        requestType: string,
        query?: {},
    ): string {
        const nodeUrl = super.buildURL('node', null, null, requestType, query);
        const url = nodeUrl.replace(/\/nodes\/$/, '/project/');
        return `${url}${id}/binderhub/config`;
    }
}

declare module 'ember-data/types/registries/adapter' {
    export default interface AdapterRegistry {
        'binderhub-config': BinderHubConfigAdapter;
    } // eslint-disable-line semi
}
