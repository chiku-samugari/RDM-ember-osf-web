import I18N from 'ember-i18n/services/i18n';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember-decorators/object';
import { reads } from '@ember-decorators/object/computed';
import { service } from '@ember-decorators/service';
import config from 'ember-get-config';

import CurrentUser from 'ember-osf-web/services/current-user';

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
    count: number;
    nodeId: string;
    timestamp: string;
}

interface microsoftTeamsAttendeeAtCreate {
    emailAddress: { address: string; };
}

interface microsoftTeamsAttendeeAtUpdate {
    address: string;
    name: string;
}

interface webexMeetingsAttendee {
    email: string;
}

interface webexMeetingsCreateInvitee {
    email: string;
}

interface webMeetingAttendeesNow {
    email: string;
    fullname: string;
    profile: string;
}

interface notwebMeetingAttendeesNow {
    email: string;
    fullname: string;
}

interface payload {
    nodeId: string;
    appName: string;
    appNameDisp: string;
    guid: string;
    meetingId: string;
    joinUrl: string;
    action: string;
    infoGrdmScenarioStarted: string;
    infoGrdmScenarioCompleted: string;
    errorWebappsCreateMeeting: string;
    errorGrdmRegisterMeeting: string;
    errorSlackCreateMeeting: string;
    errorWebappsUpdateMeeting: string;
    errorWebappsUpdateAttendees: string;
    errorWebappsUpdateAttendeesGrdmMeeting: string;
    errorGrdmUpdateMeetingReg: string;
    errorSlackUpdateMeeting: string;
    errorWebappsDeleteMeeting: string;
    errorGrdmDeleteMeetingReg: string;
    errorSlackDeleteMeeting: string;
    errorScenarioProcessing: string;
    startDatetime: string;
    endDatetime: string;
    subject: string;
    microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[];
    microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[];
    webexMeetingsAttendeesCollection: webexMeetingsAttendee[];
    webexMeetingsCreateInvitees: webexMeetingsCreateInvitee[],
    webexMeetingsDeleteInviteeIds: string[],
    attendees: string[];
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
const errorGrdmRegisterMeeting = 'integromat.error.grdmCreateMeeting';
const errorSlackCreateMeeting = 'integromat.error.slackCreateMeeting';
const errorWebappsUpdateMeeting = 'integromat.error.webappsUpdateMeeting';
const errorWebappsUpdateAttendees = 'integromat.error.webappsUpdateAttendees';
const errorWebappsUpdateAttendeesGrdmMeeting = 'integromat.error.webappsUpdateAttendeesGrdmMeeting';
const errorGrdmUpdateMeetingReg = 'integromat.error.grdmUpdateMeeting';
const errorSlackUpdateMeeting = 'integromat.error.slackUpdateMeeting';
const errorWebappsDeleteMeeting = 'integromat.error.webappsDeleteMeeting';
const errorGrdmDeleteMeetingReg = 'integromat.error.grdmDeleteMeeting';
const errorSlackDeleteMeeting = 'integromat.error.slackDeleteMeeting';
const errorScenarioProcessing = 'integromat.error.scenarioProcessing';


const nodeUrl = host + namespace + '/project/' + '{}';
const integromatDir = '/integromat'
const startIntegromatScenarioUrl = nodeUrl + integromatDir + '/start_scenario';
const reqestMessagesUrl =  nodeUrl + integromatDir + '/requestNextMessages';
const registerAlternativeWebhookUrl = nodeUrl + integromatDir + '/register_alternative_webhook_url';
const profileUrl = host + '/profile/'

const TIME_LIMIT_EXECUTION_SCENARIO = 60;

export default class GuidNodeIntegromat extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service i18n!: I18N;
    @service currentUser!: CurrentUser;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<IntegromatConfigModel>;

    showCreateWebMeetingDialog = false;
    showUpdateWebMeetingDialog = false;
    showCreateMicrosoftTeamsMeetingDialog = false;
    showCreateWebexMeetingDialog = false;
    showUpdateMicrosoftTeamsMeetingDialog = false;
    showUpdateWebexMeetingsDialog = false;
    showDeleteWebMeetingDialog = false;
    showDetailWebMeetingDialog = false;
    showWorkflows = true;
    showWebMeetingWorkflow = false;
    showRegisterAlternativeWebhookUrl = false;

