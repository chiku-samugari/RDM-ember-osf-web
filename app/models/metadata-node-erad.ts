import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class MetadataNodeEradModel extends OsfModel {
    @attr('array') records!: any[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'metadata-node-erad': MetadataNodeEradModel;
    } // eslint-disable-line semi
}
