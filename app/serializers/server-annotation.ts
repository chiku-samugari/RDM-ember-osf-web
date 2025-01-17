import OsfSerializer from './osf-serializer';

export default class ServerAnnotationSerializer extends OsfSerializer {
    keyForAttribute(key: string) {
        return key;
    }
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'server-annotation': ServerAnnotationSerializer;
    } // eslint-disable-line semi
}