    microsoftTeamsMeetings : microsoftTeamsMeetings[] = [];

    currentTime = new Date();
    defaultStartTime = moment(this.currentTime.setMinutes(Math.round(this.currentTime.getMinutes() / 30) * 30)).format('HH:mm');
    defaultEndTime = moment(this.currentTime.setMinutes((Math.round(this.currentTime.getMinutes() / 30) * 30) + 60)).format('HH:mm');

    times = ['00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00'];

    webMeetingAppName = '';
    webMeetingAppNameDisp = '';
    webMeetingPk = '';
    webMeetingSubject = '';
    webMeetingOrganizerFullname = '';
    webMeetingAttendees : string[] = [];
    webMeetingStartDate = '';
    webMeetingStartTime = '';
    webMeetingEndDate = '';
    webMeetingEndTime = '';
    webMeetingLocation = '';
    webMeetingContent = '';
    webMeetingUpdateMeetingId = '';
    webMeetingDeleteMeetingId = '';
    webMeetingDeleteSubject = '';
    webMeetingDeleteStartDate = '';
    webMeetingDeleteStartTime = '';
    webMeetingDeleteEndDate = '';
    webMeetingDeleteEndTime = '';
    webMeetingJoinUrl = '';
    webMeetingPassword = '';
    webhookUrl = '';

    workflowDescription = '';
    alternativeWebhookUrl = '';

    teamsMeetingAttendees : string[] = [];
    notTeamsMeetingAttendees : string[] = [];
    webMeetingAttendeesNow : webMeetingAttendeesNow[] = [];
    notwebMeetingAttendeesNow : notwebMeetingAttendeesNow[] = [];

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

    camel2space(v: string) {

        const separator = ' ';
        return v
                .replace(/[A-Z][a-z]/g, function (match) {
                    return separator + match;
                })
                .replace(/[A-Z]+$/g, function (match) {
                    return separator + match;
                })
                .trim();
    }

    @action
    startMeeting(this: GuidNodeIntegromat, v: string) {
        window.open(v, '_blank');
    }

    @action
    closeDialogs() {
        this.set('showCreateWebMeetingDialog', false);
        this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
    }

    @action
    displayWorkflows(this: GuidNodeIntegromat) {
        this.set('showWorkflows', true);
        this.set('showWebMeetingWorkflow', false);
        this.set('webhookUrl', '');
    }

    @action
    setWorkflow(this: GuidNodeIntegromat, workflow_desp: string) {

        const workflowType = workflow_desp.split('.')[2];

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const workflows = JSON.parse(config.workflows);
        const nodeWorkflows = JSON.parse(config.node_workflows);

        let workflowId = '';
        let url = '' ;

        for(let i = 0; i < workflows.length; i++){
            if(workflows[i].fields.workflow_description === workflow_desp){
                workflowId = workflows[i].pk
                for(let j = 0; j < nodeWorkflows.length; j++){
                    if(nodeWorkflows[j].fields.workflow === workflowId){
                        if(!nodeWorkflows[j].fields.scenarios){
                            url = nodeWorkflows[j].fields.alternative_webhook_url
                        }
                    }
                }
            }
        }

        this.set('webhookUrl', url);

        if(workflowType === 'web_meeting'){

            this.set('showWorkflows', false);
            this.set('showWebMeetingWorkflow', true);
        }
    }

