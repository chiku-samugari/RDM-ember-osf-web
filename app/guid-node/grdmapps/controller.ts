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
import $ from 'jquery';
import moment from 'moment';

interface ReqBody {
    count: number;
    timestamp: string;
}

interface InstitutionUsers {
    fullname: string;
    guid: string;
    username: string;
}
/* eslint-disable camelcase */
interface AttendeesInfo {
    name: string;
    email: string;
    nameForApp: string;
    profile: string;
    _id: string;
    is_guest: boolean;
    disabled: boolean;
}

interface Attendees {
    fullname: string;
    user_guid: string;
    microsoft_teams_mail: string;
    microsoft_teams_user_name: string;
    webex_meetings_mail: string;
    webex_meetings_display_name: string;
    zoom_meetings_mail: string;
    _id: string;
    is_guest: boolean;
}
/* eslint-enable camelcase */

interface NodeAppAttendees {
    [fields: string]: Attendees;
}

interface MicrosoftTeamsAttendeeAtCreate {
    emailAddress: { address: string; name: string; };
}

interface MicrosoftTeamsAttendeeAtUpdate {
    address: string;
    name: string;
}

interface WebexMeetingsAttendee {
    email: string;
    displayName: string;
}

interface WebexMeetingsCreateInvitee {
    email: string;
    displayName: string;
}

interface Payload {
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
    microsoftTeamsAttendeesCollectionAtCreate: MicrosoftTeamsAttendeeAtCreate[];
    microsoftTeamsAttendeesCollectionAtUpdate: MicrosoftTeamsAttendeeAtUpdate[];
    webexMeetingsAttendeesCollection: WebexMeetingsAttendee[];
    webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[];
    webexMeetingsDeleteInviteeIds: string[];
    attendees: string[];
    location: string;
    content: string;
    webhookUrl: string;
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

const nodeUrl = `${host}${namespace}/project/{}`;
const integromatDir = '/integromat';
const startIntegromatScenarioUrl = `${nodeUrl}${integromatDir}/start_scenario`;
const reqestMessagesUrl = `${nodeUrl}${integromatDir}/requestNextMessages`;
const registerAlternativeWebhookUrl = `${nodeUrl}${integromatDir}/register_alternative_webhook_url`;
const registerWebMeetingAppsEmailUrl = `${nodeUrl}${integromatDir}/register_web_meeting_apps_email`;
const profileUrlBase = `${host}/profile/`;
const integromatWebhookUrlBase = 'https://hook.integromat.com/';
const makeWebhookUrlBaseUS = 'https://hook.us1.make.com/';
const makeWebhookUrlBaseEU = 'https://hook.eu1.make.com/';

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
    showCreateZoomMeetingsDialog = false;
    showUpdateMicrosoftTeamsMeetingDialog = false;
    showUpdateWebexMeetingsDialog = false;
    showUpdateZoomMeetingsDialog = false;
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
    webMeetingAttendees: string[] = [];
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

    msgInvalidSelectedUser = '';
    msgInvalidGuestUser = '';
    msgErrorEmailVal = '';
    msgInvalidEmail = '';

    guestFullname = '';
    signInAddressOfApp = '';
    usernameOfApp = '';
    userType = '';

    selectedUser: AttendeesInfo = {} as AttendeesInfo;
    selectedAttendees: AttendeesInfo[] = [];
    selectedMicrosoftTeamsAttendees: AttendeesInfo[] = [];
    selectedWebexMeetingsAttendees: AttendeesInfo[] = [];
    selectedZoomMeetingsAttendees: AttendeesInfo[] = [];

    workflowDescription = '';
    alternativeWebhookUrl = '';

    teamsMeetingAttendees: string[] = [];
    notTeamsMeetingAttendees: string[] = [];

    @computed('config.isFulfilled')
    get loading(): boolean {
        return !this.config || !this.config.get('isFulfilled');
    }

    @action
    save(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;

        appsConfig.save()
            .then(() => {
                this.set('isPageDirty', false);
            })
            .catch(() => {
                this.saveError(appsConfig);
            });
    }

    saveError(appsConfig: GrdmappsConfigModel) {
        appsConfig.rollbackAttributes();
        const message = this.intl.t('integromat.failed_to_save');
        this.toast.error(message);
    }

    camel2space(v: string) {
        const separator = ' ';
        return v
            .replace(/[A-Z][a-z]/g, match => separator + match)
            .replace(/[A-Z]+$/g, match => separator + match)
            .trim();
    }

