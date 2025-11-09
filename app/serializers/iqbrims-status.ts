import OsfSerializer from './osf-serializer';

export default class IQBRIMSStatusSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'iqbrims-status': IQBRIMSStatusSerializer;
    } // eslint-disable-line semi
}
