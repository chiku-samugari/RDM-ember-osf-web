import DS from 'ember-data';
import OsfModel from './osf-model';

import NodeModel from './node';

const { attr, belongsTo } = DS;

export default class NodeAddonModel extends OsfModel {
    @belongsTo('node', { inverse: 'addons', polymorphic: true })
    node!: DS.PromiseObject<NodeModel> & NodeModel;

    @attr('boolean') configured!: boolean;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'node-addon': NodeAddonModel;
    } // eslint-disable-line semi
}
