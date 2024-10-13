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

export default class ServerAnnotationAdapter extends OsfAdapter {
    host = host.replace(/\/+$/, '');
    namespace = namespace;

    // `guid` is not considered to be an `id` here because it is not
    // identifies a single server annotation. Since there is a
    // one-to-one corresopondence between servers and server annotations,
    // we may use server URL as an `id`.  Anyway, on the other hand, the
    // `guid` must be identified in order to query server annotations.
    // Here is a short guide how to pass the `guid`.
    //
    //   1. `this.store.query`
    //      We can pass `guid` as a member of 2nd argument, i.e. as the
    //      argument for the `query` parameter`. Example:
    //
    //          this.store.query('server-annotation', {guid: "xyzuv"});
    //
    //      In this case, the built URL includes `guid=foo` as its query
    //      parameter. If it is harmful, we need to invent another
    //      workaround.
    //
    //   2. `this.store.findRecord`
    //      We should pass an object which has `adapterOptions` property
    //      whose value includes `guid` property as the 3rd argument,
    //      i.e. an argument for the `options` parameter. Example:
    //
    //          this.store.findRecord(
    //              'server-annotation', "1", { adapterOptions: { guid: "xyzuv" } }
    //          );
    //
    //      Then, we can access to the `adapterOptions` property via the
    //      3rd parameter (i.e. `snapshot`) of `buildURL` method. Unlike
    //      to the `query` method case above, it does not pollute the
    //      query parameter.
    //
    //   3. `this.store.findAll`
    //      In this case, we do the same as the `findRecord` case, but
    //      use the 2nd argument. Example:
    //
    //          this.store.findRecord(
    //              'server-annotation', { adapterOptions: { guid: "xyzuv" } }
    //          );
    //
    //   4. (model object's) `save` and `destroyRecord`
    //      Do the same as 2., 3., but use the 1st argument.
    //
    //          annot.save({adapterOptions: {guid: 'n376x'}});
    //
    // The `buildURL` implementation here should be more simpler if we
    // can use `snapshot.adapterOptions` even in the `query` method
    // case. Unfortunately, the argument given to `snapshot` is always
    // `null` in the case of `query` method.
    buildURL(
        modelName: string | undefined,
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
                return `${url}${adapterOpts.guid}/binderhub/server_annotation${id ? `/${id}` : ''}`;
            }
            throw new EmberError(
                'Illegal method call. `{adapterOptions: {guid: (guid value)}}` must be specified.',
            );
        }
        return `${url}${query.guid}/binderhub/server_annotation${id ? `/${id}` : ''}`;
    }
}

declare module 'ember-data/types/registries/adapter' {
    export default interface AdapterRegistry {
        'server-annotation': ServerAnnotationAdapter;
    } // eslint-disable-line semi
}
