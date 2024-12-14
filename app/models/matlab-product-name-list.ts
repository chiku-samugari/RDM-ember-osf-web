import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class MatlabProductNameList extends OsfModel {
    @attr('string') release!: string;

    @attr('array') names!: string[];
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'matlab-product-name-list': MatlabProductNameList;
    } // eslint-disable-line semi
}
