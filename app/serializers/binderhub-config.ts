import OsfSerializer from './osf-serializer';

export default class BinderHubConfigSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'binderhub-config': BinderHubConfigSerializer;
    } // eslint-disable-line semi
}
