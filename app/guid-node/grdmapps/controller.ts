import Intl from 'ember-intl/services/intl';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import config from 'ember-get-config';

import CurrentUser from 'ember-osf-web/services/current-user';

import DS from 'ember-data';

import GrdmappsConfigModel from 'ember-osf-web/models/grdmapps-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

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

interface payload {
    nodeId: string;
    appName: string;
    appNameDisp: string;
    guid: string;
    meetingId: string;
    joinUrl: string;
    action: string;
    info: {
        grdmScenarioStarted: string;
        grdmScenarioCompleted: string;
    };
    error: {
        webappsCreateMeeting: string;
        grdmRegisterMeeting: string;
        slackCreateMeeting: string;
        webappsUpdateMeeting: string; 
        webappsUpdateAttendees: string;
        webappsUpdateAttendeesGrdmMeetingReg: string; 
        grdmUpdateMeetingReg: string;
        slackUpdateMeeting: string; 
        webappsDeleteMeeting: string; 
        grdmDeleteMeetingReg: string;
        slackDeleteMeeting: string; 
        scenarioProcessing: string;
    };
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

const nodeUrl = host + namespace + '/project/' + '{}';
const integromatDir = '/integromat'
const startIntegromatScenarioUrl = nodeUrl + integromatDir + '/start_scenario';
const reqestMessagesUrl =  nodeUrl + integromatDir + '/requestNextMessages';

const TIME_LIMIT_EXECUTION_SCENARIO = 60;

export default class GuidNodeGrdmapps extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service intl!: Intl;
    @service currentUser!: CurrentUser;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<GrdmappsConfigModel>;

    showWorkflows = true;
    showWebMeetingWorkflow = false;
    showRegisterAlternativeWebhookUrl = false;

    webhookUrl = '';

    workflowDescription = '';

    @computed('config.isFulfilled')
    get loading(): boolean {
        return !this.config || !this.config.get('isFulfilled');
    }

    @action
    save(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as GrdmappsConfigModel;

        config.save()
            .then(() => {
                this.set('isPageDirty', false);
            })
            .catch(() => {
                this.saveError(config);
            });
    }

    saveError(config: GrdmappsConfigModel) {
        config.rollbackAttributes();
        const message = this.intl.t('integromat.failed_to_save');
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
    startMeeting(this: GuidNodeGrdmapps, v: string) {
        window.open(v, '_blank');
    }

    @action
    displayWorkflows(this: GuidNodeGrdmapps) {
        this.set('showWorkflows', true);
        this.set('showWebMeetingWorkflow', false);
        this.set('webhookUrl', '');
    }

    @action
    setWorkflow(this: GuidNodeGrdmapps, workflow_desp: string) {

        const workflowType = workflow_desp.split('.')[2];

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
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
    makeRegisterAlternativeWebhookUrl(this: GuidNodeGrdmapps, workflow_description: string) {

        this.set('workflowDescription', workflow_description);
        this.set('showRegisterAlternativeWebhookUrl', true);
    }

    reqLaunch(url: string, payload: payload, appName: string){

        this.toast.info(this.intl.t('integromat.info.launch'))
        const headers = this.currentUser.ajaxHeaders();
        url = startIntegromatScenarioUrl.replace('{}', String(this.model.guid));

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
        })
        .then(res => {
            if(!res.ok){
                this.toast.error(this.intl.t('integromat.error.failedToRequest'));
                return;
            }
            return res.json()
        })
        .then(data => {
            let reqBody = {
                'count': 1,
                'nodeId': data.nodeId,
                'timestamp': data.timestamp,
            }
            this.reqMessage(reqestMessagesUrl, reqBody, appName)
        })
        .catch(() => {
            this.toast.error(this.intl.t('integromat.error.failedToRequest'));
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
        .then(res => {
            if(!res.ok){
                this.toast.error(this.intl.t('integromat.error.failedToGetMessage'));
                return;
            }
            return res.json()
        })
        .then(data => {
            if(data.integromatMsg === 'integromat.info.completed'){
                this.toast.info(this.intl.t(data.integromatMsg));
                this.save();
            }else if(data.integromatMsg.match('.error.')){
                this.toast.error(this.intl.t(data.integromatMsg, {appName: appName}));
                this.save();
            }else{
                if(data.notify){
                    this.toast.info(this.intl.t(data.integromatMsg));
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
            this.toast.error(this.intl.t('integromat.error.failedToGetMessage'));
        })
    }

    @computed('config.all_web_meetings')
    get all_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const all_web_meetings = JSON.parse(config.all_web_meetings);
        return all_web_meetings;
    }

    @computed('config.upcoming_web_meetings')
    get upcoming_web_meetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        let upcoming_web_meetings = JSON.parse(config.upcoming_web_meetings);
        let web_meeting_apps = JSON.parse(config.web_meeting_apps);

        let previousDatetime;
        let currentDatetime;
        let previousDate = '';
        let currentDate = '';

        for(let i = 0; i < upcoming_web_meetings.length; i++){

            //for display App Name on meeting list
            for(let j = 0; j < web_meeting_apps.length; j++){
                if(upcoming_web_meetings[i].fields.app === web_meeting_apps[j].pk){
                    upcoming_web_meetings[i]['app_name_disp'] = this.camel2space(web_meeting_apps[j].fields.app_name);
                    break;
                }
            }

            //for display Date Bar
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
        const config = this.config.content as GrdmappsConfigModel;
        let previous_web_meetings = JSON.parse(config.previous_web_meetings);
        let web_meeting_apps = JSON.parse(config.web_meeting_apps);

        let currentDatetime;
        let nextDatetime;
        let nextDate = '';
        let currentDate = '';

        for(let i = 0; i < previous_web_meetings.length; i++){

            //for display App Name on meeting list
            for(let j = 0; j < web_meeting_apps.length; j++){
                if(previous_web_meetings[i].fields.app === web_meeting_apps[j].pk){
                    previous_web_meetings[i]['app_name_disp'] = this.camel2space(web_meeting_apps[j].fields.app_name);
                    break;
                }
            }

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
        const config = this.config.content as GrdmappsConfigModel;
        const node_microsoft_teams_attendees = JSON.parse(config.node_microsoft_teams_attendees);
        return node_microsoft_teams_attendees;
    }

    @computed('config.node_webex_meetings_attendees')
    get node_webex_meetings_attendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const node_webex_meetings_attendees = JSON.parse(config.node_webex_meetings_attendees);
        return node_webex_meetings_attendees;
    }

    @computed('config.workflows')
    get workflows() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const workflows = JSON.parse(config.workflows);
        return workflows;
    }

    @computed('config.web_meeting_apps')
    get web_meeting_apps() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const web_meeting_apps = JSON.parse(config.web_meeting_apps);

        for(let i = 0; i< web_meeting_apps.length; i++){

            web_meeting_apps[i]['app_name_disp'] = this.camel2space(web_meeting_apps[i].fields.app_name)
        }

        return web_meeting_apps;
    }

    @computed('node')
    get config(): DS.PromiseObject<GrdmappsConfigModel> | undefined {
        if (this.configCache) {
            return this.configCache;
        }
        if (!this.node) {
            return undefined;
        }
        this.configCache = this.store.findRecord('grdmapps-config', this.node.id);
        return this.configCache!;
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/grdmapps': GuidNodeGrdmapps;
    }
}