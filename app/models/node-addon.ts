import DS from 'ember-data';
import OsfModel from './osf-model';

import NodeModel from './node';

const { attr, belongsTo } = DS;

export interface Features {
    [key: string]: boolean;
}

export default class NodeAddonModel extends OsfModel {
    @belongsTo('node', { inverse: 'addons', polymorphic: true })
    node!: DS.PromiseObject<NodeModel> & NodeModel;

    @attr('boolean') configured!: boolean;
    // GRDM-44417 - Add features to node-addon model
    @attr('object') features?: Features;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'node-addon': NodeAddonModel;
    } // eslint-disable-line semi
}
