import OsfSerializer from './osf-serializer';

export default class GrdmappsConfigSerializer extends OsfSerializer {
}

declare module 'ember-data/types/registries/serializer' {
    export default interface SerializerRegistry {
        'grdmapps-config': GrdmappsConfigSerializer;
    } // eslint-disable-line semi
}
