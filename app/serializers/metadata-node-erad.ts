import OsfSerializer from './osf-serializer';

export default class MetadataNodeEradSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'metadata-node-erad': MetadataNodeEradSerializer;
    } // eslint-disable-line semi
}
