import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class ServerAnnotationModel extends OsfModel {
    @attr('string') serverUrl!: string;

    @attr('string') name!: string;

    @attr('string') memotext!: string;

    @attr('string') binderhubUrl!: string;

    @attr('string') jupyterhubUrl!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'server-annotation': ServerAnnotationModel;
    } // eslint-disable-line semi
}
