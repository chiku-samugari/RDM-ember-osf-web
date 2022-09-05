import OsfSerializer from './osf-serializer';

export default class WebMeetingsConfigSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'webmeetings-config': WebMeetingsConfigSerializer;
    } // eslint-disable-line semi
}
