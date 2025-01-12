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

export default class CustomBaseImageAdapter extends OsfAdapter {
    host = host.replace(/\/+$/, '');
    namespace = namespace;
    buildURL(
        _: string | undefined,
        id: string | null,
        snapshot: DS.Snapshot | null,
        requestType: string,
        query?: { 'guid': string },
    ): string {
        const nodeUrl = super.buildURL('node', null, snapshot, requestType, query);
        const url = nodeUrl.replace(/\/nodes\/$/, '/project/');
        if (typeof query === 'undefined') {
            if (snapshot === null) {
                throw new EmberError(
                    'Malformed arguments. `snapshot` is null and `query` is undefined.',
                );
            }
            if (typeof snapshot.adapterOptions === 'undefined') {
                throw new EmberError(
                    'Illegal method call. `snapshot.argumentOptions` and `query` are undefined.',
                );
            }
            if ('guid' in snapshot.adapterOptions) {
                const adapterOpts = snapshot.adapterOptions as {guid: string};
                return `${url}${adapterOpts.guid}/binderhub/custom_base_image${id ? `/${id}` : ''}`;
            }
            throw new EmberError(
                'Illegal method call. `{adapterOptions: {guid: (guid value)}}` must be specified.',
            );
        }
        return `${url}${query.guid}/binderhub/custom_base_image${id ? `/${id}` : ''}`;
    }
}

declare module 'ember-data/types/registries/adapter' {
    export default interface AdapterRegistry {
        'custom-base-image': CustomBaseImageAdapter;
    } // eslint-disable-line semi
}
