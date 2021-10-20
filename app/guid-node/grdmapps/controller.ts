import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import DS from 'ember-data';

import Intl from 'ember-intl/services/intl';
import GrdmappsConfigModel from 'ember-osf-web/models/grdmapps-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

import config from 'ember-get-config';
import CurrentUser from 'ember-osf-web/services/current-user';
import moment from 'moment';
import $ from 'jquery';

interface reqBody {
    count: number;
    timestamp: string;
}

interface attendeesInfo {
    name: string;
    email: string;
    nameForApp: string;
    profile: string;
    _id: string;
    is_guest: boolean;
    disabled: boolean;
}

interface institutionUsers {
    fullname: string;
    guid: string;
}

interface attendees {
    fullname: string;
    user_guid: string;
    microsoft_teams_mail: string;
    microsoft_teams_user_name: string;
    webex_meetings_mail: string;
    webex_meetings_display_name: string;
    _id: string;
    is_guest: boolean;
}

interface nodeAppAttendees {
    [fields: string]: attendees;
}

interface microsoftTeamsAttendeeAtCreate {
    emailAddress: { address: string; name: string;};
}

interface microsoftTeamsAttendeeAtUpdate {
    address: string;
    name: string;
}

interface webexMeetingsAttendee {
    email: string;
    displayName: string;
}

interface webexMeetingsCreateInvitee {
    email: string;
    displayName: string;
}

interface payload {
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

const infoGrdmScenarioStarted = 'integromat.info.started';
const infoGrdmScenarioCompleted = 'integromat.info.completed';
const errorWebappsCreateMeeting = 'integromat.error.webappsCreateMeeting';
const errorGrdmRegisterMeeting = 'integromat.error.grdmCreateMeeting';
const errorSlackCreateMeeting = 'integromat.error.slackCreateMeeting';
const errorWebappsUpdateMeeting = 'integromat.error.webappsUpdateMeeting';
const errorWebappsUpdateAttendees = 'integromat.error.webappsUpdateAttendees';
const errorWebappsUpdateAttendeesGrdmMeetingReg = 'integromat.error.webappsUpdateAttendeesGrdmMeeting';
const errorGrdmUpdateMeetingReg = 'integromat.error.grdmUpdateMeeting';
const errorSlackUpdateMeeting = 'integromat.error.slackUpdateMeeting';
const errorWebappsDeleteMeeting = 'integromat.error.webappsDeleteMeeting';
const errorGrdmDeleteMeetingReg = 'integromat.error.grdmDeleteMeeting';
const errorSlackDeleteMeeting = 'integromat.error.slackDeleteMeeting';
const errorScenarioProcessing = 'integromat.error.scenarioProcessing';


const nodeUrl = host + namespace + '/project/' + '{}';
const integromatDir = '/integromat';
const startIntegromatScenarioUrl = nodeUrl + integromatDir + '/start_scenario';
const reqestMessagesUrl = nodeUrl + integromatDir + '/requestNextMessages';
const registerAlternativeWebhookUrl = nodeUrl + integromatDir + '/register_alternative_webhook_url';
const registerWebMeetingAppsEmailUrl = nodeUrl + integromatDir + '/register_web_meeting_apps_email';
const profileUrlBase = host + '/profile/';

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
    showRegisterWebMeetingAppsEmailDialog = false;

    currentTime = new Date();
    start = this.currentTime.setMinutes(Math.round(this.currentTime.getMinutes() / 30) * 30);
    end = this.currentTime.setMinutes((Math.round(this.currentTime.getMinutes() / 30) * 30) + 60);
    defaultStartTime = moment(this.start).format('HH:mm');
    defaultEndTime = moment(this.end).format('HH:mm');

    times = [
        '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
        '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
        '24:00',
    ];

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

    msgInvalidSelectedUser ='';
    msgInvalidGuestUser = '';
    msgErrorEmailVal = '';
    msgInvalidEmail = '';

    guestFullname = '';
    signInAddressOfApp = '';
    usernameOfApp = '';
    userType = '';

    selectedUser : attendeesInfo = {} as attendeesInfo;
    selectedAttendees : attendeesInfo[] = [];
    selectedMicrosoftTeamsAttendees : attendeesInfo[] = [];
    selectedWebexMeetingsAttendees : attendeesInfo[] = [];

    workflowDescription = '';
    alternativeWebhookUrl = '';

