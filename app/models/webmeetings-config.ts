import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class WebMeetingsConfigModel extends OsfModel {
    @attr('string') webMeetingsApps!: string;
    @attr('string') allUpcomingWebMeetings!: string;
    @attr('string') allPreviousWebMeetings!: string;
    @attr('string') appNameMicrosoftTeams!: string;
    @attr('string') appNameWebexMeetings!: string;
    @attr('string') appNameZoomMeetings!: string;
    @attr('string') nodeMicrosoftTeamsAttendees!: string;
    @attr('string') nodeWebexMeetingsAttendees!: string;
    @attr('string') nodeWebexMeetingsAttendeesRelation!: string;
    @attr('string') microsoftTeamsSignature!: string;
    @attr('string') projectContributors!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'webmeetings-config': WebMeetingsConfigModel;
    } // eslint-disable-line semi
}
