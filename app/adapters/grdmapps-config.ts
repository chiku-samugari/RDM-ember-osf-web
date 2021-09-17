import DS from 'ember-data';
import config from 'ember-get-config';
import OsfAdapter from './osf-adapter';

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

export default class GrdmappsConfigAdapter extends OsfAdapter {
    host = host.replace(/\/+$/, '');
    namespace = 'api/v1';

    buildURL(
        _: string | undefined,
        id: string | null,
        __: DS.Snapshot | null,
        ___: string,
        ____?: {},
    ): string {
        const nodeUrl = super.buildURL('node', null, null, 'findRecord', {});
        const url = nodeUrl.replace(/\/nodes\/$/, '/project/');
        return `${url}${id}/grdmapps/config`;
    }
}

declare module 'ember-data/types/registries/adapter' {
    export default interface AdapterRegistry {
        'grdmapps-config': GrdmappsConfigAdapter;
    } // eslint-disable-line semi
}