    @action
    setWebMeetingApp(this: GuidNodeIntegromat, v: string, action: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        let appNameDisp = '';

        if(v === config.app_name_microsoft_teams){

            if(action === 'create'){
                this.set('showCreateMicrosoftTeamsMeetingDialog', true);
                this.set('showCreateWebexMeetingDialog', false);
            }else if(action === 'update'){
                this.set('showUpdateMicrosoftTeamsMeetingDialog', true);
                this.set('showUpdateWebexMeetingsDialog', false);
            }
            appNameDisp = this.camel2space(v);
            this.set('webMeetingAppName', v);
            this.set('webMeetingAppNameDisp', appNameDisp);

        }else if(v === config.app_name_webex_meetings){

            if(action === 'create'){
                this.set('showCreateMicrosoftTeamsMeetingDialog', false);
                this.set('showCreateWebexMeetingDialog', true);
            }else if(action === 'update'){
                this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
                this.set('showUpdateWebexMeetingsDialog', true);
            }
            appNameDisp = this.camel2space(v);
            this.set('webMeetingAppName', v);
            this.set('webMeetingAppNameDisp', appNameDisp);

        }else if (!v && !action){

            this.set('showCreateWebMeetingDialog', false);
            this.set('showUpdateWebMeetingDialog', false);
            this.set('showDeleteWebMeetingDialog', false);
            this.set('showCreateMicrosoftTeamsMeetingDialog', false);
            this.set('showCreateWebexMeetingDialog', false);
            this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
            this.set('showUpdateWebexMeetingsDialog', false);
            this.set('showDeleteWebMeetingDialog', false);
            this.set('showDetailWebMeetingDialog', false);

            this.set('webMeetingAppName', '');
            this.set('webMeetingAppNameDisp', '');
            this.set('webMeetingPk', '');
            this.set('webMeetingSubject', '');
            this.set('webMeetingOrganizerFullname', '');
            this.set('webMeetingAttendees', 0);
            this.set('webMeetingStartDate', '');
            this.set('webMeetingStartTime', '');
            this.set('webMeetingEndDate', '');
            this.set('webMeetingEndTime', '');
            this.set('webMeetingLocation', '');
            this.set('webMeetingContent', '');
            this.set('webMeetingUpdateMeetingId', '');
            this.set('webMeetingJoinUrl', '');
            this.set('webMeetingPassword', '');
            this.set('webMeetingDeleteMeetingId', '');
            this.set('webMeetingDeleteSubject', '');
            this.set('webMeetingDeleteStartDate', '');
            this.set('webMeetingDeleteStartTime', '');
            this.set('webMeetingDeleteEndDate', '');
            this.set('webMeetingDeleteEndTime', '');
        }
    }

    @action
    resetValue(this: GuidNodeIntegromat) {

        this.set('workflowDescription', '');
        this.set('alternativeWebhookUrl', '');
        this.set('showRegisterAlternativeWebhookUrl', false);
    }

    @action
    makeRegisterAlternativeWebhookUrl(this: GuidNodeIntegromat, workflow_description: string) {

        this.set('workflowDescription', workflow_description);
        this.set('showRegisterAlternativeWebhookUrl', true);
    }

