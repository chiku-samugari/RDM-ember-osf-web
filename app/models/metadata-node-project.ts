import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class MetadataNodeProjectModel extends OsfModel {
    @attr('array') files!: any[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'metadata-node-project': MetadataNodeProjectModel;
    } // eslint-disable-line semi
}