    teamsMeetingAttendees : string[] = [];
    notTeamsMeetingAttendees : string[] = [];

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
            .replace(/[A-Z][a-z]/g, function(match) {
                return separator + match;
            })
            .replace(/[A-Z]+$/g, function(match) {
                return separator + match;
            })
            .trim();
    }

    @action
    checkLength(text: string, select: any) {
        if (select.searchText.length >= 3 && text.length < 3) {
            return '';
        } else {
            return text.length >= 3;
        }
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
        this.save();
    }

    @action
    setWorkflow(this: GuidNodeGrdmapps, workflow_desp: string) {
        const workflowType = workflow_desp.split('.')[2];

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const workflows = JSON.parse(config.workflows);
        const nodeWorkflows = JSON.parse(config.nodeWorkflows);

        let workflowId = '';
        let url = '';

        for (let i = 0; i < workflows.length; i++) {
            if (workflows[i].fields.workflow_description === workflow_desp) {
                workflowId = workflows[i].pk;
                for (let j = 0; j < nodeWorkflows.length; j++) {
                    if (nodeWorkflows[j].fields.workflow === workflowId) {
                        if (!nodeWorkflows[j].fields.scenarios) {
                            url = nodeWorkflows[j].fields.alternative_webhook_url;
                        }
                    }
                }
            }
        }

        this.set('webhookUrl', url);

        if (workflowType === 'web_meeting') {
            this.set('showWorkflows', false);
            this.set('showWebMeetingWorkflow', true);
        }
    }

    @action
    setWebMeetingApp(this: GuidNodeGrdmapps, v: string, actionType: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        let appNameDisp = '';

        if (v === config.appNameMicrosoftTeams) {
            if (actionType === 'create') {
                this.set('showCreateMicrosoftTeamsMeetingDialog', true);
                this.set('showCreateWebexMeetingDialog', false);
            } else if (actionType === 'update') {
                this.set('showUpdateMicrosoftTeamsMeetingDialog', true);
                this.set('showUpdateWebexMeetingsDialog', false);
            }
            appNameDisp = this.camel2space(v);
            this.set('webMeetingAppName', v);
            this.set('webMeetingAppNameDisp', appNameDisp);
        } else if (v === config.appNameWebexMeetings) {
            if (actionType === 'create') {
                this.set('showCreateMicrosoftTeamsMeetingDialog', false);
                this.set('showCreateWebexMeetingDialog', true);
            } else if (actionType === 'update') {
                this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
                this.set('showUpdateWebexMeetingsDialog', true);
            }
            appNameDisp = this.camel2space(v);
            this.set('webMeetingAppName', v);
            this.set('webMeetingAppNameDisp', appNameDisp);
        } else if (!v && !actionType) {
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
            this.set('webMeetingAttendees', []);
            this.set('selectedAttendees', []);
            this.set('selectedMicrosoftTeamsAttendees', []);
            this.set('selectedWebexMeetingsAttendees', []);
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

    resetValue(this: GuidNodeGrdmapps, type: string) {
        if (type === 'registerAppsEmail') {
            this.set('selectedUser', {});
            this.set('guestFullname', '');
            this.set('userType', '');
            this.set('signInAddressOfApp', '');
            this.set('usernameOfApp', '');
            this.set('showRegisterWebMeetingAppsEmailDialog', false);
            this.set('msgInvalidSelectedUser', '');
            this.set('msgInvalidGuestUser', '');
            this.set('msgErrorEmailVal', '');
            this.set('msgInvalidEmail', '');
        } else if (type === 'registerWebhook') {
            this.set('workflowDescription', '');
            this.set('alternativeWebhookUrl', '');
            this.set('showRegisterAlternativeWebhookUrl', false);
        }
    }

    @action
    webhookValidationCheck(this: GuidNodeGrdmapps, webhook_url: string) {
        let validFlag = true;
        if (!webhook_url) {
            this.set(
                'msgInvalidWebhookUrl',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty', 
                    { item: this.intl.t('integromat.workflows.alternative_webhook_url.label') },
                ),
            );
            validFlag = false;
        } else {
            this.set('msgInvalidWebhookUrl', '');
        }

        return validFlag;
    }

    @action
    makeRegisterAlternativeWebhookUrl(this: GuidNodeGrdmapps, workflow_description: string) {
        this.set('workflowDescription', workflow_description);
        this.set('showRegisterAlternativeWebhookUrl', true);
    }

    @action
    registerAlternativeWebhook(this: GuidNodeGrdmapps) {
        const headers = this.currentUser.ajaxHeaders();
        const url = registerAlternativeWebhookUrl.replace('{}', String(this.model.guid));

        // validation check for webhook url input
        if (!this.webhookValidationCheck(this.alternativeWebhookUrl)) {
            return;
        }

        const payload = {
            workflowDescription: this.workflowDescription,
            alternativeWebhookUrl: this.alternativeWebhookUrl,
        };

        this.resetValue('registerWebhook');

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            },
        )
            .then((res) => {
                if (!res.ok) {
                    this.toast.error(this.intl.t('integromat.fail.registerAlternativeWebhookUrl'));
                    return;
                }
                this.save();
                this.toast.info(this.intl.t('integromat.success.registerAlternativeWebhookUrl'));
            })
            .catch(() => {
                this.toast.error(this.intl.t('integromat.error.failedToRequest'));
            });
    }
    @action
    webMeetingAppsEmailValidationCheck(this: GuidNodeGrdmapps, userType: string, selectedUser: attendeesInfo, guestFullname: string, email: string) {
        let validFlag = true;
        // let reg = new RegExp();

        if (userType === 'radio_grdmUserOrRegisteredGuest') {
            if (!selectedUser) {
                this.set(
                    'msgInvalidSelectedUser',
                    this.intl.t(
                        'integromat.meetingDialog.invalid.empty',
                        { item: this.intl.t('integromat.grdmUser') },
                    ),
                );
                validFlag = false;
            }
        } else if (userType === 'radio_newGuest') {
            if (!guestFullname) {
                this.set(
                    'msgInvalidGuestUser',
                    this.intl.t(
                        'integromat.meetingDialog.invalid.empty',
                        { item: this.intl.t('integromat.guest') },
                    ),
                );
                validFlag = false;
            }
        } else if (!userType) {
            this.set('msgErrorEmailVal', this.intl.t('integromat.failed_to_save'));
            validFlag = false;
        }

        if (!email) {
            this.set('msgInvalidEmail',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty',
                    { item: this.intl.t('integromat.signInAdress') },
                ),
            );
            validFlag = false;
        }
        // else if(!(reg.test(email))){
        // this.set('msgInvalidEmail', this.intl.t('integromat.meetingDialog.invalid.invalid', {item: this.intl.t('integromat.signInAdress')}));
        // validFlag = false;
        // }

        return validFlag;
    }

    @action
    setUserType(this: GuidNodeGrdmapps, userType: string) {
        this.set('userType', userType);
    }

    @action
    registerWebMeetingAppsEmail(this: GuidNodeGrdmapps) {
        const headers = this.currentUser.ajaxHeaders();
        const url = registerWebMeetingAppsEmailUrl.replace('{}', String(this.model.guid));
        const selectedUser = this.selectedUser;
        const guestFullname = this.guestFullname;
        const userType = this.userType;
        let _id = null;
        let guid = null;
        let fullname = '';
        let is_guest = false;

        // validation check
        if (!this.webMeetingAppsEmailValidationCheck(userType, selectedUser, guestFullname, this.signInAddressOfApp)) {
            return;
        }

        if (userType === 'radio_grdmUserOrRegisteredGuest') {
            if (this.selectedUser._id) {
                _id = this.selectedUser._id;
            }

            if (selectedUser.is_guest) {
                is_guest = true;
            } else {
                const index = (selectedUser.name).indexOf('@') + 1;
                guid = (selectedUser.name).slice(index, index + 5);
            }
        } else if (userType === 'radio_newGuest') {
            guid = 'guest' + (new Date()).getTime();
            fullname = guestFullname;
            is_guest = true;
        }

        const payload = {
            _id,
            guid,
            fullname,
            appName: this.webMeetingAppName,
            email: this.signInAddressOfApp,
            username: this.usernameOfApp,
            is_guest: is_guest,
        };

        this.resetValue('registerAppsEmail');

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            },
        )
            .then((res) => {
                if (!res.ok) {
                    this.toast.error(
                        this.intl.t('integromat.fail.registerWebMeetingAppsEmail', { appName: this.webMeetingAppName }),
                    );
                    return;
                }
                this.save();
                this.toast.info(
                    this.intl.t('integromat.success.registerWebMeetingAppsEmail', { appName: this.webMeetingAppName }),
                );
            })
            .catch(() => {
                this.toast.error(this.intl.t('integromat.error.failedToRequest'));
            });
    }

    @action
    webMeetingvalidationCheck(this: GuidNodeGrdmapps, subject: string, attendeesNum: number, startDate: string, startTime: string, endDate: string, endTime: string, startDatetime: string, endDatetime: string) {
        const now = new Date();
        const start = new Date(startDatetime);
        const end = new Date(endDatetime);

        let validFlag = true;

        if (!subject) {
            this.set(
                'msgInvalidSubject',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty',
                    { item: this.intl.t('integromat.subject') },
                ),
            );
            validFlag = false;
        } else {
            this.set('msgInvalidSubject', '');
        }

        if (!attendeesNum) {
            this.set(
                'msgInvalidAttendees',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty',
                    { item: this.intl.t('integromat.attendees') },
                ),
            );
            validFlag = false;
        } else {
            this.set('msgInvalidAttendees', '');
        }

        if (!startDate || !startTime || !endDate || !endTime) {
            this.set(
                'msgInvalidDatetime',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty',
                    { item: this.intl.t('integromat.datetime') },
                ),
            );
            validFlag = false;
        } else if (start < now) {
            this.set('msgInvalidDatetime', this.intl.t('integromat.meetingDialog.invalid.datetime.past'));
            validFlag = false;
        } else if (end < start) {
            this.set('msgInvalidDatetime', this.intl.t('integromat.meetingDialog.invalid.datetime.endBeforeStart'));
            validFlag = false;
        } else {
            this.set('msgInvalidDatetime', '');
        }
        return validFlag;
    }

    @action
    createWebMeeting(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingSubject;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTime = (
            <HTMLInputElement>document.querySelectorAll('select[id=create_teams_start_time]')[0]
        ).value;
        const strWebMeetingStartDatetime = webMeetingStartDate + ' ' + webMeetingStartTime;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTime = (
            <HTMLInputElement>document.querySelectorAll('select[id=create_teams_end_time]')[0]
        ).value;
        const strWebMeetingEndDatetime = webMeetingEndDate + ' ' + webMeetingEndTime;
        const webMeetingLocation = this.webMeetingLocation;
        const webMeetingContent = this.webMeetingContent;
        const empty = '';
        const timestamp = new Date().getTime();

        let workflowAction = '';
        const microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];
        const arrayAttendees = [];

        const webexMeetingsCreateInvitees: webexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds: string[] = [];

        let attendeeNum = 0;

        let selectedAttendees : attendeesInfo[] = [];

        if (this.webMeetingAppName === config.appNameMicrosoftTeams) {
            selectedAttendees = this.selectedMicrosoftTeamsAttendees;
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === config.appNameWebexMeetings) {
            selectedAttendees = this.selectedWebexMeetingsAttendees;
            attendeeNum = selectedAttendees.length;
        }
        // validation check for input
        if (!this.webMeetingvalidationCheck(
            webMeetingSubject, attendeeNum,
            this.webMeetingStartDate,
            webMeetingStartTime,
            this.webMeetingEndDate,
            webMeetingEndTime,
            strWebMeetingStartDatetime,
            strWebMeetingEndDatetime,
        )) {
            return;
        }

        // make attendees format
        if (this.webMeetingAppName === config.appNameMicrosoftTeams) {
            workflowAction = 'createMicrosoftTeamsMeeting';
            for (let i = 0; i < selectedAttendees.length; i++) { 
                microsoftTeamsAttendeesCollectionAtCreate.push(
                    { 
                        emailAddress: {
                            address: selectedAttendees[i].email,
                            name: selectedAttendees[i].nameForApp ? selectedAttendees[i].nameForApp : 'Unregistered',
                        },
                    },
                );
                arrayAttendees.push(selectedAttendees[i].email);
            }
        } else if (this.webMeetingAppName === config.appNameWebexMeetings) {
            workflowAction = 'createWebexMeetings';

            for (let i = 0; i < selectedAttendees.length; i++) {
                webexMeetingsAttendeesCollection.push(
                    {
                        email: selectedAttendees[i].email,
                        displayName: selectedAttendees[i].nameForApp,
                    },
                );
                arrayAttendees.push(selectedAttendees[i].email);
            }
        }

        const webMeetingStartDatetime = (new Date(strWebMeetingStartDatetime)).toISOString();
        const webMeetingEndDatetime = (new Date(strWebMeetingEndDatetime)).toISOString();

        const payload = {
            appName,
            appNameDisp,
            guid,
            meetingId: empty,
            joinUrl: empty,
            action: workflowAction,
            info: {
                grdmScenarioStarted: infoGrdmScenarioStarted,
                grdmScenarioCompleted: infoGrdmScenarioCompleted,
            },
            error: {
                webappsCreateMeeting: errorWebappsCreateMeeting,
                grdmRegisterMeeting: errorGrdmRegisterMeeting,
                slackCreateMeeting: errorSlackCreateMeeting,
                webappsUpdateMeeting: errorWebappsUpdateMeeting,
                webappsUpdateAttendees: errorWebappsUpdateAttendees,
                webappsUpdateAttendeesGrdmMeetingReg : errorWebappsUpdateAttendeesGrdmMeetingReg,
                grdmUpdateMeetingReg: errorGrdmUpdateMeetingReg,
                slackUpdateMeeting: errorSlackUpdateMeeting,
                webappsDeleteMeeting: errorWebappsDeleteMeeting,
                grdmDeleteMeetingReg: errorGrdmDeleteMeetingReg,
                slackDeleteMeeting: errorSlackDeleteMeeting,
                scenarioProcessing: errorScenarioProcessing,
            },
            startDatetime: webMeetingStartDatetime,
            endDatetime: webMeetingEndDatetime,
            subject: webMeetingSubject,
            microsoftTeamsAttendeesCollectionAtCreate,
            microsoftTeamsAttendeesCollectionAtUpdate,
            webexMeetingsAttendeesCollection,
            webexMeetingsCreateInvitees,
            webexMeetingsDeleteInviteeIds,
            attendees: arrayAttendees,
            location: webMeetingLocation,
            content: webMeetingContent,
            webhook_url: webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appNameDisp);
    }

    @action
    makeUpdateMeetingDialog(this: GuidNodeGrdmapps, meetingPk: string, meetingId: string, joinUrl: string, meetingPassword: string, appId: string, subject: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(config.webMeetingApps);

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

        for (let i = 0; i < webMeetingApps.length; i++) {
            if (webMeetingApps[i].pk === appId) {
                appName = webMeetingApps[i].fields.app_name;
                break;
            }
        }

        this.setWebMeetingApp(appName, 'update');
        this.makeWebMeetingAttendee(appName, 'update');

        this.set('showUpdateWebMeetingDialog', true);
    }

    makeWebMeetingAttendee(this: GuidNodeGrdmapps, appName: string, type: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeAttendeesAll = JSON.parse(config.nodeAttendeesAll);

        let guidOrEmail = '';
        let profileUrl = '';
        let isGuest = false;
        let microsoftTeamsMail, webexMeetingsMail;
        let userGuid = '';

        if (appName === config.appNameMicrosoftTeams) {
            for (let i = 0; i < this.webMeetingAttendees.length; i++) {
                for (let j = 0; j < nodeAttendeesAll.length; j++) {
                    if (type === 'update' && !(nodeAttendeesAll[j].fields.microsoft_teams_mail)) {
                        continue;
                    }
                    if (this.webMeetingAttendees[i] === nodeAttendeesAll[j].pk) {
                        isGuest = nodeAttendeesAll[j].fields.is_guest;
                        microsoftTeamsMail = nodeAttendeesAll[j].fields.microsoft_teams_mail;
                        userGuid = nodeAttendeesAll[j].fields.user_guid;

                        guidOrEmail = isGuest ? '(' + microsoftTeamsMail + ')' : '@' + userGuid;
                        profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                        this.selectedAttendees.push(
                            {
                                name: nodeAttendeesAll[j].fields.fullname + guidOrEmail,
                                email: nodeAttendeesAll[j].fields.microsoft_teams_mail,
                                nameForApp: nodeAttendeesAll[j].fields.microsoft_teams_user_name,
                                profile: profileUrl, _id: nodeAttendeesAll[j].fields._id,
                                is_guest: nodeAttendeesAll[j].fields.is_guest,
                                disabled: false,
                            },
                        );
                    }
                }
            }
        } else if (appName === config.appNameWebexMeetings) {
            for (let i = 0; i < this.webMeetingAttendees.length; i++) {
                for (let j = 0; j < nodeAttendeesAll.length; j++) {
                    if (type === 'update' && !(nodeAttendeesAll[j].fields.webex_meetings_mail)) {
                        continue;
                    }
                    if (this.webMeetingAttendees[i] === nodeAttendeesAll[j].pk) {
                        isGuest = nodeAttendeesAll[j].fields.is_guest;
                        webexMeetingsMail = nodeAttendeesAll[j].fields.webex_meetings_mail;
                        userGuid = nodeAttendeesAll[j].fields.user_guid;

                        guidOrEmail = isGuest ? '(' + webexMeetingsMail + ')' : '@' + userGuid;
                        profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                        this.selectedAttendees.push(
                            {
                                name: nodeAttendeesAll[j].fields.fullname + guidOrEmail,
                                email: nodeAttendeesAll[j].fields.webex_meetings_mail,
                                nameForApp: nodeAttendeesAll[j].fields.webex_meetings_display_name,
                                profile: profileUrl,
                                _id: nodeAttendeesAll[j].fields._id,
                                is_guest: nodeAttendeesAll[j].fields.is_guest,
                                disabled: false,
                            },
                        );
                    }
                }
            }
        }
    }

    @action
    setDefaultDate(this: GuidNodeGrdmapps) {
        (<any>$('#update_start_date')[0]).value = this.webMeetingStartDate;
        (<any>$('#update_end_date')[0]).value = this.webMeetingEndDate;
    }

    @action
    updateWebMeeting(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const config = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingSubject;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTime = (
            <HTMLInputElement>document.querySelectorAll('select[id=update_start_time]')[0]
        ).value;
        const strWebMeetingStartDatetime = webMeetingStartDate + ' ' + webMeetingStartTime;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTime = (
            <HTMLInputElement>document.querySelectorAll('select[id=update_end_time]')[0]
        ).value;
        const strWebMeetingEndDatetime = webMeetingEndDate + ' ' + webMeetingEndTime;
        const webMeetingLocation = this.webMeetingLocation;
        const webMeetingContent = this.webMeetingContent;
        const webMeetingId = this.webMeetingUpdateMeetingId;
        const webMeetingJoinUrl = this.webMeetingJoinUrl;
        const webMeetingPassword = this.webMeetingPassword;
        const timestamp = new Date().getTime();

        const nodeWebMeetingAttendeesRelation = JSON.parse(config.nodeWebMeetingsAttendeesRelation);
        const nodeWebexMeetingsAttendees = JSON.parse(config.nodeWebexMeetingsAttendees);

        let workflowAction = '';
        const microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];
        const arrayAttendees = [];
        const arrayAttendeePks: string[] = [];

        let arrayCreateAttendeePks = [];
        let arrayDeleteAttendeePks = [];
        const webexMeetingsCreateInvitees: webexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds: string[] = [];

        let attendeeNum = 0;

        const selectedAttendees = this.selectedAttendees;

        if (this.webMeetingAppName === config.appNameMicrosoftTeams) {
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === config.appNameWebexMeetings) {
            attendeeNum = selectedAttendees.length;
        }
        //validation check for input
        if (!this.webMeetingvalidationCheck(webMeetingSubject, attendeeNum, this.webMeetingStartDate, webMeetingStartTime, this.webMeetingEndDate, webMeetingEndTime, strWebMeetingStartDatetime, strWebMeetingEndDatetime)) {
            return;
        }
        //make attendees format
        if (appName === config.appNameMicrosoftTeams) {
            workflowAction = 'updateMicrosoftTeamsMeeting';

            for (let i = 0; i < selectedAttendees.length; i++) { 
                microsoftTeamsAttendeesCollectionAtUpdate.push(
                    {
                        address: selectedAttendees[i].email,
                        name: selectedAttendees[i].nameForApp ? selectedAttendees[i].nameForApp : 'Unregistered',
                    },
                );
                arrayAttendees.push(selectedAttendees[i].email);
            }
        } else if (appName === config.appNameWebexMeetings) {
            workflowAction = 'updateWebexMeetings';

            for (let i = 0; i < selectedAttendees.length; i++) {
                arrayAttendees.push(selectedAttendees[i].email);

                for (let j = 0; j < nodeWebexMeetingsAttendees.length; j++) {
                    if (selectedAttendees[i].email === nodeWebexMeetingsAttendees[j].fields.webex_meetings_mail) {
                        arrayAttendeePks.push(nodeWebexMeetingsAttendees[j].pk);
                    }
                }
            }

            arrayCreateAttendeePks = arrayAttendeePks.filter(i => (this.webMeetingAttendees).indexOf(i) === -1);
            arrayDeleteAttendeePks = (this.webMeetingAttendees).filter(i => arrayAttendeePks.indexOf(i) === -1);

            for (let i = 0; i < arrayCreateAttendeePks.length; i++) {
                for (let j = 0; j < nodeWebexMeetingsAttendees.length; j++) {
                    if (arrayCreateAttendeePks[i] === nodeWebexMeetingsAttendees[j].pk) {
                        webexMeetingsCreateInvitees.push(
                            {
                                email: nodeWebexMeetingsAttendees[j].fields.webex_meetings_mail,
                                displayName: nodeWebexMeetingsAttendees[j].fields.webex_meetings_display_name,
                            },
                        );
                    }
                }
            }

            for (let i = 0; i < arrayDeleteAttendeePks.length; i++) {
                for (let j = 0; j < nodeWebMeetingAttendeesRelation.length; j++) {
                    if (this.webMeetingPk === nodeWebMeetingAttendeesRelation[j].fields.all_meeting_information) {
                        if (arrayDeleteAttendeePks[i] === nodeWebMeetingAttendeesRelation[j].fields.attendees) {
                            webexMeetingsDeleteInviteeIds.push(
                                nodeWebMeetingAttendeesRelation[j].fields.webex_meetings_invitee_id,
                            );
                        }
                    }
                }
            }
        }

        const webMeetingStartDatetime = (new Date(strWebMeetingStartDatetime)).toISOString();
        const webMeetingEndDatetime = (new Date(strWebMeetingEndDatetime)).toISOString();

        const payload = {
            appName,
            appNameDisp,
            guid,
            meetingId: webMeetingId,
            joinUrl: webMeetingJoinUrl,
            action: workflowAction,
            info: {
                grdmScenarioStarted: infoGrdmScenarioStarted,
                grdmScenarioCompleted: infoGrdmScenarioCompleted,
            },
            error: {
                webappsCreateMeeting: errorWebappsCreateMeeting,
                grdmRegisterMeeting: errorGrdmRegisterMeeting,
                slackCreateMeeting: errorSlackCreateMeeting,
                webappsUpdateMeeting: errorWebappsUpdateMeeting,
                webappsUpdateAttendees: errorWebappsUpdateAttendees,
                webappsUpdateAttendeesGrdmMeetingReg : errorWebappsUpdateAttendeesGrdmMeetingReg,
                grdmUpdateMeetingReg: errorGrdmUpdateMeetingReg,
                slackUpdateMeeting: errorSlackUpdateMeeting,
                webappsDeleteMeeting: errorWebappsDeleteMeeting,
                grdmDeleteMeetingReg: errorGrdmDeleteMeetingReg,
                slackDeleteMeeting: errorSlackDeleteMeeting,
                scenarioProcessing: errorScenarioProcessing,
            },
            startDatetime: webMeetingStartDatetime,
            endDatetime: webMeetingEndDatetime,
            subject: webMeetingSubject,
            microsoftTeamsAttendeesCollectionAtCreate,
            microsoftTeamsAttendeesCollectionAtUpdate,
            webexMeetingsAttendeesCollection,
            webexMeetingsCreateInvitees,
            webexMeetingsDeleteInviteeIds,
            attendees: arrayAttendees,
            location: webMeetingLocation,
            content: webMeetingContent,
            password: webMeetingPassword,
            webhook_url: webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appName);
    }

    @action
    makeDeleteDialog(this: GuidNodeGrdmapps, meetingId: string, appId: string, subject: string, startDatetime: string, endDatetime: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(config.webMeetingApps);
        let appName = '';

        for (let i = 0; i < webMeetingApps.length; i++) {
            if (webMeetingApps[i].pk === appId) {
                appName = webMeetingApps[i].fields.app_name;
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
    deleteWebMeeting(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingDeleteSubject;
        const strWebMeetingStartDatetime = this.webMeetingDeleteStartDate + ' ' + this.webMeetingDeleteStartTime;
        const strWebMeetingEndDatetime = this.webMeetingDeleteEndDate + ' ' + this.webMeetingDeleteEndTime;
        const timestamp = new Date().getTime();

        const empty = '';
        const emptyList : string[] = [];
        const microsoftTeamsAttendeesCollectionAtCreate: microsoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: microsoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: webexMeetingsAttendee[] = [];

        const webexMeetingsCreateInvitees : webexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds : string[] = [];

        let workflowAction = '';

        if (this.webMeetingAppName === config.appNameMicrosoftTeams) {
            workflowAction = 'deleteMicrosoftTeamsMeeting';
        } else if (this.webMeetingAppName === config.appNameWebexMeetings) {
            workflowAction = 'deleteWebexMeetings';
        }

        const webMeetingStartDatetime = (new Date(strWebMeetingStartDatetime)).toISOString();
        const webMeetingEndDatetime = (new Date(strWebMeetingEndDatetime)).toISOString();

        const payload = {
            appName,
            appNameDisp,
            guid,
            meetingId: this.webMeetingDeleteMeetingId,
            joinUrl: empty,
            action: workflowAction,
            info: {
                grdmScenarioStarted: infoGrdmScenarioStarted,
                grdmScenarioCompleted: infoGrdmScenarioCompleted,
            },
            error: {
                webappsCreateMeeting: errorWebappsCreateMeeting,
                grdmRegisterMeeting: errorGrdmRegisterMeeting,
                slackCreateMeeting: errorSlackCreateMeeting,
                webappsUpdateMeeting: errorWebappsUpdateMeeting,
                webappsUpdateAttendees: errorWebappsUpdateAttendees,
                webappsUpdateAttendeesGrdmMeetingReg : errorWebappsUpdateAttendeesGrdmMeetingReg,
                grdmUpdateMeetingReg: errorGrdmUpdateMeetingReg,
                slackUpdateMeeting: errorSlackUpdateMeeting,
                webappsDeleteMeeting: errorWebappsDeleteMeeting,
                grdmDeleteMeetingReg: errorGrdmDeleteMeetingReg,
                slackDeleteMeeting: errorSlackDeleteMeeting,
                scenarioProcessing: errorScenarioProcessing,
            },
            startDatetime: webMeetingStartDatetime,
            endDatetime: webMeetingEndDatetime,
            subject: webMeetingSubject,
            microsoftTeamsAttendeesCollectionAtCreate,
            microsoftTeamsAttendeesCollectionAtUpdate,
            webexMeetingsAttendeesCollection,
            webexMeetingsCreateInvitees,
            webexMeetingsDeleteInviteeIds,
            attendees: emptyList,
            location: empty,
            content: empty,
            webhook_url: webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        return this.reqLaunch(startIntegromatScenarioUrl, payload, appNameDisp);
    }

    @action
    makeDetailMeetingDialog(this: GuidNodeGrdmapps, meetingPk: string, meetingId: string, joinUrl: string, appId: string, subject: string, organizer_fullname: string, attendees:string[], startDatetime: string, endDatetime: string, location: string, content: string) {
        this.set('showDetailWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(config.webMeetingApps);

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

        for (let i = 0; i < webMeetingApps.length; i++) {
            if (webMeetingApps[i].pk === appId) {
                appName = webMeetingApps[i].fields.app_name;
                break;
            }
        }

        this.setWebMeetingApp(appName, 'detail');
        this.makeWebMeetingAttendee(appName, 'detail');
    }

    reqLaunch(url: string, payload: payload, appName: string) {
        this.toast.info(this.intl.t('integromat.info.launch'));
        const headers = this.currentUser.ajaxHeaders();
        url = startIntegromatScenarioUrl.replace('{}', String(this.model.guid));

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            })
            .then(res => {
                if (!res.ok) {
                    this.toast.error(this.intl.t('integromat.error.failedToRequest'));
                    return;
                }
                return res.json();
            })
            .then(data => {
                const reqBody = {
                    count: 1,
                    timestamp: data.timestamp,
                };
                this.reqMessage(reqestMessagesUrl, reqBody, appName);
            })
            .catch(() => {
                this.toast.error(this.intl.t('integromat.error.failedToRequest'));
            });
    }

    reqMessage(url: string, reqBody: reqBody, appName: string) {
        const headers = this.currentUser.ajaxHeaders();
        url = reqestMessagesUrl.replace('{}', String(this.model.guid));

        return fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(reqBody),
            })
            .then(res => {
                if (!res.ok) {
                    this.toast.error(this.intl.t('integromat.error.failedToGetMessage'));
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (data.integromatMsg === 'integromat.info.completed') {
                    this.toast.info(this.intl.t(data.integromatMsg));
                    this.save();
                } else if (data.integromatMsg.match('.error.')) {
                    this.toast.error(this.intl.t(data.integromatMsg, { appName: appName }));
                    this.save();
                } else {
                    if (data.notify) {
                        this.toast.info(this.intl.t(data.integromatMsg));
                    }
                    const reqBody = {
                        count: data.count + 1,
                        timestamp: data.timestamp,
                    };
                    if (reqBody.count < TIME_LIMIT_EXECUTION_SCENARIO + 1) {
                        this.reqMessage(url, reqBody, appName);
                    }
                }
            })
            .catch(() => {
                this.toast.error(this.intl.t('integromat.error.failedToGetMessage'));
            });
    }

    @computed('config.allWebMeetings')
    get allWebMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const allWebMeetings = JSON.parse(config.allWebMeetings);
        return allWebMeetings;
    }

    @computed('config.upcomingWebMeetings')
    get upcomingWebMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const upcomingWebMeetings = JSON.parse(config.upcomingWebMeetings);
        const webMeetingApps = JSON.parse(config.webMeetingApps);

        let previousDatetime;
        let pYear, pMonth, pDate;
        let currentDatetime;
        let cYear, cMonth, cDate;
        let previousDate = '';
        let currentDate = '';

        for (let i = 0; i < upcomingWebMeetings.length; i++) {
            // for display App Name on meeting list
            for (let j = 0; j < webMeetingApps.length; j++) {
                if (upcomingWebMeetings[i].fields.app === webMeetingApps[j].pk) {
                    upcomingWebMeetings[i]['app_name_disp'] = this.camel2space(webMeetingApps[j].fields.app_name);
                    break;
                }
            }

            //for display Date Bar
            if (i === 0) {
                upcomingWebMeetings[i]['date_bar'] = false;
            } else if (i !== 0) {
                previousDatetime = new Date(upcomingWebMeetings[i - 1].fields.start_datetime);
                pYear = previousDatetime.getFullYear();
                pMonth = previousDatetime.getMonth() + 1;
                pDate = previousDatetime.getDate()
                currentDatetime = new Date(upcomingWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                previousDate = pYear + '/' + pMonth + '/' + pDate;
                currentDate = cYear + '/' + cMonth + '/' + cDate;

                if (currentDate !== previousDate) {
                    upcomingWebMeetings[i]['date_bar'] = true;
                } else {
                    upcomingWebMeetings[i]['date_bar'] = false;
                }
            }
        }
        return upcomingWebMeetings;
    }

    @computed('config.previousWebMeetings')
    get previousWebMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const previousWebMeetings = JSON.parse(config.previousWebMeetings);
        const webMeetingApps = JSON.parse(config.webMeetingApps);

        let currentDatetime;
        let cYear, cMonth, cDate;
        let nextDatetime;
        let nYear, nMonth, nDate;
        let nextDate = '';
        let currentDate = '';

        for (let i = 0; i < previousWebMeetings.length; i++) {
            // for display App Name on meeting list
            for (let j = 0; j < webMeetingApps.length; j++) {
                if (previousWebMeetings[i].fields.app === webMeetingApps[j].pk) {
                    previousWebMeetings[i]['app_name_disp'] = this.camel2space(webMeetingApps[j].fields.app_name);
                    break;
                }
            }

            if (i === 0) {
                previousWebMeetings[i]['date_bar'] = false;
            } else if (i !== 0) {
                nextDatetime = new Date(previousWebMeetings[i - 1].fields.start_datetime);
                nYear = nextDatetime.getFullYear();
                nMonth = nextDatetime.getMonth() + 1;
                nDate = nextDatetime.getDate();
                currentDatetime = new Date(previousWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                nextDate = nYear + '/' + nMonth + '/' + nDate;
                currentDate = cYear + '/' + cMonth + '/' + cDate;

                if (currentDate !== nextDate) {
                    previousWebMeetings[i]['date_bar'] = true;
                } else {
                    previousWebMeetings[i]['date_bar'] = false;
                }
            }
        }

        return previousWebMeetings;
    }

    @computed('config.nodeAttendeesAll')
    get nodeAttendeesAll() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeAttendeesAll = JSON.parse(config.nodeAttendeesAll);
        return nodeAttendeesAll;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get nodeMicrosoftTeamsAttendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(config.nodeMicrosoftTeamsAttendees);
        return nodeMicrosoftTeamsAttendees;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get nodeWebexMeetingsAttendees() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(config.nodeWebexMeetingsAttendees);
        return nodeWebexMeetingsAttendees;
    }

    @computed('config.institutionUsers')
    get institutionUsers() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const institutionUsers = JSON.parse(config.institutionUsers);
        const attendeesInfo : attendeesInfo[] = [];

        for (let i = 0; i < institutionUsers.length; i++) {
            attendeesInfo.push(
                {
                    name: institutionUsers[i].fullname + '@' + institutionUsers[i].guid, email: '',
                    nameForApp: '',
                    profile: '',
                    _id: '',
                    is_guest: false,
                    disabled: true,
                },
            );
        }

        return institutionUsers;
    }

    makeInstitutionUserList(this: GuidNodeGrdmapps, node_app_attendees: nodeAppAttendees[], institutionUsers: institutionUsers[], suggestion_disabled: boolean, appName: string) {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;

        let institutionUserList : attendeesInfo[] = [];
        const registeredIstitutionUsers : attendeesInfo[] = [];
        const unregisteredIstitutionUsers : attendeesInfo[] = [];
        const guestUsers : attendeesInfo[] = [];

        for (let i = 0; i < institutionUsers.length; i++) {
            unregisteredIstitutionUsers.push(
                {
                    name: institutionUsers[i].fullname + '@' + institutionUsers[i].guid + this.intl.t('integromat.meetingDialog.unregisteredLabel'),
                    email: '',
                    nameForApp: '',
                    profile: profileUrlBase + institutionUsers[i].guid,
                    _id: '',
                    is_guest: false,
                    disabled: suggestion_disabled,
                },
            );

            for (let j = 0; j < node_app_attendees.length; j++) {
                if (institutionUsers[i].guid === node_app_attendees[j].fields.user_guid) {
                    if (appName === config.appNameMicrosoftTeams) {
                        registeredIstitutionUsers.push(
                            {
                                name: node_app_attendees[j].fields.fullname + '@' + node_app_attendees[j].fields.user_guid,
                                email: node_app_attendees[j].fields.microsoft_teams_mail,
                                nameForApp: node_app_attendees[j].fields.microsoft_teams_user_name,
                                profile: profileUrlBase + node_app_attendees[j].fields.user_guid,
                                _id: node_app_attendees[j].fields._id,
                                is_guest: false,
                                disabled: false,
                            },
                        );
                    } else if (appName === config.appNameWebexMeetings) {
                        registeredIstitutionUsers.push(
                            {
                                name: node_app_attendees[j].fields.fullname + '@' + node_app_attendees[j].fields.user_guid,
                                email: node_app_attendees[j].fields.webex_meetings_mail,
                                nameForApp: node_app_attendees[j].fields.webex_meetings_display_name,
                                profile: profileUrlBase + node_app_attendees[j].fields.user_guid,
                                _id: node_app_attendees[j].fields._id,
                                is_guest: false,
                                disabled: false,
                            },
                        );
                    }

                    unregisteredIstitutionUsers.pop();
                }
                if (i === 0) {
                    if (node_app_attendees[j].fields.is_guest) {
                        if (appName === config.appNameMicrosoftTeams) {
                            guestUsers.push(
                                {
                                    name: node_app_attendees[j].fields.fullname + '(' + node_app_attendees[j].fields.microsoft_teams_mail + ')',
                                    email: node_app_attendees[j].fields.microsoft_teams_mail,
                                    nameForApp: node_app_attendees[j].fields.microsoft_teams_user_name,
                                    profile: '',
                                    _id: node_app_attendees[j].fields._id,
                                    is_guest: true,
                                    disabled: false,
                                 },
                            );
                        } else if (appName === config.appNameWebexMeetings) {
                            guestUsers.push(
                                {
                                    name: node_app_attendees[j].fields.fullname + '(' + node_app_attendees[j].fields.webex_meetings_mail + ')',
                                    email: node_app_attendees[j].fields.webex_meetings_mail,
                                    nameForApp: node_app_attendees[j].fields.webex_meetings_display_name,
                                    profile: '',
                                    _id: node_app_attendees[j].fields._id,
                                    is_guest: true,
                                    disabled: false,
                                },
                            );
                        }
                    }
                }
            }
        }

        institutionUserList = institutionUserList.concat(registeredIstitutionUsers);
        institutionUserList = institutionUserList.concat(guestUsers);
        institutionUserList = institutionUserList.concat(unregisteredIstitutionUsers);

        return institutionUserList;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(config.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(config.institutionUsers);
        const app_name = config.appNameMicrosoftTeams;

        const institutionMicrosoftTeamsUsers = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            true,
            app_name,
        );

        return institutionMicrosoftTeamsUsers;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersListMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(config.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(config.institutionUsers);
        const app_name = config.appNameMicrosoftTeams;

        const institutionMicrosoftTeamsUsers = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            false,
            app_name,
        );

        return institutionMicrosoftTeamsUsers;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(config.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(config.institutionUsers);
        const app_name = config.appNameWebexMeetings;

        const institutionWebexMeetingsUsers = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            true,
            app_name,
        );

        return institutionWebexMeetingsUsers;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersListWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(config.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(config.institutionUsers);
        const app_name = config.appNameWebexMeetings;

        const institutionWebexMeetingsUsers = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            false,
            app_name,
        );

        return institutionWebexMeetingsUsers;
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

    @computed('config.webMeetingApps')
    get webMeetingApps() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(config.webMeetingApps);

        for (let i = 0; i < webMeetingApps.length; i++) {
            webMeetingApps[i]['app_name_disp'] = this.camel2space(webMeetingApps[i].fields.app_name);
        }

        return webMeetingApps;
    }

    @computed('config.appNameMicrosoftTeams')
    get appNameMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const appNameMicrosoftTeams = config.appNameMicrosoftTeams;

        return appNameMicrosoftTeams;
    }

    @computed('config.appNameWebexMeetings')
    get appNameWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const config = this.config.content as GrdmappsConfigModel;
        const appNameWebexMeetings = config.appNameWebexMeetings;

        return appNameWebexMeetings;
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
