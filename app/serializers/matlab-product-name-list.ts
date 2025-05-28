import OsfSerializer from './osf-serializer';

export default class MatlabProductNameListSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'matlab-product-name-list': MatlabProductNameListSerializer;
    } // eslint-disable-line semi
}
