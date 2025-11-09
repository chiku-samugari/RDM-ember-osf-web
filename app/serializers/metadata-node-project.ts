import OsfSerializer from './osf-serializer';

export default class MetadataNodeProjectSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'metadata-node-project': MetadataNodeProjectSerializer;
    } // eslint-disable-line semi
}
