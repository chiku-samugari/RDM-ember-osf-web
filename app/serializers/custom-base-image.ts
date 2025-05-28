import OsfSerializer from './osf-serializer';

export default class CustomBaseImageSerializer extends OsfSerializer {
    keyForAttribute(key: string) {
        return key;
    }
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'custom-base-image': CustomBaseImageSerializer;
    } // eslint-disable-line semi
}
