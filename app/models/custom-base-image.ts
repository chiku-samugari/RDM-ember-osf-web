import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class CustomBaseImageModel extends OsfModel {
    @attr('string') name!: string;

    @attr('string') imageReference!: string;

    @attr('string') descriptionJa!: string;

    @attr('string') descriptionEn!: string;

    @attr('boolean') deprecated!: boolean;

    @attr('string') guid!: string;

    @attr('number') level!: number;

    @attr('string') nodeTitle!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'custom-base-image': CustomBaseImageModel;
    } // eslint-disable-line semi
}