    @action
    registerAlternativeWebhook(this: GuidNodeIntegromat) {

        const headers = this.currentUser.ajaxHeaders();
        const url = registerAlternativeWebhookUrl.replace('{}', String(this.model.guid));
        const payload = {
            'workflowDescription': this.workflowDescription,
            'alternativeWebhookUrl': this.alternativeWebhookUrl,
        };

        this.resetValue();

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
        })
        .then((res) => {
                if(!res.ok){
                    this.toast.error(this.i18n.t('integromat.fail.registerAlternativeWebhookUrl'));
                    return;
                }
                this.save();
                this.toast.info(this.i18n.t('integromat.success.registerAlternativeWebhookUrl'));
            })
            .catch(() => {
                this.toast.error(this.i18n.t('integromat.error.failedToRequest'));
            })
    }

    @action
    createWebMeeting(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = this.webhookUrl;
        const node_id = config.node_settings_id;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
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
        const webexMeetingsAttendeesChecked = document.querySelectorAll('input[class=webexMeetingsAttendeesCheck]:checked');
        const empty = '';
        const timestamp = new Date().getTime();

        let action = '';
        let microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        let microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        let webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];
        let arrayAttendees = [];

        let webexMeetingsCreateInvitees: webexMeetingsCreateInvitee[] = [];
        let webexMeetingsDeleteInviteeIds: string[] = [];

        if (this.webMeetingAppName === config.app_name_microsoft_teams) {

            action = 'createMicrosoftTeamsMeeting';

            for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){ 
                microsoftTeamsAttendeesCollectionAtCreate.push({'emailAddress': {'address': microsoftTeamsAttendeesChecked[i].id}});
                arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
            }
        }else if (this.webMeetingAppName === config.app_name_webex_meetings) {

            action = 'createWebexMeetings';

            for(let i = 0; i < webexMeetingsAttendeesChecked.length; i++){
                webexMeetingsAttendeesCollection.push({'email': webexMeetingsAttendeesChecked[i].id});
                arrayAttendees.push(webexMeetingsAttendeesChecked[i].id);
            }
        }
        const payload = {
            'nodeId': node_id,
            'appName': appName,
            'appNameDisp': appNameDisp,
            'guid': guid,
            'meetingId': empty,
            'joinUrl': empty,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmRegisterMeeting': errorGrdmRegisterMeeting,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorWebappsUpdateAttendees': errorWebappsUpdateAttendees,
            'errorWebappsUpdateAttendeesGrdmMeeting' : errorWebappsUpdateAttendeesGrdmMeeting,
            'errorGrdmUpdateMeetingReg': errorGrdmUpdateMeetingReg,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingReg': errorGrdmDeleteMeetingReg,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDatetime': webMeetingStartDatetime,
            'endDatetime': webMeetingEndDatetime,
            'subject': webMeetingSubject,
            'microsoftTeamsAttendeesCollectionAtCreate': microsoftTeamsAttendeesCollectionAtCreate,
            'microsoftTeamsAttendeesCollectionAtUpdate': microsoftTeamsAttendeesCollectionAtUpdate,
            'webexMeetingsAttendeesCollection': webexMeetingsAttendeesCollection,
            'webexMeetingsCreateInvitees': webexMeetingsCreateInvitees,
            'webexMeetingsDeleteInviteeIds': webexMeetingsDeleteInviteeIds,
            'attendees': arrayAttendees,
            'location': webMeetingLocation,
            'content': webMeetingContent,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appNameDisp);
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeIntegromat, meetingPk: string, meetingId: string, joinUrl: string, meetingPassword: string, appId: string, subject: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {

        this.set('showUpdateWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webMeetingApps = JSON.parse(config.web_meeting_apps);

        let appName = '';

        this.set('webMeetingPk', meetingPk);
        this.set('webMeetingSubject', subject);
        this.set('webMeetingAttendees', attendees);
        this.set('webMeetingStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingEndTime', moment(endDatetime).format('HH:mm'));
        this.set('webMeetingLocation', location);
        this.set('webMeetingContent', content);
        this.set('webMeetingUpdateMeetingId', meetingId);
        this.set('webMeetingJoinUrl', joinUrl);
        this.set('webMeetingPassword', meetingPassword);

        for(let i=0; i < webMeetingApps.length; i++){

            if(webMeetingApps[i].pk === appId){
                appName = webMeetingApps[i].fields.app_name;
                break;
            }
        }

        this.setWebMeetingApp(appName, 'update');
        this.makeWebMeetingAttendee(appName, 'update');

    }

    makeWebMeetingAttendee(this: GuidNodeIntegromat, appName: string, type: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as IntegromatConfigModel;

        const nodeMicrosoftTeamsAttendees = JSON.parse(config.node_microsoft_teams_attendees_all);
        const nodeWebexMeetingsAttendees = JSON.parse(config.node_microsoft_teams_attendees_all);

        this.webMeetingAttendeesNow.length = 0;
        this.notwebMeetingAttendeesNow.length = 0;

        if(appName === config.app_name_microsoft_teams){

            for(let j = 0; j < nodeMicrosoftTeamsAttendees.length; j++){

                if(type === 'update' && !(nodeMicrosoftTeamsAttendees[j].fields.microsoft_teams_mail)){
                    continue;
                }
                this.notwebMeetingAttendeesNow.push({'email': nodeMicrosoftTeamsAttendees[j].fields.microsoft_teams_mail, 'fullname': nodeMicrosoftTeamsAttendees[j].fields.fullname});

                for(let k = 0; k < this.webMeetingAttendees.length; k++){
                    if(nodeMicrosoftTeamsAttendees[j].pk === this.webMeetingAttendees[k]){
                        this.webMeetingAttendeesNow.push({'email': nodeMicrosoftTeamsAttendees[j].fields.microsoft_teams_mail, 'fullname': nodeMicrosoftTeamsAttendees[j].fields.fullname, 'profile': profileUrl + nodeMicrosoftTeamsAttendees[j].fields.user_guid});
                        this.notwebMeetingAttendeesNow.pop();
                        break;
                    }
                }
            }
        }else if(appName === config.app_name_webex_meetings){
            for(let l = 0; l < nodeWebexMeetingsAttendees.length; l++){

                if(type === 'update' && !(nodeWebexMeetingsAttendees[l].fields.webex_meetings_mail)){
                    continue;
                }
                this.notwebMeetingAttendeesNow.push({'email': nodeWebexMeetingsAttendees[l].fields.webex_meetings_mail, 'fullname': nodeWebexMeetingsAttendees[l].fields.fullname});

                for(let m = 0; m < this.webMeetingAttendees.length; m++){
                    if(nodeWebexMeetingsAttendees[l].pk === this.webMeetingAttendees[m]){
                        this.webMeetingAttendeesNow.push({'email': nodeWebexMeetingsAttendees[l].fields.webex_meetings_mail, 'fullname': nodeWebexMeetingsAttendees[l].fields.fullname, 'profile': profileUrl + nodeWebexMeetingsAttendees[l].fields.user_guid});
                        this.notwebMeetingAttendeesNow.pop();
                        break;
                    }
                }
            }
        }
    }

    @action
    setDefaultDate(this: GuidNodeIntegromat) {
        (<any>$('#update_start_date')[0]).value = this.webMeetingStartDate;
        (<any>$('#update_end_date')[0]).value = this.webMeetingEndDate;
    }

    @action
    updateWebMeeting(this: GuidNodeIntegromat) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = this.webhookUrl;;
        const node_id = config.node_settings_id;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const webMeetingSubject = this.webMeetingSubject;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_start_time]')[0]).value;
        const webMeetingStartDatetime = webMeetingStartDate + ' ' + webMeetingStartTime;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTime = (<HTMLInputElement>document.querySelectorAll('select[id=update_end_time]')[0]).value;
        const webMeetingEndDatetime = webMeetingEndDate + ' ' + webMeetingEndTime;
        const webMeetingLocation = this.webMeetingLocation;
        const webMeetingContent = this.webMeetingContent;
        const webMeetingId = this.webMeetingUpdateMeetingId;
        const webMeetingJoinUrl = this.webMeetingJoinUrl;
        const webMeetingPassword = this.webMeetingPassword;
        const microsoftTeamsAttendeesChecked = document.querySelectorAll('input[class=microsoftTeamsAttendeesCheck]:checked');
        const webexMeetingsAttendeesChecked = document.querySelectorAll('input[class=webexMeetingsAttendeesCheck]:checked');
        const empty = '';
        const timestamp = new Date().getTime();

        const nodeWebMeetingAttendeesRelation =JSON.parse(config.node_web_meetings_attendees_relation)
        const nodeWebexMeetingsAttendees = JSON.parse(config.node_webex_meetings_attendees);

        let action = '';
        let microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        let microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        let webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];
        let arrayAttendees = [];
        let arrayAttendeePks: string[] = [];

        let arrayCreateAttendeePks = [];
        let arrayDeleteAttendeePks = [];
        let webexMeetingsCreateInvitees: webexMeetingsCreateInvitee[] = [];
        let webexMeetingsDeleteInviteeIds: string[] = [];

        if (appName === config.app_name_microsoft_teams) {

            action = 'updateMicrosoftTeamsMeeting';

            for(let i = 0; i < microsoftTeamsAttendeesChecked.length; i++){ 
                microsoftTeamsAttendeesCollectionAtUpdate.push({'address': microsoftTeamsAttendeesChecked[i].id, 'name': 'Unregistered'});
                arrayAttendees.push(microsoftTeamsAttendeesChecked[i].id);
            }
        }else if (appName === config.app_name_webex_meetings) {

            action = 'updateWebexMeetings';

            for(let i = 0; i < webexMeetingsAttendeesChecked.length; i++){
                webexMeetingsAttendeesCollection.push({'email': webexMeetingsAttendeesChecked[i].id});
                arrayAttendees.push(webexMeetingsAttendeesChecked[i].id);

                for(let j = 0; j < nodeWebexMeetingsAttendees.length; j++){

                    if(webexMeetingsAttendeesChecked[i].id === nodeWebexMeetingsAttendees[j].fields.webex_meetings_mail){
                        arrayAttendeePks.push(nodeWebexMeetingsAttendees[j].pk);
                    }
                }
            }

            arrayCreateAttendeePks = arrayAttendeePks.filter(i => (this.webMeetingAttendees).indexOf(i) == -1)
            arrayDeleteAttendeePks = (this.webMeetingAttendees).filter(i => arrayAttendeePks.indexOf(i) == -1)

            for(let i = 0; i < arrayCreateAttendeePks.length; i++){
                for(let j = 0; j < nodeWebexMeetingsAttendees.length; j++){
                    if(arrayCreateAttendeePks[i] === nodeWebexMeetingsAttendees[j].pk){
                        webexMeetingsCreateInvitees.push({'email': nodeWebexMeetingsAttendees[j].fields.webex_meetings_mail});
                    }
                }
            }

            for(let i = 0; i < arrayDeleteAttendeePks.length; i++){
                for(let j = 0; j < nodeWebMeetingAttendeesRelation.length; j++){
                    if(this.webMeetingPk === nodeWebMeetingAttendeesRelation[j].fields.all_meeting_information){
                        if(arrayDeleteAttendeePks[i] === nodeWebMeetingAttendeesRelation[j].fields.attendees){

                            webexMeetingsDeleteInviteeIds.push(nodeWebMeetingAttendeesRelation[j].fields.webex_meetings_invitee_id);
                        }
                    }
                }
            }
        }

        const payload = {
            'nodeId': node_id,
            'appName': appName,
            'appNameDisp': appNameDisp,
            'guid': empty,
            'meetingId': webMeetingId,
            'joinUrl': webMeetingJoinUrl,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmRegisterMeeting': errorGrdmRegisterMeeting,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorWebappsUpdateAttendees': errorWebappsUpdateAttendees,
            'errorWebappsUpdateAttendeesGrdmMeeting' : errorWebappsUpdateAttendeesGrdmMeeting,
            'errorGrdmUpdateMeetingReg': errorGrdmUpdateMeetingReg,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingReg': errorGrdmDeleteMeetingReg,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDatetime': webMeetingStartDatetime,
            'endDatetime': webMeetingEndDatetime,
            'subject': webMeetingSubject,
            'microsoftTeamsAttendeesCollectionAtCreate': microsoftTeamsAttendeesCollectionAtCreate,
            'microsoftTeamsAttendeesCollectionAtUpdate': microsoftTeamsAttendeesCollectionAtUpdate,
            'webexMeetingsAttendeesCollection': webexMeetingsAttendeesCollection,
            'webexMeetingsCreateInvitees': webexMeetingsCreateInvitees,
            'webexMeetingsDeleteInviteeIds': webexMeetingsDeleteInviteeIds,
            'attendees': arrayAttendees,
            'location': webMeetingLocation,
            'content': webMeetingContent,
            'password': webMeetingPassword,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appName);
    }

    @action
    makeDeleteDialog(this: GuidNodeIntegromat, meetingId: string, appId: string, subject: string, startDatetime: string, endDatetime: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webMeetingApps = JSON.parse(config.web_meeting_apps);
        let appName = '';

        for(let i=0; i < webMeetingApps.length; i++){

            if(webMeetingApps[i].pk === appId){
                appName = webMeetingApps[i].fields.app_name
                break;
            }
        }

        this.setWebMeetingApp(appName, 'delete');

        this.set('showDeleteWebMeetingDialog', true);
        this.set('webMeetingDeleteMeetingId', meetingId);
        this.set('webMeetingDeleteSubject', subject);
        this.set('webMeetingDeleteStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingDeleteStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingDeleteEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingDeleteEndTime', moment(endDatetime).format('HH:mm'));

    }

    @action
    deleteWebMeeting(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = this.webhookUrl;
        const nodeId = config.node_settings_id;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const webMeetingSubject = this.webMeetingDeleteSubject;
        const webMeetingStartDatetime = this.webMeetingDeleteStartDate + ' ' + this.webMeetingDeleteStartTime;
        const webMeetingEndDatetime = this.webMeetingDeleteEndDate + ' ' + this.webMeetingDeleteEndTime;
        const timestamp = new Date().getTime();

        const empty = '';
        const emptyList : string[] = [];
        const microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];

        let webexMeetingsCreateInvitees : webexMeetingsCreateInvitee[] = [];
        let webexMeetingsDeleteInviteeIds : string[] = [];

        let action = '';

        if (this.webMeetingAppName === config.app_name_microsoft_teams) {

            action = 'deleteMicrosoftTeamsMeeting';

        }else if (this.webMeetingAppName === config.app_name_webex_meetings) {

            action = 'deleteWebexMeetings';

        }

        const payload = {
            'nodeId': nodeId,
            'appName': appName,
            'appNameDisp': appNameDisp,
            'guid': empty,
            'meetingId': this.webMeetingDeleteMeetingId,
            'joinUrl': empty,
            'action': action,
            'infoGrdmScenarioStarted': infoGrdmScenarioStarted,
            'infoGrdmScenarioCompleted': infoGrdmScenarioCompleted,
            'errorWebappsCreateMeeting': errorWebappsCreateMeeting,
            'errorGrdmRegisterMeeting': errorGrdmRegisterMeeting,
            'errorSlackCreateMeeting': errorSlackCreateMeeting,
            'errorWebappsUpdateMeeting': errorWebappsUpdateMeeting,
            'errorWebappsUpdateAttendees': errorWebappsUpdateAttendees,
            'errorWebappsUpdateAttendeesGrdmMeeting' : errorWebappsUpdateAttendeesGrdmMeeting,
            'errorGrdmUpdateMeetingReg': errorGrdmUpdateMeetingReg,
            'errorSlackUpdateMeeting': errorSlackUpdateMeeting,
            'errorWebappsDeleteMeeting': errorWebappsDeleteMeeting,
            'errorGrdmDeleteMeetingReg': errorGrdmDeleteMeetingReg,
            'errorSlackDeleteMeeting': errorSlackDeleteMeeting,
            'errorScenarioProcessing': errorScenarioProcessing,
            'startDatetime': webMeetingStartDatetime,
            'endDatetime': webMeetingEndDatetime,
            'subject': webMeetingSubject,
            'microsoftTeamsAttendeesCollectionAtCreate': microsoftTeamsAttendeesCollectionAtCreate,
            'microsoftTeamsAttendeesCollectionAtUpdate': microsoftTeamsAttendeesCollectionAtUpdate,
            'webexMeetingsAttendeesCollection': webexMeetingsAttendeesCollection,
            'webexMeetingsCreateInvitees': webexMeetingsCreateInvitees,
            'webexMeetingsDeleteInviteeIds': webexMeetingsDeleteInviteeIds,
            'attendees': emptyList,
            'location': empty,
            'content': empty,
            'webhook_url': webhookUrl,
            'timestamp': timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appNameDisp);
    }

    @action
    makeDetailMeetingDialog(this: GuidNodeIntegromat, meetingPk: string, meetingId: string, joinUrl: string, appId: string, subject: string, organizer_fullname: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {

        this.set('showDetailWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webMeetingApps = JSON.parse(config.web_meeting_apps);

        let appName = '';

        this.set('webMeetingPk', meetingPk);
        this.set('webMeetingSubject', subject);
        this.set('webMeetingOrganizerFullname', organizer_fullname);
        this.set('webMeetingAttendees', attendees);
        this.set('webMeetingStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingEndTime', moment(endDatetime).format('HH:mm'));
        this.set('webMeetingLocation', location);
        this.set('webMeetingContent', content);
        this.set('webMeetingUpdateMeetingId', meetingId);
        this.set('webMeetingJoinUrl', joinUrl);

        for(let i=0; i < webMeetingApps.length; i++){

            if(webMeetingApps[i].pk === appId){
                appName = webMeetingApps[i].fields.app_name;
                break;
            }
        }

        this.setWebMeetingApp(appName, 'detail');
        this.makeWebMeetingAttendee(appName, 'detail');
    }

    reqLaunch(url: string, payload: payload, appName: string){

        this.toast.info(this.i18n.t('integromat.info.launch'))
        const headers = this.currentUser.ajaxHeaders();
        url = startIntegromatScenarioUrl.replace('{}', String(this.model.guid));

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            let reqBody = {
                'count': 1,
                'nodeId': data.nodeId,
                'timestamp': data.timestamp,
            }
            this.reqMessage(reqestMessagesUrl, reqBody, appName)
        })
        .catch(() => {
            this.toast.error(this.i18n.t('integromat.error.failedToRequest'));
        })
    }

    reqMessage(url: string, reqBody: reqBody, appName: string) {

        const headers = this.currentUser.ajaxHeaders();
        url = reqestMessagesUrl.replace('{}', String(this.model.guid));

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(reqBody)
        })
        .then(res => res.json())
        .then(data => {
            if(data.integromatMsg === 'integromat.info.completed'){
                this.toast.info(this.i18n.t(data.integromatMsg));
                this.save();
            }else if(data.integromatMsg.match('.error.')){
                this.toast.error(this.i18n.t(data.integromatMsg, {appName: appName}));
                this.save();
            }else{
                if(data.notify){
                    this.toast.info(this.i18n.t(data.integromatMsg));
                }
                let reqBody = {
                    'count': data.count + 1,
                    'nodeId': data.nodeId,
                    'timestamp': data.timestamp
                }
                if(reqBody.count < TIME_LIMIT_EXECUTION_SCENARIO + 1){
                    this.reqMessage(url, reqBody, appName)
                }
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
        let upcoming_web_meetings = JSON.parse(config.upcoming_web_meetings);

        let previousDatetime;
        let currentDatetime;
        let previousDate = '';
        let currentDate = '';

        for(let i = 0; i < upcoming_web_meetings.length; i++){
            if(i === 0){
                upcoming_web_meetings[i]['date_bar'] = false;
            }else if(i !== 0){

                previousDatetime =new Date(upcoming_web_meetings[i-1].fields.start_datetime);
                currentDatetime =new Date(upcoming_web_meetings[i].fields.start_datetime);

                previousDate = previousDatetime.getFullYear() + '/' + (previousDatetime.getMonth() + 1) + '/' + previousDatetime.getDate();
                currentDate = currentDatetime.getFullYear() + '/' + (currentDatetime.getMonth() + 1) + '/' + currentDatetime.getDate();

                if(currentDate != previousDate){
                    upcoming_web_meetings[i]['date_bar'] = true;
                }else{
                    upcoming_web_meetings[i]['date_bar'] = false;
                }
            }
        }
        return upcoming_web_meetings;
    }

    @computed('config.previous_web_meetings')
    get previous_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        let previous_web_meetings = JSON.parse(config.previous_web_meetings);

        let currentDatetime;
        let nextDatetime;
        let nextDate = '';
        let currentDate = '';

        for(let i = 0; i < previous_web_meetings.length; i++){
            if(i === 0){
                previous_web_meetings[i]['date_bar'] = false;
            }else if(i !== 0){

                nextDatetime = new Date(previous_web_meetings[i-1].fields.start_datetime);
                currentDatetime = new Date(previous_web_meetings[i].fields.start_datetime);

                nextDate = nextDatetime.getFullYear() + '/' + (nextDatetime.getMonth() + 1) + '/' + nextDatetime.getDate();
                currentDate = currentDatetime.getFullYear() + '/' + (currentDatetime.getMonth() + 1) + '/' + currentDatetime.getDate();

                if(currentDate != nextDate){
                    previous_web_meetings[i]['date_bar'] = true;
                }else{
                    previous_web_meetings[i]['date_bar'] = false;
                }
            }
        }

        return previous_web_meetings;
    }

    @computed('config.node_microsoft_teams_attendees')
    get node_microsoft_teams_attendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const node_microsoft_teams_attendees = JSON.parse(config.node_microsoft_teams_attendees);
        return node_microsoft_teams_attendees;
    }

    @computed('config.node_webex_meetings_attendees')
    get node_webex_meetings_attendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const node_webex_meetings_attendees = JSON.parse(config.node_webex_meetings_attendees);
        return node_webex_meetings_attendees;
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

    @computed('config.web_meeting_apps')
    get web_meeting_apps() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const web_meeting_apps = JSON.parse(config.web_meeting_apps);
        return web_meeting_apps;
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