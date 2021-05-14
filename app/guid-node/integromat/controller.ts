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
    timestamp: string;
}

interface attendeeAtCreate {
    emailAddress: { address: string; };
}

interface attendeeAtUpdate {
    address: string;
    name: string;
}

interface payload {
    nodeId: string;
    meetingAppName: string;
    guid: string;
    meetingId: string;
    joinUrl: string;
    action: string;
    infoGrdmScenarioStarted: string;
    infoGrdmScenarioCompleted: string;
    errorWebappsCreateMeeting: string;
    errorGrdmCreateMeetingInfo: string;
    errorSlackCreateMeeting: string;
    errorWebappsUpdateMeeting: string;
    errorGrdmUpdateMeetingInfo: string;
    errorSlackUpdateMeeting: string;
    errorWebappsDeleteMeeting: string;
    errorGrdmDeleteMeetingInfo: string;
    errorSlackDeleteMeeting: string;
    errorScenarioProcessing: string;
    startDate: string;
    endDate: string;
    subject: string;
    attendeesCollectionAtCreate: attendeeAtCreate[];
    attendeesCollectionAtUpdate: attendeeAtUpdate[];
    attendees: string;
    location: string;
    content: string;
    webhook_url: string;
    timestamp: number;
}

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

const infoGrdmScenarioStarted = 'integromat.info.started';
const infoGrdmScenarioCompleted = 'integromat.info.completed';
const errorWebappsCreateMeeting = 'integromat.error.webappsCreateMeeting';
const errorGrdmCreateMeetingInfo = 'integromat.error.grdmCreateMeeting';
const errorSlackCreateMeeting = 'integromat.error.slackCreateMeeting';
const errorWebappsUpdateMeeting = 'integromat.error.webappsUpdateMeeting';
const errorGrdmUpdateMeetingInfo = 'integromat.error.grdmUpdateMeeting';
const errorSlackUpdateMeeting = 'integromat.error.slackUpdateMeeting';
const errorWebappsDeleteMeeting = 'integromat.error.webappsDeleteMeeting';
const errorGrdmDeleteMeetingInfo = 'integromat.error.grdmDeleteMeeting';
const errorSlackDeleteMeeting = 'integromat.error.slackDeleteMeeting';
const errorScenarioProcessing = 'integromat.error.scenarioProcessing';

