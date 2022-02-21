import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class GrdmappsConfigModel extends OsfModel {
    @attr('string') allWebMeetings!: string;
    @attr('string') upcomingWebMeetings!: string;
    @attr('string') previousWebMeetings!: string;
    @attr('string') nodeAttendeesAll!: string;
    @attr('string') nodeMicrosoftTeamsAttendees!: string;
    @attr('string') nodeWebexMeetingsAttendees!: string;
    @attr('string') nodeZoomMeetingsAttendees!: string;
    @attr('string') nodeWebMeetingsAttendeesRelation!: string;
    @attr('string') workflows!: string;
    @attr('string') nodeWorkflows!: string;
    @attr('string') webMeetingApps!: string;
    @attr('string') appNameMicrosoftTeams!: string;
    @attr('string') appNameWebexMeetings!: string;
    @attr('string') appNameZoomMeetings!: string;
    @attr('string') institutionUsers!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'grdmapps-config': GrdmappsConfigModel;
    } // eslint-disable-line semi
}