    @action
    checkLength(text: string, select: any) {
        if (select.searchText.length >= 3 && text.length < 3) {
            return '';
        }
        return text.length >= 3;
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
    setWorkflow(this: GuidNodeGrdmapps, workflowDesc: string) {
        const workflowType = workflowDesc.split('.')[2];

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const workflows = JSON.parse(appsConfig.workflows);
        const nodeWorkflows = JSON.parse(appsConfig.nodeWorkflows);

        let workflowId = 0;
        let url = '';

        workflows.forEach((workflow: any) => {
            if (workflow.workflow_description === workflowDesc) {
                workflowId = parseInt(workflow.id, 10);
                nodeWorkflows.forEach((nodeWorkflow: any) => {
                    if (nodeWorkflow.fields.workflowid === workflowId) {
                        if (!nodeWorkflow.fields.scenarios) {
                            url = nodeWorkflow.fields.alternative_webhook_url;
                        }
                    }
                });
            }
        });

        this.set('webhookUrl', url);

        if (workflowType === 'web_meeting') {
            this.set('showWorkflows', false);
            this.set('showWebMeetingWorkflow', true);
        }
    }

    @action
    setWebMeetingApp(this: GuidNodeGrdmapps, appName: string, actionType: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const appsConfig = this.config.content as GrdmappsConfigModel;
        let appNameDisp = '';

        if (appName) {
            if (appName === appsConfig.appNameMicrosoftTeams) {
                if (actionType === 'create') {
                    this.set('showCreateMicrosoftTeamsMeetingDialog', true);
                    this.set('showCreateWebexMeetingDialog', false);
                    this.set('showCreateZoomMeetingsDialog', false);
                } else if (actionType === 'update') {
                    this.set('showUpdateMicrosoftTeamsMeetingDialog', true);
                    this.set('showUpdateWebexMeetingsDialog', false);
                    this.set('showUpdateZoomMeetingsDialog', false);
                }
            } else if (appName === appsConfig.appNameWebexMeetings) {
                if (actionType === 'create') {
                    this.set('showCreateMicrosoftTeamsMeetingDialog', false);
                    this.set('showCreateWebexMeetingDialog', true);
                    this.set('showCreateZoomMeetingsDialog', false);
                } else if (actionType === 'update') {
                    this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
                    this.set('showUpdateWebexMeetingsDialog', true);
                    this.set('showUpdateZoomMeetingsDialog', false);
                }
            } else if (appName === appsConfig.appNameZoomMeetings) {
                if (actionType === 'create') {
                    this.set('showCreateMicrosoftTeamsMeetingDialog', false);
                    this.set('showCreateWebexMeetingDialog', false);
                    this.set('showCreateZoomMeetingsDialog', true);
                } else if (actionType === 'update') {
                    this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
                    this.set('showUpdateWebexMeetingsDialog', false);
                    this.set('showUpdateZoomMeetingsDialog', true);
                }
            }
            appNameDisp = this.camel2space(appName);
            this.set('webMeetingAppName', appName);
            this.set('webMeetingAppNameDisp', appNameDisp);
        } else if (!appName && !actionType) {
            this.set('showCreateWebMeetingDialog', false);
            this.set('showUpdateWebMeetingDialog', false);
            this.set('showDeleteWebMeetingDialog', false);
            this.set('showCreateMicrosoftTeamsMeetingDialog', false);
            this.set('showCreateWebexMeetingDialog', false);
            this.set('showCreateZoomMeetingsDialog', false);
            this.set('showUpdateMicrosoftTeamsMeetingDialog', false);
            this.set('showUpdateWebexMeetingsDialog', false);
            this.set('showUpdateZoomMeetingsDialog', false);
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
            this.set('selectedZoomMeetingsAttendees', []);
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
    webhookValidationCheck(this: GuidNodeGrdmapps, webhookUrl: string) {
        let validFlag = true;
        if (!webhookUrl) {
            this.set(
                'msgInvalidWebhookUrl',
                this.intl.t(
                    'integromat.meetingDialog.invalid.empty',
                    { item: this.intl.t('integromat.workflows.alternative_webhook_url.label') },
                ),
            );
            validFlag = false;
        } else if (!(webhookUrl.startsWith(integromatWebhookUrlBase)) && !(webhookUrl.startsWith(makeWebhookUrlBaseUS))
                    && !(webhookUrl.startsWith(makeWebhookUrlBaseEU))) {
            this.set(
                'msgInvalidWebhookUrl',
                this.intl.t(
                    'integromat.meetingDialog.invalid.invalid',
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
    makeRegisterAlternativeWebhookUrl(this: GuidNodeGrdmapps, workflowDescription: string) {
        this.set('workflowDescription', workflowDescription);
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

        fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            },
        )
            .then(res => {
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
    webMeetingAppsEmailValidationCheck(
        this: GuidNodeGrdmapps,
        userType: string,
        selectedUser: AttendeesInfo,
        guestFullname: string,
        email: string,
    ) {
        let messageKey = '';
        let validFlag = true;
        const regex = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]{1,}.[A-Za-z0-9]{1,}$/;

        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;

        if (this.webMeetingAppName === appsConfig.appNameZoomMeetings) {
            messageKey = 'integromat.registeredGuest';
        } else {
            messageKey = 'integromat.grdmUserOrGuest';
        }

        if (userType === 'radio_grdmUserOrRegisteredGuest') {
            if (Object.keys(selectedUser).length === 0) {
                this.set(
                    'msgInvalidSelectedUser',
                    this.intl.t(
                        'integromat.meetingDialog.invalid.empty',
                        { item: this.intl.t(messageKey) },
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
                        { item: this.intl.t('integromat.newGuest') },
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
                ));
            validFlag = false;
        } else if (!(regex.test(email))) {
            this.set(
                'msgInvalidEmail',
                this.intl.t(
                    'integromat.meetingDialog.invalid.invalid',
                    { item: this.intl.t('integromat.signInAdress') },
                ),
            );
            validFlag = false;
        }
        return validFlag;
    }

    @action
    makeRegisterWebMeetingAppsEmailDialog(this: GuidNodeGrdmapps) {
        this.set('showRegisterWebMeetingAppsEmailDialog', true);
        this.set('userType', 'radio_grdmUserOrRegisteredGuest');
    }

    @action
    setUserType(this: GuidNodeGrdmapps, userType: string) {
        this.set('userType', userType);
    }

    @action
    registerWebMeetingAppsEmail(this: GuidNodeGrdmapps) {
        const headers = this.currentUser.ajaxHeaders();
        const url = registerWebMeetingAppsEmailUrl.replace('{}', String(this.model.guid));
        const selectedUser = this.selectedUser as AttendeesInfo;
        const guestFullname = this.guestFullname as string;
        const userType = this.userType as string;
        let attendeeNodeId = null;
        let guid = null;
        let fullname = '';
        let isGuest = false;

        // validation check
        if (!this.webMeetingAppsEmailValidationCheck(userType, selectedUser, guestFullname, this.signInAddressOfApp)) {
            return;
        }

        if (userType === 'radio_grdmUserOrRegisteredGuest') {
            if (selectedUser._id) {
                attendeeNodeId = selectedUser._id;
            }

            if (selectedUser.is_guest) {
                isGuest = true;
            } else {
                const index = (selectedUser.name).indexOf('@') + 1;
                guid = (selectedUser.name).slice(index, index + 5);
            }
        } else if (userType === 'radio_newGuest') {
            guid = `guest${(new Date()).getTime()}`;
            fullname = guestFullname;
            isGuest = true;
        }

        const payload = {
            _id: attendeeNodeId,
            guid,
            fullname,
            appName: this.webMeetingAppName,
            email: this.signInAddressOfApp,
            username: this.usernameOfApp,
            is_guest: isGuest,
        };

        this.resetValue('registerAppsEmail');

        fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            },
        )
            .then(res => {
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
    webMeetingvalidationCheck(
        this: GuidNodeGrdmapps,
        subject: string,
        attendeesNum: number,
        startDate: string,
        startTime: string,
        endDate: string,
        endTime: string,
        startDatetime: string,
        endDatetime: string,
    ) {
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

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl as string;
        const appName = this.webMeetingAppName as string;
        const appNameDisp = this.webMeetingAppNameDisp as string;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingSubject as string;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingsStartTimeElement = document.querySelectorAll('select[id=create_teams_start_time]') as any;
        const webMeetingStartTime = webMeetingsStartTimeElement[0].value;
        const strWebMeetingStartDatetime = `${webMeetingStartDate} ${webMeetingStartTime}`;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTimeElement = document.querySelectorAll('select[id=create_teams_end_time]') as any;
        const webMeetingEndTime = webMeetingEndTimeElement[0].value;
        const strWebMeetingEndDatetime = `${webMeetingEndDate} ${webMeetingEndTime}`;
        const webMeetingLocation = this.webMeetingLocation as string;
        const webMeetingContent = this.webMeetingContent as string;
        const empty = '';
        const timestamp = new Date().getTime();

        let workflowAction = '';
        const microsoftTeamsAttendeesCollectionAtCreate: MicrosoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: MicrosoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: WebexMeetingsAttendee[] = [];
        const arrayAttendees: string[] = [];

        const webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds: string[] = [];

        let attendeeNum = 0;

        let selectedAttendees: AttendeesInfo[] = [];

        if (this.webMeetingAppName === appsConfig.appNameMicrosoftTeams) {
            selectedAttendees = this.selectedMicrosoftTeamsAttendees;
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === appsConfig.appNameWebexMeetings) {
            selectedAttendees = this.selectedWebexMeetingsAttendees;
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === appsConfig.appNameZoomMeetings) {
            selectedAttendees = this.selectedZoomMeetingsAttendees;
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
        if (this.webMeetingAppName === appsConfig.appNameMicrosoftTeams) {
            workflowAction = 'createMicrosoftTeamsMeeting';
            selectedAttendees.forEach((selectedAttendee: any) => {
                microsoftTeamsAttendeesCollectionAtCreate.push(
                    {
                        emailAddress: {
                            address: selectedAttendee.email,
                            name: selectedAttendee.nameForApp ? selectedAttendee.nameForApp : 'Unregistered',
                        },
                    },
                );
                arrayAttendees.push(selectedAttendee.email);
            });
        } else if (this.webMeetingAppName === appsConfig.appNameWebexMeetings) {
            workflowAction = 'createWebexMeetings';

            selectedAttendees.forEach((selectedAttendee: any) => {
                webexMeetingsAttendeesCollection.push(
                    {
                        email: selectedAttendee.email,
                        displayName: selectedAttendee.nameForApp,
                    },
                );
                arrayAttendees.push(selectedAttendee.email);
            });
        } else if (this.webMeetingAppName === appsConfig.appNameZoomMeetings) {
            workflowAction = 'createZoomMeetings';

            selectedAttendees.forEach((selectedAttendee: any) => {
                arrayAttendees.push(selectedAttendee.email);
            });
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
                webappsUpdateAttendeesGrdmMeetingReg: errorWebappsUpdateAttendeesGrdmMeetingReg,
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
            webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        this.reqLaunch(payload, appNameDisp);
    }

    @action
    makeUpdateMeetingDialog(
        this: GuidNodeGrdmapps,
        meetingPk: string,
        meetingId: string,
        joinUrl: string,
        meetingPassword: string,
        appId: number,
        subject: string,
        attendees: string[],
        startDatetime: string,
        endDatetime: string,
        location: string,
        content: string,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);
        let webMeetingAppId = 0;
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

        for (const webMeetingApp of webMeetingApps) {
            webMeetingAppId = parseInt(webMeetingApp.id, 10);
            if (webMeetingAppId === appId) {
                appName = webMeetingApp.app_name;
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
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeAttendeesAll = JSON.parse(appsConfig.nodeAttendeesAll);
        const webMeetingAttendees = this.webMeetingAttendees as string[];
        let guidOrEmail = '';
        let profileUrl = '';
        let isGuest = false;
        let microsoftTeamsMail;
        let webexMeetingsMail;
        let zoomMeetingsMail;
        let userGuid = '';

        if (appName === appsConfig.appNameMicrosoftTeams) {
            webMeetingAttendees.forEach((webMeetingAttendee: any) => {
                for (const nodeAttendee of nodeAttendeesAll) {
                    if (type === 'update' && !(nodeAttendee.fields.microsoft_teams_mail)) {
                        continue;
                    }
                    if (webMeetingAttendee === nodeAttendee.pk) {
                        isGuest = nodeAttendee.fields.is_guest;
                        microsoftTeamsMail = nodeAttendee.fields.microsoft_teams_mail;
                        userGuid = nodeAttendee.fields.user_guid;

                        guidOrEmail = isGuest ? `(${microsoftTeamsMail})` : `@${userGuid}`;
                        profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                        this.selectedAttendees.push(
                            {
                                name: nodeAttendee.fields.fullname + guidOrEmail,
                                email: nodeAttendee.fields.microsoft_teams_mail,
                                nameForApp: nodeAttendee.fields.microsoft_teams_user_name,
                                profile: profileUrl,
                                _id: nodeAttendee.fields._id,
                                is_guest: nodeAttendee.fields.is_guest,
                                disabled: false,
                            },
                        );
                    }
                }
            });
        } else if (appName === appsConfig.appNameWebexMeetings) {
            webMeetingAttendees.forEach((webMeetingAttendee: any) => {
                for (const nodeAttendee of nodeAttendeesAll) {
                    if (type === 'update' && !(nodeAttendee.fields.webex_meetings_mail)) {
                        continue;
                    }
                    if (webMeetingAttendee === nodeAttendee.pk) {
                        isGuest = nodeAttendee.fields.is_guest;
                        webexMeetingsMail = nodeAttendee.fields.webex_meetings_mail;
                        userGuid = nodeAttendee.fields.user_guid;

                        guidOrEmail = isGuest ? `(${webexMeetingsMail})` : `@${userGuid}`;
                        profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                        this.selectedAttendees.push(
                            {
                                name: nodeAttendee.fields.fullname + guidOrEmail,
                                email: nodeAttendee.fields.webex_meetings_mail,
                                nameForApp: nodeAttendee.fields.webex_meetings_display_name,
                                profile: profileUrl,
                                _id: nodeAttendee.fields._id,
                                is_guest: nodeAttendee.fields.is_guest,
                                disabled: false,
                            },
                        );
                    }
                }
            });
        } else if (appName === appsConfig.appNameZoomMeetings) {
            webMeetingAttendees.forEach((webMeetingAttendee: any) => {
                for (const nodeAttendee of nodeAttendeesAll) {
                    if (type === 'update' && !(nodeAttendee.fields.zoom_meetings_mail)) {
                        continue;
                    }
                    if (webMeetingAttendee === nodeAttendee.pk) {
                        isGuest = nodeAttendee.fields.is_guest;
                        zoomMeetingsMail = nodeAttendee.fields.zoom_meetings_mail;
                        userGuid = nodeAttendee.fields.user_guid;

                        guidOrEmail = isGuest ? `(${zoomMeetingsMail})` : `@${userGuid}`;
                        profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                        this.selectedAttendees.push(
                            {
                                name: nodeAttendee.fields.fullname + guidOrEmail,
                                email: nodeAttendee.fields.zoom_meetings_mail,
                                nameForApp: '',
                                profile: profileUrl,
                                _id: nodeAttendee.fields._id,
                                is_guest: nodeAttendee.fields.is_guest,
                                disabled: false,
                            },
                        );
                    }
                }
            });
        }
    }

    @action
    setDefaultDate(this: GuidNodeGrdmapps) {
        const updateStartDateElement = $('#update_start_date') as any;
        const updateEndDateElement = $('#update_end_date') as any;
        updateStartDateElement[0].value = this.webMeetingStartDate;
        updateEndDateElement[0].value = this.webMeetingEndDate;
    }

    @action
    updateWebMeeting(this: GuidNodeGrdmapps) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl as string;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingSubject as string;
        const webMeetingStartDate = moment(this.webMeetingStartDate).format('YYYY-MM-DD');
        const webMeetingStartTimeElement = document.querySelectorAll('select[id=update_start_time]') as any;
        const webMeetingStartTime = webMeetingStartTimeElement[0].value;
        const strWebMeetingStartDatetime = `${webMeetingStartDate} ${webMeetingStartTime}`;
        const webMeetingEndDate = moment(this.webMeetingEndDate).format('YYYY-MM-DD');
        const webMeetingEndTimeElement = document.querySelectorAll('select[id=update_end_time]') as any;
        const webMeetingEndTime = webMeetingEndTimeElement[0].value;
        const strWebMeetingEndDatetime = `${webMeetingEndDate} ${webMeetingEndTime}`;
        const webMeetingLocation = this.webMeetingLocation as string;
        const webMeetingContent = this.webMeetingContent as string;
        const webMeetingId = this.webMeetingUpdateMeetingId;
        const webMeetingJoinUrl = this.webMeetingJoinUrl as string;
        const webMeetingPassword = this.webMeetingPassword as string;
        const timestamp = new Date().getTime();

        const nodeWebMeetingAttendeesRelation = JSON.parse(appsConfig.nodeWebMeetingsAttendeesRelation);
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);

        let workflowAction = '';
        const microsoftTeamsAttendeesCollectionAtCreate: MicrosoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: MicrosoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: WebexMeetingsAttendee[] = [];
        const arrayAttendees: string[] = [];
        const arrayAttendeePks: string[] = [];

        let arrayCreateAttendeePks = [];
        let arrayDeleteAttendeePks = [];
        const webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds: string[] = [];

        let attendeeNum = 0;

        const selectedAttendees = this.selectedAttendees as AttendeesInfo[];

        if (this.webMeetingAppName === appsConfig.appNameMicrosoftTeams) {
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === appsConfig.appNameWebexMeetings) {
            attendeeNum = selectedAttendees.length;
        } else if (this.webMeetingAppName === appsConfig.appNameZoomMeetings) {
            attendeeNum = selectedAttendees.length;
        }
        // validation check for input
        if (!this.webMeetingvalidationCheck(
            webMeetingSubject,
            attendeeNum,
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
        if (appName === appsConfig.appNameMicrosoftTeams) {
            workflowAction = 'updateMicrosoftTeamsMeeting';

            selectedAttendees.forEach((selectedAttendee: any) => {
                microsoftTeamsAttendeesCollectionAtUpdate.push(
                    {
                        address: selectedAttendee.email,
                        name: selectedAttendee.nameForApp ? selectedAttendee.nameForApp : 'Unregistered',
                    },
                );
                arrayAttendees.push(selectedAttendee.email);
            });
        } else if (appName === appsConfig.appNameWebexMeetings) {
            workflowAction = 'updateWebexMeetings';

            selectedAttendees.forEach((selectedAttendee: any) => {
                arrayAttendees.push(selectedAttendee.email);

                nodeWebexMeetingsAttendees.forEach((nodeWebexMeetingsAttendee: any) => {
                    if (selectedAttendee.email === nodeWebexMeetingsAttendee.fields.webex_meetings_mail) {
                        arrayAttendeePks.push(nodeWebexMeetingsAttendee.pk);
                    }
                });
            });

            arrayCreateAttendeePks = arrayAttendeePks.filter(i => (this.webMeetingAttendees).indexOf(i) === -1);
            arrayDeleteAttendeePks = (this.webMeetingAttendees).filter(i => arrayAttendeePks.indexOf(i) === -1);

            arrayCreateAttendeePks.forEach((arrayCreateAttendeePk: any) => {
                nodeWebexMeetingsAttendees.forEach((nodeWebexMeetingsAttendee: any) => {
                    if (arrayCreateAttendeePk === nodeWebexMeetingsAttendee.pk) {
                        webexMeetingsCreateInvitees.push(
                            {
                                email: nodeWebexMeetingsAttendee.fields.webex_meetings_mail,
                                displayName: nodeWebexMeetingsAttendee.fields.webex_meetings_display_name,
                            },
                        );
                    }
                });
            });

            arrayDeleteAttendeePks.forEach((arrayDeleteAttendeePk: any) => {
                nodeWebMeetingAttendeesRelation.forEach((relation: any) => {
                    if (this.webMeetingPk === relation.fields.all_meeting_information) {
                        if (arrayDeleteAttendeePk === relation.fields.attendees) {
                            webexMeetingsDeleteInviteeIds.push(
                                relation.fields.webex_meetings_invitee_id,
                            );
                        }
                    }
                });
            });
        } else if (appName === appsConfig.appNameZoomMeetings) {
            workflowAction = 'updateZoomMeetings';

            selectedAttendees.forEach((selectedAttendee: any) => {
                arrayAttendees.push(selectedAttendee.email);
            });
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
                webappsUpdateAttendeesGrdmMeetingReg: errorWebappsUpdateAttendeesGrdmMeetingReg,
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
            webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        this.reqLaunch(payload, appName);
    }

    @action
    makeDeleteDialog(
        this: GuidNodeGrdmapps,
        meetingId: string,
        appId: number,
        subject: string,
        startDatetime: string,
        endDatetime: string,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);
        let webMeetingAppId = 0;
        let appName = '';

        for (const webMeetingApp of webMeetingApps) {
            webMeetingAppId = parseInt(webMeetingApp.id, 10);
            if (webMeetingAppId === appId) {
                appName = webMeetingApp.app_name;
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

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webhookUrl = this.webhookUrl as string;
        const appName = this.webMeetingAppName;
        const appNameDisp = this.webMeetingAppNameDisp;
        const guid = String(this.model.guid);
        const webMeetingSubject = this.webMeetingDeleteSubject;
        const strWebMeetingStartDatetime = `${this.webMeetingDeleteStartDate} ${this.webMeetingDeleteStartTime}`;
        const strWebMeetingEndDatetime = `${this.webMeetingDeleteEndDate} ${this.webMeetingDeleteEndTime}`;
        const timestamp = new Date().getTime();

        const empty = '';
        const emptyList: string[] = [];
        const microsoftTeamsAttendeesCollectionAtCreate: MicrosoftTeamsAttendeeAtCreate[] = [];
        const microsoftTeamsAttendeesCollectionAtUpdate: MicrosoftTeamsAttendeeAtUpdate[] = [];
        const webexMeetingsAttendeesCollection: WebexMeetingsAttendee[] = [];

        const webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInviteeIds: string[] = [];

        let workflowAction = '';

        if (this.webMeetingAppName === appsConfig.appNameMicrosoftTeams) {
            workflowAction = 'deleteMicrosoftTeamsMeeting';
        } else if (this.webMeetingAppName === appsConfig.appNameWebexMeetings) {
            workflowAction = 'deleteWebexMeetings';
        } else if (this.webMeetingAppName === appsConfig.appNameZoomMeetings) {
            workflowAction = 'deleteZoomMeetings';
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
                webappsUpdateAttendeesGrdmMeetingReg: errorWebappsUpdateAttendeesGrdmMeetingReg,
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
            webhookUrl,
            timestamp,
        };

        this.setWebMeetingApp('', '');

        this.reqLaunch(payload, appNameDisp);
    }

    @action
    makeDetailMeetingDialog(
        this: GuidNodeGrdmapps,
        meetingPk: string,
        meetingId: string,
        joinUrl: string,
        appId: number,
        subject: string,
        organizerFullname: string,
        attendees: string[],
        startDatetime: string,
        endDatetime: string,
        location: string,
        content: string,
    ) {
        this.set('showDetailWebMeetingDialog', true);

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);
        let webMeetingAppId = 0;
        let appName = '';

        this.set('webMeetingPk', meetingPk);
        this.set('webMeetingSubject', subject);
        this.set('webMeetingOrganizerFullname', organizerFullname);
        this.set('webMeetingAttendees', attendees);
        this.set('webMeetingStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingEndTime', moment(endDatetime).format('HH:mm'));
        this.set('webMeetingLocation', location);
        this.set('webMeetingContent', content);
        this.set('webMeetingUpdateMeetingId', meetingId);
        this.set('webMeetingJoinUrl', joinUrl);

        for (const webMeetingApp of webMeetingApps) {
            webMeetingAppId = parseInt(webMeetingApp.id, 10);
            if (webMeetingAppId === appId) {
                appName = webMeetingApp.app_name;
                break;
            }
        }

        this.setWebMeetingApp(appName, 'detail');
        this.makeWebMeetingAttendee(appName, 'detail');
    }

    reqLaunch(payload: Payload, appName: string) {
        this.toast.info(this.intl.t('integromat.info.launch'));
        const headers = this.currentUser.ajaxHeaders();
        const url = startIntegromatScenarioUrl.replace('{}', String(this.model.guid));

        fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            },
        )
            .then(res => {
                if (!res.ok) {
                    this.toast.error(this.intl.t('integromat.error.failedToRequest'));
                }
                return res.json();
            })
            .then(data => {
                const reqBody = {
                    count: 1,
                    timestamp: data.timestamp,
                };
                this.reqMessage(reqBody, appName);
            })
            .catch(() => {
                this.toast.error(this.intl.t('integromat.error.failedToRequest'));
            });
    }

    reqMessage(body: ReqBody, appName: string) {
        const headers = this.currentUser.ajaxHeaders();
        const url = reqestMessagesUrl.replace('{}', String(this.model.guid));

        fetch(
            url,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            },
        )
            .then(res => {
                if (!res.ok) {
                    this.toast.error(this.intl.t('integromat.error.failedToGetMessage'));
                }
                return res.json();
            })
            .then(data => {
                if (data.integromatMsg === 'integromat.info.completed') {
                    this.toast.info(this.intl.t(data.integromatMsg));
                    this.save();
                } else if (data.integromatMsg.match('.error.')) {
                    this.toast.error(this.intl.t(data.integromatMsg, { appName }));
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
                        this.reqMessage(reqBody, appName);
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
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const allWebMeetings = JSON.parse(appsConfig.allWebMeetings);
        return allWebMeetings;
    }

    @computed('config.upcomingWebMeetings')
    get upcomingWebMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const upcomingWebMeetings = JSON.parse(appsConfig.upcomingWebMeetings);
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);

        let previousDatetime;
        let pYear;
        let pMonth;
        let pDate;
        let currentDatetime;
        let cYear;
        let cMonth;
        let cDate;
        let previousDate = '';
        let currentDate = '';
        let webMeetingAppId = 0;

        for (let i = 0; i < upcomingWebMeetings.length; i++) {
            // for display App Name on meeting list
            for (const webMeetingApp of webMeetingApps) {
                webMeetingAppId = parseInt(webMeetingApp.id, 10);
                if (upcomingWebMeetings[i].fields.appid === webMeetingAppId) {
                    upcomingWebMeetings[i].app_name_disp = this.camel2space(webMeetingApp.app_name);
                    break;
                }
            }

            // for display Date Bar
            if (i === 0) {
                upcomingWebMeetings[i].date_bar = false;
            } else if (i !== 0) {
                previousDatetime = new Date(upcomingWebMeetings[i - 1].fields.start_datetime);
                pYear = previousDatetime.getFullYear();
                pMonth = previousDatetime.getMonth() + 1;
                pDate = previousDatetime.getDate();
                currentDatetime = new Date(upcomingWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                previousDate = `${pYear}/${pMonth}/${pDate}`;
                currentDate = `${cYear}/${cMonth}/${cDate}`;

                if (currentDate !== previousDate) {
                    upcomingWebMeetings[i].date_bar = true;
                } else {
                    upcomingWebMeetings[i].date_bar = false;
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
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const previousWebMeetings = JSON.parse(appsConfig.previousWebMeetings);
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);

        let currentDatetime;
        let cYear;
        let cMonth;
        let cDate;
        let nextDatetime;
        let nYear;
        let nMonth;
        let nDate;
        let nextDate = '';
        let currentDate = '';
        let webMeetingAppId = 0;

        for (let i = 0; i < previousWebMeetings.length; i++) {
            // for display App Name on meeting list
            for (const webMeetingApp of webMeetingApps) {
                webMeetingAppId = parseInt(webMeetingApp.id, 10);
                if (previousWebMeetings[i].fields.appid === webMeetingAppId) {
                    previousWebMeetings[i].app_name_disp = this.camel2space(webMeetingApp.app_name);
                    break;
                }
            }

            if (i === 0) {
                previousWebMeetings[i].date_bar = false;
            } else if (i !== 0) {
                nextDatetime = new Date(previousWebMeetings[i - 1].fields.start_datetime);
                nYear = nextDatetime.getFullYear();
                nMonth = nextDatetime.getMonth() + 1;
                nDate = nextDatetime.getDate();
                currentDatetime = new Date(previousWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                nextDate = `${nYear}/${nMonth}/${nDate}`;
                currentDate = `${cYear}/${cMonth}/${cDate}`;

                if (currentDate !== nextDate) {
                    previousWebMeetings[i].date_bar = true;
                } else {
                    previousWebMeetings[i].date_bar = false;
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
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeAttendeesAll = JSON.parse(appsConfig.nodeAttendeesAll);
        return nodeAttendeesAll;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get nodeMicrosoftTeamsAttendees() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        return nodeMicrosoftTeamsAttendees;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get nodeWebexMeetingsAttendees() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        return nodeWebexMeetingsAttendees;
    }

    @computed('config.nodeZoomMeetingsAttendees')
    get nodeZoomMeetingsAttendees() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeZoomMeetingsAttendees = JSON.parse(appsConfig.nodeZoomMeetingsAttendees);
        return nodeZoomMeetingsAttendees;
    }

    @computed('config.institutionUsers')
    get institutionUsers() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const attendeesInfo: AttendeesInfo[] = [];

        institutionUsers.forEach((institutionUser: any) => {
            attendeesInfo.push(
                {
                    name: `${institutionUser.fullname}@${institutionUser.guid}`,
                    email: '',
                    nameForApp: '',
                    profile: '',
                    _id: '',
                    is_guest: false,
                    disabled: true,
                },
            );
        });

        return institutionUsers;
    }

    makeInstitutionUserList(
        this: GuidNodeGrdmapps,
        nodeAppAttendees: NodeAppAttendees[],
        institutionUsers: InstitutionUsers[],
        suggestionDisabled: boolean,
        appName: string,
    ) {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;

        let institutionUserList: AttendeesInfo[] = [];
        const registeredInstitutionUsers: AttendeesInfo[] = [];
        const unregisteredInstitutionUsers: AttendeesInfo[] = [];
        const guestUsers: AttendeesInfo[] = [];
        let userName = '';
        let userInfo = '';
        let userEmail = '';
        let unregisteredUserInfo = '';
        const unregisteredLabel = this.intl.t('integromat.meetingDialog.unregisteredLabel');
        let registeredUserName = '';
        let registeredUserInfo = '';
        let guestUserName = '';
        let guestUserInfo = '';

        for (let i = 0; i < institutionUsers.length; i++) {
            userName = institutionUsers[i].fullname;
            userInfo = `@${institutionUsers[i].guid}`;
            unregisteredUserInfo = `@${institutionUsers[i].guid}${unregisteredLabel}`;
            if (appName === appsConfig.appNameZoomMeetings) {
                if (suggestionDisabled) {
                    userEmail = institutionUsers[i].username;
                    registeredInstitutionUsers.push(
                        {
                            name: userName + userInfo,
                            email: userEmail,
                            nameForApp: '',
                            profile: profileUrlBase + institutionUsers[i].guid,
                            _id: '',
                            is_guest: false,
                            disabled: false,
                        },
                    );
                }
            } else {
                unregisteredInstitutionUsers.push(
                    {
                        name: userName + unregisteredUserInfo,
                        email: '',
                        nameForApp: '',
                        profile: profileUrlBase + institutionUsers[i].guid,
                        _id: '',
                        is_guest: false,
                        disabled: suggestionDisabled,
                    },
                );
            }
            for (const nodeAppAttendee of nodeAppAttendees) {
                if (appName !== appsConfig.appNameZoomMeetings) {
                    if (institutionUsers[i].guid === nodeAppAttendee.fields.user_guid) {
                        registeredUserName = nodeAppAttendee.fields.fullname;
                        registeredUserInfo = `@${nodeAppAttendee.fields.user_guid}`;
                        if (appName === appsConfig.appNameMicrosoftTeams) {
                            registeredInstitutionUsers.push(
                                {
                                    name: registeredUserName + registeredUserInfo,
                                    email: nodeAppAttendee.fields.microsoft_teams_mail,
                                    nameForApp: nodeAppAttendee.fields.microsoft_teams_user_name,
                                    profile: profileUrlBase + nodeAppAttendee.fields.user_guid,
                                    _id: nodeAppAttendee.fields._id,
                                    is_guest: false,
                                    disabled: false,
                                },
                            );
                        } else if (appName === appsConfig.appNameWebexMeetings) {
                            registeredInstitutionUsers.push(
                                {
                                    name: registeredUserName + registeredUserInfo,
                                    email: nodeAppAttendee.fields.webex_meetings_mail,
                                    nameForApp: nodeAppAttendee.fields.webex_meetings_display_name,
                                    profile: profileUrlBase + nodeAppAttendee.fields.user_guid,
                                    _id: nodeAppAttendee.fields._id,
                                    is_guest: false,
                                    disabled: false,
                                },
                            );
                        }

                        unregisteredInstitutionUsers.pop();
                    }
                }
                if (i === 0) {
                    if (nodeAppAttendee.fields.is_guest) {
                        guestUserName = nodeAppAttendee.fields.fullname;
                        if (appName === appsConfig.appNameMicrosoftTeams) {
                            guestUserInfo = `(${nodeAppAttendee.fields.microsoft_teams_mail})`;
                            guestUsers.push(
                                {
                                    name: guestUserName + guestUserInfo,
                                    email: nodeAppAttendee.fields.microsoft_teams_mail,
                                    nameForApp: nodeAppAttendee.fields.microsoft_teams_user_name,
                                    profile: '',
                                    _id: nodeAppAttendee.fields._id,
                                    is_guest: true,
                                    disabled: false,
                                },
                            );
                        } else if (appName === appsConfig.appNameWebexMeetings) {
                            guestUserInfo = `(${nodeAppAttendee.fields.webex_meetings_mail})`;
                            guestUsers.push(
                                {
                                    name: guestUserName + guestUserInfo,
                                    email: nodeAppAttendee.fields.webex_meetings_mail,
                                    nameForApp: nodeAppAttendee.fields.webex_meetings_display_name,
                                    profile: '',
                                    _id: nodeAppAttendee.fields._id,
                                    is_guest: true,
                                    disabled: false,
                                },
                            );
                        } else if (appName === appsConfig.appNameZoomMeetings) {
                            guestUserInfo = `(${nodeAppAttendee.fields.zoom_meetings_mail})`;
                            guestUsers.push(
                                {
                                    name: guestUserName + guestUserInfo,
                                    email: nodeAppAttendee.fields.zoom_meetings_mail,
                                    nameForApp: '',
                                    profile: '',
                                    _id: nodeAppAttendee.fields._id,
                                    is_guest: true,
                                    disabled: false,
                                },
                            );
                        }
                    }
                }
            }
        }

        institutionUserList = institutionUserList.concat(registeredInstitutionUsers);
        institutionUserList = institutionUserList.concat(guestUsers);
        institutionUserList = institutionUserList.concat(unregisteredInstitutionUsers);

        return institutionUserList;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameMicrosoftTeams;

        const institutionMicrosoftTeamsUsers = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            true,
            appName,
        );

        return institutionMicrosoftTeamsUsers;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersToUpdateMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameMicrosoftTeams;

        const institutionMicrosoftTeamsUsers = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            false,
            appName,
        );

        return institutionMicrosoftTeamsUsers;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameWebexMeetings;

        const institutionWebexMeetingsUsers = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            true,
            appName,
        );

        return institutionWebexMeetingsUsers;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersToUpdateWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameWebexMeetings;

        const institutionWebexMeetingsUsers = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            false,
            appName,
        );

        return institutionWebexMeetingsUsers;
    }

    @computed('config.nodeZoomMeetingsAttendees')
    get institutionUsersZoomMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeZoomMeetingsAttendees = JSON.parse(appsConfig.nodeZoomMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameZoomMeetings;

        const institutionZoomMeetingsUsers = this.makeInstitutionUserList(
            nodeZoomMeetingsAttendees,
            institutionUsers,
            true,
            appName,
        );

        return institutionZoomMeetingsUsers;
    }

    @computed('config.nodeZoomMeetingsAttendees')
    get institutionUsersToUpdateZoomMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const nodeZoomMeetingsAttendees = JSON.parse(appsConfig.nodeZoomMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const appName = appsConfig.appNameZoomMeetings;

        const institutionZoomMeetingsUsers = this.makeInstitutionUserList(
            nodeZoomMeetingsAttendees,
            institutionUsers,
            false,
            appName,
        );

        return institutionZoomMeetingsUsers;
    }

    @computed('config.workflows')
    get workflows() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const workflows = JSON.parse(appsConfig.workflows);
        return workflows;
    }

    @computed('config.webMeetingApps')
    get webMeetingApps() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const webMeetingApps = JSON.parse(appsConfig.webMeetingApps);

        for (const webMeetingApp of webMeetingApps) {
            webMeetingApp.app_name_disp = this.camel2space(webMeetingApp.app_name);
        }

        return webMeetingApps;
    }

    @computed('config.appNameMicrosoftTeams')
    get appNameMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const appNameMicrosoftTeams = appsConfig.appNameMicrosoftTeams as string;

        return appNameMicrosoftTeams;
    }

    @computed('config.appNameWebexMeetings')
    get appNameWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const appNameWebexMeetings = appsConfig.appNameWebexMeetings as string;

        return appNameWebexMeetings;
    }

    @computed('config.appNameZoomMeetings')
    get appNameZoomMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as GrdmappsConfigModel;
        const appNameZoomMeetings = appsConfig.appNameZoomMeetings as string;

        return appNameZoomMeetings;
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