const startIntegromatScenarioUrl = host + namespace + '/integromat/' + 'start_scenario';
const reqestMessagesUrl =  host + namespace + '/integromat/' + 'requestNextMessages';

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
    showDetailMicrosoftTeamsMeetingDialog = false;
    showWorkflows = true;
    showAllWebMeetings = false;

    microsoftTeamsMeetings : microsoftTeamsMeetings[] = [];

    currentTime = new Date();
    defaultStartTime = moment(this.currentTime.setMinutes(Math.round(this.currentTime.getMinutes() / 30) * 30)).format('HH:mm');
    defaultEndTime = moment(this.currentTime.setMinutes((Math.round(this.currentTime.getMinutes() / 30) * 30) + 60)).format('HH:mm');

    times = ['0:00', '0:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];


    webMeetingSubject = '';
    webMeetingAttendees : string[] = [];
    webMeetingStartDate = '';
    webMeetingStartTime = '';
    webMeetingEndDate = '';
    webMeetingEndTime = '';
    webMeetingLocation = '';
    webMeetingContent = '';
    webMeetingUpdateMeetingId = '';
    webMeetingDeleteMeetingId = '';
    webMeetingJoinUrl = '';

    teamsMeetingAttendees : string[] = [];
    notTeamsMeetingAttendees : string[] = [];

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

    saveError(config: IntegromatConfigModel) {
        config.rollbackAttributes();
        const message = this.i18n.t('integromat.failed_to_save');
        this.toast.error(message);
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

    @action
    displayWorkflows(this: GuidNodeIntegromat) {
        this.set('showWorkflows', true);
        this.set('showAllWebMeetings', false);
    }

    @action
    createMicrosoftTeamsMeeting(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const node_id = config.node_settings_id;
        const appName = config.app_name_microsoft_teams;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingSubject;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTime = (<HTMLInputElement>document.querySelectorAll('select[id=create_teams_start_time]')[0]).value;
        const webMeetingStartDatetime = webMeetingStartDate + ' ' + webMeetingStartTime;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTime = (<HTMLInputElement>document.querySelectorAll('select[id=create_teams_end_time]')[0]).value;
        const webMeetingEndDatetime = webMeetingEndDate + ' ' + webMeetingEndTime;
        const webMeetingLocation = this.webMeetingLocation;
        const webMeetingContent = this.webMeetingContent;
        const microsoftTeamsAttendeesChecked = document.querySelectorAll('input[class=microsoftTeamsAttendeesCheck]:checked');
        const empty = '';
        const emptyList = [];

        let arrayAttendeesCollection = [];
        let arrayAttendees = [];

        for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){ 
            arrayAttendeesCollection.push({'emailAddress': {'address': microsoftTeamsAttendeesChecked[i].id}});
            arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
        }

        const action = 'createMicrosoftTeamsMeeting';
        const timestamp = new Date().getTime();

        const payload = {
            'nodeId': node_id,
            'meetingAppName': appName,
            'guid': guid,
            'meetingId': empty,
            'joinUrl': empty,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmCreateMeetingInfo': errorGrdmCreateMeetingInfo,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorGrdmUpdateMeetingInfo': errorGrdmUpdateMeetingInfo,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingInfo': errorGrdmDeleteMeetingInfo,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDate': webMeetingStartDatetime,
            'endDate': webMeetingEndDatetime,
            'subject': webMeetingSubject,
            'attendeesCollectionAtCreate': arrayAttendeesCollection,
            'attendeesCollectionAtUpdate': emptyList,
            'attendees': arrayAttendees,
            'location': webMeetingLocation,
            'content': webMeetingContent,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.set('showCreateMicrosoftTeamsMeetingDialog', false);

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appName);
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeIntegromat, v: string) {

        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoftTeamsMeetings = JSON.parse(config.all_web_meetings);

        this.set('showUpdateMicrosoftTeamsMeetingDialog', true);

        for(let i=0; i < microsoftTeamsMeetings.length; i++){

            if(microsoftTeamsMeetings[i].fields.meetingid === v){
                this.set('webMeetingSubject', microsoftTeamsMeetings[i].fields.subject);
                this.set('webMeetingAttendees', microsoftTeamsMeetings[i].fields.attendees);
                this.set('webMeetingStartDate', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('YYYY/MM/DD'));
                this.set('webMeetingStartTime', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('HH:mm'));
                this.set('webMeetingEndDate', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('YYYY/MM/DD'));
                this.set('webMeetingEndTime', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('HH:mm'));
                this.set('webMeetingLocation', microsoftTeamsMeetings[i].fields.location);
                this.set('webMeetingContent', microsoftTeamsMeetings[i].fields.content);
                this.set('webMeetingUpdateMeetingId', microsoftTeamsMeetings[i].fields.meetingid);
                this.set('webMeetingJoinUrl', microsoftTeamsMeetings[i].fields.join_url);
                break;
            }
        }

        const microsoft_teams_attendees = JSON.parse(config.microsoft_teams_attendees);

        this.teamsMeetingAttendees.length = 0;
        this.notTeamsMeetingAttendees.length = 0;

        for(let j = 0; j < microsoft_teams_attendees.length; j++){
            this.notTeamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);

            for(let k = 0; k < this.webMeetingAttendees.length; k++){
                if(microsoft_teams_attendees[j].pk === this.webMeetingAttendees[k]){
                    this.teamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);
                    this.notTeamsMeetingAttendees.pop();
                    break;
                }
            }
        }
        return '';
    }

    @action
    setDefaultDate(this: GuidNodeIntegromat) {
        (<any>$('#update_start_date')[0]).value = this.webMeetingStartDate;
        (<any>$('#update_end_date')[0]).value = this.webMeetingEndDate;
    }

    @action
    startUpdateMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const node_id = config.node_settings_id;
        const appName = config.app_name_microsoft_teams;
        const webMeetingSubject = this.webMeetingSubject;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_teams_start_time]')[0]).value;
        const webMeetingStartDatetime = webMeetingStartDate + ' ' + webMeetingStartTime;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_teams_end_time]')[0]).value;
        const webMeetingEndDatetime = webMeetingEndDate + ' ' + webMeetingEndTime;
        const webMeetingLocation = this.webMeetingLocation;
        const webMeetingContent = this.webMeetingContent;
        const webMeetingId = this.webMeetingUpdateMeetingId;
        const webMeetingJoinUrl = this.webMeetingJoinUrl;
        const microsoftTeamsAttendeesChecked = document.querySelectorAll('input[class=microsoftTeamsAttendeesCheck]:checked');
        const empty = '';
        const emptyList = '';

        let arrayAttendeesCollection = [];
        let arrayAttendees = [];

        for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){
            arrayAttendeesCollection.push({'address': microsoftTeamsAttendeesChecked[i].id, 'name': 'Unregistered'});
            arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
        }

        const action = 'updateMicrosoftTeamsMeeting';
        const timestamp = new Date().getTime();

        this.set('webMeetingUpdateMeetingId', '');

        const payload = {
            'nodeId': node_id,
            'meetingAppName': appName,
            'guid': empty,
            'meetingId': webMeetingId,
            'joinUrl': webMeetingJoinUrl,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmCreateMeetingInfo': errorGrdmCreateMeetingInfo,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorGrdmUpdateMeetingInfo': errorGrdmUpdateMeetingInfo,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingInfo': errorGrdmDeleteMeetingInfo,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDate': webMeetingStartDatetime,
            'endDate': webMeetingEndDatetime,
            'subject': webMeetingSubject,
            'attendeesCollectionAtCreate': emptyList,
            'attendeesCollectionAtUpdate': arrayAttendeesCollection,
            'attendees': arrayAttendees,
            'location': webMeetingLocation,
            'content': webMeetingContent,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.set('showUpdateMicrosoftTeamsMeetingDialog', false);

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appName);
    }

    @action
    makeDeleteDialog(this: GuidNodeIntegromat, id: string) {

        this.set('showDeleteMicrosoftTeamsMeetingDialog', true);
        this.set('webMeetingDeleteMeetingId', id);

    }

    @action
    startDeleteMicrosoftTeamsMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const nodeId = config.node_settings_id;
        const appName = config.app_name_microsoft_teams;
        const action = 'deleteMicrosoftTeamsMeeting';
        const timestamp = new Date().getTime();
        const empty = '';

        const payload = {
            'nodeId': nodeId,
            'meetingAppName': appName,
            'guid': empty,
            'meetingId': this.webMeetingDeleteMeetingId,
            'joinUrl': empty,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmCreateMeetingInfo': errorGrdmCreateMeetingInfo,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorGrdmUpdateMeetingInfo': errorGrdmUpdateMeetingInfo,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingInfo': errorGrdmDeleteMeetingInfo,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDate': empty,
            'endDate': empty,
            'subject': empty,
            'attendeesCollection': empty,
            'attendees': empty,
            'location': empty,
            'content': empty,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.set('webMeetingDeleteMeetingId', '');
        this.set('showDeleteMicrosoftTeamsMeetingDialog', false);

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appName);
    }

    @action
    makeDetailMeetingDialog(this: GuidNodeIntegromat, v: string) {

        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoftTeamsMeetings = JSON.parse(config.all_web_meetings);

        this.set('showDetailMicrosoftTeamsMeetingDialog', true);

        for(let i=0; i < microsoftTeamsMeetings.length; i++){

            if(microsoftTeamsMeetings[i].fields.meetingid === v){
                this.set('webMeetingSubject', microsoftTeamsMeetings[i].fields.subject);
                this.set('webMeetingAttendees', microsoftTeamsMeetings[i].fields.attendees);
                this.set('webMeetingStartDate', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('YYYY/MM/DD'));
                this.set('webMeetingStartTime', moment(microsoftTeamsMeetings[i].fields.start_datetime).format('HH:mm'));
                this.set('webMeetingEndDate', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('YYYY/MM/DD'));
                this.set('webMeetingEndTime', moment(microsoftTeamsMeetings[i].fields.end_datetime).format('HH:mm'));
                this.set('webMeetingLocation', microsoftTeamsMeetings[i].fields.location);
                this.set('webMeetingContent', microsoftTeamsMeetings[i].fields.content);
                this.set('webMeetingJoinUrl', microsoftTeamsMeetings[i].fields.join_url);
                break;
            }
        }

        const microsoft_teams_attendees = JSON.parse(config.microsoft_teams_attendees);

        this.teamsMeetingAttendees.length = 0;
        this.notTeamsMeetingAttendees.length = 0;

        for(let j = 0; j < microsoft_teams_attendees.length; j++){
            this.notTeamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);

            for(let k = 0; k < this.webMeetingAttendees.length; k++){
                if(microsoft_teams_attendees[j].pk === this.webMeetingAttendees[k]){
                    this.teamsMeetingAttendees.push(microsoft_teams_attendees[j].fields.microsoft_teams_mail);
                    this.notTeamsMeetingAttendees.pop();
                    break;
                }
            }
        }
        return '';
    }

    reqLaunch(url: string, payload: payload, appName: string){

        this.toast.info(this.i18n.t('integromat.info.launch'))

        return fetch(
            url,
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
                    this.toast.error(this.i18n.t(data.integromatMsg))
                }else{
                    this.toast.info(this.i18n.t(data.integromatMsg))
                    let reqBody = {
                        'nodeId': data.nodeId,
                        'timestamp': data.timestamp,
                    }
                    this.reqMessage(reqestMessagesUrl, reqBody, appName)
                }
            })
            .catch(() => {
                this.toast.error(this.i18n.t('integromat.error.failedToRequest'));
            })
	}

    reqMessage(url: string, reqBody: reqBody, appName: string) {

        return fetch(
            url,
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
                this.toast.info(this.i18n.t(data.integromatMsg));
                this.save();
            }else if(data.integromatMsg.match('.error.')){
                this.toast.error(this.i18n.t(data.integromatMsg, {appName: appName}));
            }else{
                if(data.notify){
                    this.toast.info(this.i18n.t(data.integromatMsg));
                }
                let reqBody = {
                    'nodeId': data.nodeId,
                    'timestamp': data.timestamp
                }
                this.reqMessage(url, reqBody, appName)
            }
        })
        .catch(() => {
            this.toast.error(this.i18n.t('integromat.error.failedToGetMessage'));
        })
    }

    @computed('config.all_web_meetings')
    get all_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const all_web_meetings = JSON.parse(config.all_web_meetings);
        return all_web_meetings;
    }

    @computed('config.upcoming_web_meetings')
    get upcoming_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const upcoming_web_meetings = JSON.parse(config.upcoming_web_meetings);
        return upcoming_web_meetings;
    }

    @computed('config.previous_web_meetings')
    get previous_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const previous_web_meetings = JSON.parse(config.previous_web_meetings);
        return previous_web_meetings;
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