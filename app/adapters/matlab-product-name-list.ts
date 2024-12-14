import EmberError from '@ember/error';
import DS from 'ember-data';

import config from 'ember-get-config';

import OsfAdapter from './osf-adapter';

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

export default class MatlabProductNameListAdapter extends OsfAdapter {
    host = host.replace(/\/+$/, '');
    namespace = namespace;

    buildURL(
        _: string | undefined,
        id: string | null,
        snapshot: DS.Snapshot | null,
        requestType: string,
        query?: {},
    ): string {
        const nodeUrl = super.buildURL('node', null, snapshot, requestType, query);
        const url = nodeUrl.replace(/\/nodes\/$/, '/project/');
        // See app/adapters/server-annotations.ts for detailed
        // explanation.
        if (requestType !== 'findRecord') {
            throw new EmberError(
                'Request type other than `findRecord` is not yet implemented for MatlabProductNameList.',
            );
        }
        if (id === null) {
            throw new EmberError(
                'Illegal method call. Argument `id` is null.',
            );
        }
        if (snapshot === null) {
            throw new EmberError(
                'Malformed arguments. `snapshot` is `null`.',
            );
        }
        if (typeof snapshot.adapterOptions === 'undefined') {
            throw new EmberError(
                'Illegal method call. `snapshot.argumentOptions` is undefined.',
            );
        }
        if ('guid' in snapshot.adapterOptions) {
            const adapterOpts = snapshot.adapterOptions as {guid: string};
            return `${url}${adapterOpts.guid}/binderhub/matlab/product_name_list/${id}`;
        }
        throw new EmberError(
            'Illegal method call. `{adapterOptions: {guid: (guid value)}}` must be specified.',
        );
    }
}

declare module 'ember-data/types/registries/adapter' {
    export default interface AdapterRegistry {
        'matlab-product-name-list': MatlabProductNameListAdapter;
    } // eslint-disable-line semi
}
