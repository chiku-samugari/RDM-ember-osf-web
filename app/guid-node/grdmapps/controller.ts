import Intl from 'ember-intl/services/intl';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import DS from 'ember-data';
import moment from 'moment';
import GrdmappsConfigModel from 'ember-osf-web/models/grdmapps-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

interface webMeetingAttendeesNow {
    email: string;
    fullname: string;
    profile: string;
}

interface notwebMeetingAttendeesNow {
    email: string;
    fullname: string;
}

const {
    OSF: {
        url: host,
//        webApiNamespace: namespace,
    },
} = config;

const profileUrl = host + '/profile/'

export default class GuidNodeGrdmapps extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service intl!: Intl;
	
    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<GrdmappsConfigModel>;

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

    msgInvalidSubject = '';
    msgInvalidAttendees = '';
    msgInvalidDatetime = '';
    msgInvalidWebhookUrl = '';

    workflowDescription = '';

    webMeetingAttendeesNow : webMeetingAttendeesNow[] = [];
    notwebMeetingAttendeesNow : notwebMeetingAttendeesNow[] = [];

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
    setWebMeetingApp(this: GuidNodeGrdmapps, v: string, action: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
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
            this.set('msgInvalidSubject', '');
            this.set('msgInvalidAttendees', '');
            this.set('msgInvalidDatetime', '');
        }
    }

    @action
    makeRegisterAlternativeWebhookUrl(this: GuidNodeGrdmapps, workflow_description: string) {

        this.set('workflowDescription', workflow_description);
        this.set('showRegisterAlternativeWebhookUrl', true);
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeGrdmapps, meetingPk: string, meetingId: string, joinUrl: string, meetingPassword: string, appId: string, subject: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {

        this.set('showUpdateWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
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

    makeWebMeetingAttendee(this: GuidNodeGrdmapps, appName: string, type: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as GrdmappsConfigModel;

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
    makeDeleteDialog(this: GuidNodeGrdmapps, meetingId: string, appId: string, subject: string, startDatetime: string, endDatetime: string) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
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
    makeDetailMeetingDialog(this: GuidNodeGrdmapps, meetingPk: string, meetingId: string, joinUrl: string, appId: string, subject: string, organizer_fullname: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {

        this.set('showDetailWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
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