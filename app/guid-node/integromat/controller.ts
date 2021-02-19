import I18N from 'ember-i18n/services/i18n';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember-decorators/object';
import { reads } from '@ember-decorators/object/computed';
import { service } from '@ember-decorators/service';
import config from 'ember-get-config';

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

interface reqBody {
    nodeId: string;
    preMsg: string;
}

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

export default class GuidNodeIntegromat extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service i18n!: I18N;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<IntegromatConfigModel>;

    showCreateMicrosoftTeamsMeetingDialog = false;
    showUpdateMicrosoftTeamsMeetingDialog = false;
    showDeleteMicrosoftTeamsMeetingDialog = false;
    showWorkflows = true;
    showMicrosoftTeamsMeetings = false;

    microsoftTeamsMeetings : microsoftTeamsMeetings[] = [];

    currentTime = new Date();
    defaultStartTime = moment(this.currentTime.setMinutes(Math.round(this.currentTime.getMinutes() / 30) * 30)).format('HH:mm');
    defaultEndTime = moment(this.currentTime.setMinutes((Math.round(this.currentTime.getMinutes() / 30) * 30) + 60)).format('HH:mm');

    times = ['0:00', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];


    teams_subject = '';
    teams_attendees : string[] = [];
    teams_startDate = '';
    teams_startTime = '';
    teams_endDate = '';
    teams_endTime = '';
    teams_location = '';
    teams_content = '';

    teamsMeetingAttendees : string[] = [];
    notTeamsMeetingAttendees : string[] = [];
    willDeleteMeetings : string[] = [];

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
    displayWorkflows(this: GuidNodeIntegromat) {
        this.set('showWorkflows', true);
        this.set('showMicrosoftTeamsMeetings', false);
    }

    @action
    createMicrosoftTeamsMeeting(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const organizerId = config.organizer_id;
        const node_id = config.node_settings_id;
        const app_name = config.app_name_microsoft_teams;
        const guid = this.model.guid;
        const teams_subject = this.teams_subject;
        const teams_startDate = moment(this.teams_startDate).format('YYYY-MM-DD');
        const teams_startTime = (<HTMLInputElement>document.querySelectorAll('select[id=create_teams_start_time]')[0]).value;
        const teams_start_date_time = teams_startDate + ' ' + teams_startTime;
        const teams_endDate = moment(this.teams_endDate).format('YYYY-MM-DD');
        const teams_endTime = (<HTMLInputElement>document.querySelectorAll('select[id=create_teams_end_time]')[0]).value;
        const teams_end_date_time = teams_endDate + ' ' + teams_endTime;
        const teams_location = this.teams_location;
        const teams_content = this.teams_content;
        const microsoftTeamsAttendeesChecked = document.querySelectorAll('input[class=microsoftTeamsAttendeesCheck]:checked');

        let arrayAttendeesCollection = [];
        let arrayAttendees = [];

        for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){ 
            arrayAttendeesCollection.push({'emailAddress': {'address': microsoftTeamsAttendeesChecked[i].id}});
            arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
        }

        const startIntegromatScenarioUrl = host + namespace + '/integromat/' + 'start_scenario';
        const reqestMessagesUrl =  host + namespace + '/integromat/' + 'requestNextMessages';

        const action = 'createMicrosoftTeamsMeeting';
        const infoGrdmScenarioStarted = 'integromat.info.started';
        const infoGrdmScenarioCompleted = 'integromat.info.completed';
        const errorMicrosoftTeamsCreateMeeting = 'integromat.error.microsoftTeamsCreateMeeting';
        const errorGrdmCreateMeeting = 'integromat.error.grdmCreateMeeting';
        const errorSlackCreateMeeting = 'integromat.error.slackCreateMeeting';
        const errorMicrosoftTeamsUpdateMeeting = 'integromat.error.microsoftTeamsUpdateMeeting';
        const errorGrdmUpdateMeeting = 'integromat.error.grdmUpdateMeeting';
        const errorSlackUpdateMeeting = 'integromat.error.slackUpdateMeeting';
        const errorMicrosoftTeamsDeleteMeeting = 'integromat.error.microsoftTeamsDeleteMeeting';
        const errorGrdmDeleteMeeting = 'integromat.error.grdmDeleteMeeting';
        const errorSlackDeleteMeeting = 'integromat.error.slackDeleteMeeting';
        const errorScenarioProcessing = 'integromat.error.scenarioProcessing';

        const payload = {
            'nodeId': node_id,
            'meetingAppName': app_name,
            'microsoftUserObjectId': organizerId,
            'guid': guid,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorMicrosoftTeamsCreateMeeting': errorMicrosoftTeamsCreateMeeting,
            'errorGrdmCreateMeeting': errorGrdmCreateMeeting,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorMicrosoftTeamsUpdateMeeting': errorMicrosoftTeamsUpdateMeeting,
            'errorGrdmUpdateMeeting': errorGrdmUpdateMeeting,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorMicrosoftTeamsDeleteMeeting': errorMicrosoftTeamsDeleteMeeting,
            'errorGrdmDeleteMeeting': errorGrdmDeleteMeeting,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDate': teams_start_date_time,
            'endDate': teams_end_date_time,
            'subject': teams_subject,
            'attendeesCollection': arrayAttendeesCollection,
            'attendees': arrayAttendees,
            'location': teams_location,
            'content': teams_content,
            'webhook_url': webhookUrl,
        };

        this.set('showCreateMicrosoftTeamsMeetingDialog', false);

        return fetch(
            startIntegromatScenarioUrl,
            {
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
                if(data.integromatMsg.match('.error.')){
                    this.toast.error(data.integromatMsg)
                }else{
                    this.toast.info(data.integromatMsg)
                }
                let reqBody = {
                    'nodeId': data.nodeId,
                    'preMsg': data.integromatMsg,
                }
                this.reqMessage(reqestMessagesUrl, reqBody)
            })
            .catch(() => {
                this.toast.error('Failed to request.');
            })
    }

    reqMessage(reqestMessagesUrl: string, reqBody: reqBody) {

        return fetch(
            reqestMessagesUrl,
            {
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reqBody)
        })
        .then(res => res.json())
        .then(data => {
            if(data.integromatMsg === 'integromat.info.completed'){
                this.toast.info(this.i18n.t('integromat.info.completed'));
            }else if(data.integromatMsg.match('.error.')){
                this.toast.error(data.integromatMsg);
            }else{
                if(data.notify){
                    this.toast.info(data.integromatMsg);
                }
                let reqBody = {
                    'nodeId': data.nodeId,
                    'preMsg': data.integromatMsg
                }
                this.reqMessage(apiUrl, reqBody)
            }
        })
        .catch(() => {
            this.toast.error('Failed to get message from Integromat');
        })
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeIntegromat) {

        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoftTeamsMeetings = JSON.parse(config.microsoft_teams_meetings);
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');

        if(microsoftTeamsMeetingChecked.length !== 1){
            this.toast.error(this.i18n.t('integromat.select_one'));
        }else{
            this.set('showUpdateMicrosoftTeamsMeetingDialog', true);

            for(let i=0; i < microsoftTeamsMeetings.length; i++){

                if(microsoftTeamsMeetings[i].fields.meetingid === microsoftTeamsMeetingChecked[0].id){
                    this.set('teams_subject', microsoftTeamsMeetings[i].fields.subject);
                    this.set('teams_attendees', microsoftTeamsMeetings[i].fields.attendees);
                    this.set('teams_startDate', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('YYYY/MM/DD'));
                    this.set('teams_startTime', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('HH:mm'));
                    this.set('teams_endDate', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('YYYY/MM/DD'));
                    this.set('teams_endTime', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('HH:mm'));
                    this.set('teams_location', microsoftTeamsMeetings[i].fields.location);
                    this.set('teams_content', microsoftTeamsMeetings[i].fields.content);
                    break;
                }
            }

            const microsoft_teams_attendees = JSON.parse(config.microsoft_teams_attendees);

            this.teamsMeetingAttendees.length = 0;
            this.notTeamsMeetingAttendees.length = 0;

            for(let j = 0; j < microsoft_teams_attendees.length; j++){
                this.notTeamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);

                for(let k = 0; k < this.teams_attendees.length; k++){
                    if(microsoft_teams_attendees[j].pk === this.teams_attendees[k]){
                        this.teamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);
                        this.notTeamsMeetingAttendees.pop();
                        break;
                    }
                }
            }
        }
        return '';
    }

    @action
    setDefaultDate(this: GuidNodeIntegromat) {
        (<any>$('#update_start_date')[0]).value = this.teams_startDate;
        (<any>$('#update_end_date')[0]).value = this.teams_endDate;
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
        const teams_subject = this.teams_subject;
        const teams_startDate = moment(this.teams_startDate).format('YYYY-MM-DD');
        const teams_startTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_teams_start_time]')[0]).value;
        const teams_start_date_time = teams_startDate + ' ' + teams_startTime;
        const teams_endDate = moment(this.teams_endDate).format('YYYY-MM-DD');
        const teams_endTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_teams_end_time]')[0]).value;
        const teams_end_date_time = teams_endDate + ' ' + teams_endTime;
        const teams_location = this.teams_location;
        const teams_content = this.teams_content;
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');
        const microsoft_teams_meeting_id = microsoftTeamsMeetingChecked[0].id;
        const microsoft_teams_meeting_join_url = (<HTMLElement>microsoftTeamsMeetingChecked[0]).dataset.joinUrl;

        const microsoftTeamsAttendeesChecked = document.querySelectorAll('input[class=microsoftTeamsAttendeesCheck]:checked');

        let arrayAttendeesCollection = [];
        let arrayAttendees = [];

        for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){
            arrayAttendeesCollection.push({'address': microsoftTeamsAttendeesChecked[i].id, 'name': 'Unregistered'});
            arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
        }

        const payload = {
            'nodeId': node_id,
            'meetingAppName': app_name,
            'microsoftTeamsMeetingId': microsoft_teams_meeting_id,
            'microsoftTeamsJoinUrl': microsoft_teams_meeting_join_url,
            'action': 'updateMicrosoftTeamsMeeting',
            'startDate': teams_start_date_time,
            'endDate': teams_end_date_time,
            'subject': teams_subject,
            'attendeesCollection': arrayAttendeesCollection,
            'attendees': arrayAttendees,
            'location': teams_location,
            'content': teams_content,
        };

        this.set('showUpdateMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload);

    }

    @action
    makeDeleteDialog(this: GuidNodeIntegromat) {
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');

        if(microsoftTeamsMeetingChecked.length < 1){
            this.toast.error(this.i18n.t('integromat.select_one_or_more'));
        }else{
            this.willDeleteMeetings.length = 0;

            for(let i = 0; i < microsoftTeamsMeetingChecked.length; i++){
                this.willDeleteMeetings.push(((<HTMLElement>microsoftTeamsMeetingChecked[i]).dataset.subject || '').toString());
            }
            this.set('showDeleteMicrosoftTeamsMeetingDialog', true);
        }
    }

    @action
    startDeleteMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const microsoftTeamsMeetingChecked = document.querySelectorAll('input[class=microsoftTeamsMeetingCheck]:checked');
        let selectedMeetingId : string[] = [];
        for(let i = 0; i < microsoftTeamsMeetingChecked.length; i++){
            selectedMeetingId.push(microsoftTeamsMeetingChecked[i].id);
        }
        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const nodeId = config.node_settings_id;
        const appName = config.app_name_microsoft_teams;
        const payload = {
            'nodeId': nodeId,
            'meetingAppName': appName,
            'action': 'deleteMicrosoftTeamsMeeting',
            'microsoftTeamsMeetingIds': selectedMeetingId,
        };

        this.set('showDeleteMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload);
    }

    @action
    startMeeting(this: GuidNodeIntegromat, v: string) {
        window.open(v, '_blank');
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

    @computed('config.microsoft_teams_attendees')
    get microsoft_teams_attendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoft_teams_attendees = JSON.parse(config.microsoft_teams_attendees);
        return microsoft_teams_attendees;
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