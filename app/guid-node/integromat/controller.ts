import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember-decorators/object';
import { reads } from '@ember-decorators/object/computed';
import { service } from '@ember-decorators/service';

import DS from 'ember-data';
import moment from 'moment';
import IntegromatConfigModel from 'ember-osf-web/models/integromat-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

import $ from 'jquery';

interface microsoftTeamsMeetingInfo {
    subject: string;
    attendees: string[];
    start_datetime: string;
    end_datetime: string;
    location: string;
    content: string;
    meeting: string;
}

interface microsoftTeamsMeetings {
    [fields: string]: microsoftTeamsMeetingInfo;
}

export default class GuidNodeIntegromat extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<IntegromatConfigModel>;

    showCreateMicrosoftTeamsMeetingDialog = false;
    showUpdateMicrosoftTeamsMeetingDialog = false;
    showDeleteMicrosoftTeamsMeetingDialog = false;
    showWorkflows = true;
    showMicrosoftTeamsMeetings = false;

    selectedTargetId : string[] = [];
    microsoftTeamsMeetings : microsoftTeamsMeetings[] = [];

    times = ['0:00', '1:00', '1:30', '2:00','2:30', '3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00','13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',, '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];


    teams_subject = '';
    teams_attendees : string[] = [];
    teams_startDate = '';
    teams_startTime = '';
    teams_endDate = '';
    teams_endTime = '';
    teams_location = '';
    teams_content = '';

    @computed('config.isFulfilled')
    get loading(): boolean {
        return !this.config || !this.config.get('isFulfilled');
    }

    @action
    save(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as IntegromatConfigModel;

        config.save()
            .then(() => {
                this.set('isPageDirty', false);
            })
            .catch(() => {
                this.saveError(config);
            });
    }

    @action
    checkboxAction(this: GuidNodeIntegromat, v: string, checked: boolean) {
        if(checked){
            this.selectedTargetId.push(v);
        }else{
            this.selectedTargetId.forEach((item, index) => {
                if(item === v){
                    this.selectedTargetId.splice(index, 1);
                }
            });
        }
    }

    @action
    startDeleteMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const selectedMeetingId = this.selectedTargetId;
        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const nodeId = config.node_settings_id;
        const appName = config.app_name_microsoft_teams;

        const payload = {
                "nodeId": nodeId,
                "meetingAppName": appName,
                "action": 'deleteMicrosoftTeamsMeeting',
                "microsoftTeamsMeetingIds": selectedMeetingId
                };

        this.set('showDeleteMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload)
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeIntegromat) {

        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoftTeamsMeetings = JSON.parse(config.microsoft_teams_meetings);
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');

        if(microsoftTeamsMeetingChecked.length != 1){
            this.toast.error('Select only one meeting information.');
        }else{
            this.set('showUpdateMicrosoftTeamsMeetingDialog', true);

            for(var i=0 ; i < microsoftTeamsMeetings.length ; i++){

                if(microsoftTeamsMeetings[i].fields.meetingid == microsoftTeamsMeetingChecked[0].id){
                    this.set('teams_subject', microsoftTeamsMeetings[i].fields.subject);
                    this.set('teams_attendees', microsoftTeamsMeetings[i].fields.attendees);
                    this.set('teams_startDate', microsoftTeamsMeetings[i].fields.start_datetime);
                    this.set('teams_endDate', microsoftTeamsMeetings[i].fields.end_datetime);
                    this.set('teams_location', microsoftTeamsMeetings[i].fields.location);
                    this.set('teams_content', microsoftTeamsMeetings[i].fields.content);
                    break;
                }
            }
        }
        return '';
    }

    @action
    startUpdateMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const node_id = config.node_settings_id;
        const app_name = config.app_name_microsoft_teams;
        const info_grdm_scenario_processing = config.info_grdm_scenario_processing
        const teams_subject = this.teams_subject;
        const teams_attendees = this.teams_attendees;
        const teams_startDate = moment(this.teams_startDate).format('YYYY-MM-DD');
        const teams_startTime = this.teams_startTime;
        const teams_start_date_time = teams_startDate + ' ' + teams_startTime
        const teams_endDate = moment(this.teams_endDate).format('YYYY-MM-DD');
        const teams_endTime = this.teams_endTime;
        const teams_end_date_time = teams_endDate + ' ' + teams_endTime
        const teams_location = this.teams_location;
        const teams_content = this.teams_content;
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');
        const microsoft_teams_meeting_id = microsoftTeamsMeetingChecked[0].id;
        const microsoft_teams_meeting_join_url = (<HTMLElement>microsoftTeamsMeetingChecked[0]).dataset.joinUrl;

/////// MAKE COLLECTION LATER ////////////
        var arrayAttendeesCollection = [];
        var arrayAttendees = []
        var attendeeJson = {"address": teams_attendees, "name": "dummy"};
        arrayAttendeesCollection.push(attendeeJson);
        arrayAttendees.push(teams_attendees);
/////// MAKE COLLECTION LATER ////////////

        const payload = {
                "nodeId": node_id,
                "meetingAppName": app_name,
                "microsoftTeamsMeetingId": microsoft_teams_meeting_id,
                "microsoftTeamsJoinUrl": microsoft_teams_meeting_join_url,
                "action": 'updateMicrosoftTeamsMeeting',
                "infoGrdmScenarioProcessing": info_grdm_scenario_processing,
                "startDate": teams_start_date_time,
                "endDate": teams_end_date_time,
                "subject": teams_subject,
                "attendeesCollection": arrayAttendeesCollection,
                "attendees": arrayAttendees,
                "location": teams_location,
                "content": teams_content
                };

        this.set('showUpdateMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload)

    }

    @action
    startCreateMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const organizerId = config.organizer_id;
        const node_id = config.node_settings_id;
        const app_name = config.app_name_microsoft_teams;
        const guid = this.model.guid;
        const info_grdm_scenario_processing = config.info_grdm_scenario_processing
        const teams_subject = this.teams_subject;
        const teams_attendees = this.teams_attendees;
        const teams_startDate = moment(this.teams_startDate).format('YYYY-MM-DD');
        const teams_startTime = this.teams_startTime;
        const teams_start_date_time = teams_startDate + ' ' + teams_startTime
        const teams_endDate = moment(this.teams_endDate).format('YYYY-MM-DD');
        const teams_endTime = this.teams_endTime;
        const teams_end_date_time = teams_endDate + ' ' + teams_endTime
        const teams_location = this.teams_location;
        const teams_content = this.teams_content;

/////// MAKE COLLECTION LATER ////////////
        var arrayAttendeesCollection = [];
        var arrayAttendees = []
        var attendeeJson = {"emailAddress": {"address": teams_attendees}};
        arrayAttendeesCollection.push(attendeeJson);
        arrayAttendees.push(teams_attendees);
/////// MAKE COLLECTION LATER ////////////

        const payload = {
                "nodeId": node_id,
                "meetingAppName": app_name,
                "microsoftUserObjectId": organizerId,
                "guid": guid,
                "action": 'createMicrosoftTeamsMeeting',
                "infoGrdmScenarioProcessing": info_grdm_scenario_processing,
                "startDate": teams_start_date_time,
                "endDate": teams_end_date_time,
                "subject": teams_subject,
                "attendeesCollection": arrayAttendeesCollection,
                "attendees": arrayAttendees,
                "location": teams_location,
                "content": teams_content
                };

        this.set('showCreateMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload)

    }

    @action
    startMeeting(this: GuidNodeIntegromat, v: string) {
        window.open(v, '_blank');
    }

    @action
    setStartTime(this: GuidNodeIntegromat) {
        const startDate = document.querySelector('select[name=select-start-time]').value;
        this.set('teams_startTime', startDate);
    }

    @action
    setEndTime(this: GuidNodeIntegromat) {
        const endDate = document.querySelector('select[name=select-end-time]').value;
        this.set('teams_endTime', endDate);
    }

    @action
    closeDialogs() {
        this.set('showCreateMicrosoftTeamsMeetingDialog', false);
        this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
    }

    saveError(config: IntegromatConfigModel) {
        config.rollbackAttributes();
        const message = 'integromat.failed_to_save';
        this.toast.error(message);
    }

    @computed('config.microsoft_teams_meetings')
    get microsoft_teams_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoft_teams_meetings = JSON.parse(config.microsoft_teams_meetings);
        return microsoft_teams_meetings;
    }

    @computed('config.workflows')
    get workflows() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const workflows = JSON.parse(config.workflows);
        return workflows;
    }

    @computed('config.node_settings_id')
    get node_settings_id() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const node_settings_id = config.node_settings_id;
        return node_settings_id;
    }
    @computed('config.app_name_microsoft_teams')
    get app_name_microsoft_teams() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const appNameMicrosoftTeams = config.app_name_microsoft_teams;
        return appNameMicrosoftTeams;
    }


    @computed('config.infoMsg')
    get infoMsg() {
        if (!this.config || !this.config.get('isFulfilled')) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const message = config.infoMsg;
        return this.toast.info(message);
    }

    @computed('node')
    get config(): DS.PromiseObject<IntegromatConfigModel> | undefined {
        if (this.configCache) {
            return this.configCache;
        }
        if (!this.node) {
            return undefined;
        }
        this.configCache = this.store.findRecord('integromat-config', this.node.id);
        return this.configCache!;
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/integromat': GuidNodeIntegromat;
    }
}