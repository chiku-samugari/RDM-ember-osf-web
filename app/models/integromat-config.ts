import { attr } from '@ember-decorators/data';
import OsfModel from './osf-model';

export default class IntegromatConfigModel extends OsfModel {
    @attr('string') webhook_url!: string;
    @attr('string') all_web_meetings!: string;
    @attr('string') upcoming_web_meetings!: string;
    @attr('string') previous_web_meetings!: string;
    @attr('string') web_meeting_attendees!: string;
    @attr('string') microsoft_teams_attendees!: string;
    @attr('string') webex_meetings_attendees!: string;
    @attr('string') workflows!: string;
    @attr('string') node_settings_id!: string;
    @attr('string') web_meeting_apps!: string;
    @attr('string') app_name_microsoft_teams!: string;
    @attr('string') app_name_webex_meetings!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'integromat-config': IntegromatConfigModel;
    } // eslint-disable-line semi
}