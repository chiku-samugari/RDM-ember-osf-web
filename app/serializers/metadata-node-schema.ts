import OsfSerializer from './osf-serializer';

export default class MetadataNodeSchemaSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'metadata-node-schema': MetadataNodeSchemaSerializer;
    } // eslint-disable-line semi
}
