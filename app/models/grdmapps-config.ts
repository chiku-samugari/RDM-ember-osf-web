import DS from 'ember-data';
import OsfModel from './osf-model';

const { attr } = DS;

export default class GrdmappsConfigModel extends OsfModel {
    @attr('string') all_web_meetings!: string;
    @attr('string') upcoming_web_meetings!: string;
    @attr('string') previous_web_meetings!: string;
    @attr('string') node_attendees_all!: string;
    @attr('string') node_microsoft_teams_attendees!: string;
    @attr('string') node_webex_meetings_attendees!: string;
    @attr('string') node_web_meetings_attendees_relation!: string;
    @attr('string') workflows!: string;
    @attr('string') node_workflows!: string;
    @attr('string') node_settings_id!: string;
    @attr('string') web_meeting_apps!: string;
    @attr('string') app_name_microsoft_teams!: string;
    @attr('string') app_name_webex_meetings!: string;
    @attr('string') institution_users!: string;
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'grdmapps-config': GrdmappsConfigModel;
    } // eslint-disable-line semi
}