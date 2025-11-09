import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

/* eslint-disable camelcase */
export interface Format {
    schema_id: string;
    name: string | null;
}
/* eslint-enable camelcase */

export default class MetadataNodeSchemaModel extends OsfModel {
    @attr('array') formats!: Format[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'metadata-node-schema': MetadataNodeSchemaModel;
    } // eslint-disable-line semi
}
