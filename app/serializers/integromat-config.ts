import OsfSerializer from './osf-serializer';

export default class IntegromatConfigSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'integromat-config': IntegromatConfigSerializer;
    } // eslint-disable-line semi
}