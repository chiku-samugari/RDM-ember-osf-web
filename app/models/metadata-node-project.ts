import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export interface MetadataValue {
    comments?: any[];
    extra?: any[];
    value: any;
}

export interface MetadataData {
    [key: string]: MetadataValue;
}

export interface MetadataItem {
    schema: string;
    data: MetadataData;
}

export interface FileEntry {
    path: string;
    urlpath: string;
    items: MetadataItem[];
}

export default class MetadataNodeProjectModel extends OsfModel {
    @attr('array') files!: FileEntry[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'metadata-node-project': MetadataNodeProjectModel;
    } // eslint-disable-line semi
}
