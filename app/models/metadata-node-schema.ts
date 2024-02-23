import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export enum MetadataType {
    Registration = 'registration',
    DraftRegistration = 'draft_registration',
}

/* eslint-disable camelcase */
export interface ExportTarget {
    id: string;
    schema_id: string;
    name: string | null;
    acceptable?: MetadataType[] | null;
}
/* eslint-enable camelcase */

export type Format = ExportTarget;

export interface Destination extends ExportTarget {
    url: string | null;
}

export default class MetadataNodeSchemaModel extends OsfModel {
    @attr('array') formats!: Format[];
    @attr('array') destinations?: Destination[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'metadata-node-schema': MetadataNodeSchemaModel;
    } // eslint-disable-line semi
}
