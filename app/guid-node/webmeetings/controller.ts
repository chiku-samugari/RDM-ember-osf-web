import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import DS from 'ember-data';

import Intl from 'ember-intl/services/intl';
import WebMeetingsConfigModel from 'ember-osf-web/models/webmeetings-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

import config from 'ember-get-config';
import CurrentUser from 'ember-osf-web/services/current-user';
import moment from 'moment';

import Ember from 'ember';
const { $ } = Ember;

interface InstitutionUsers {
    fullname: string;
    guid: string;
    username: string;
}

interface WebexMeetingsCreateInvitee {
    email: string;
    meetingId: string;
}

interface WebexMeetingsAttendee {
    email: string;
}

interface MicrosoftTeamsAttendee {
    emailAddress: { address: string; name: string; };
}

/* eslint-disable camelcase */
interface AttendeesInfo {
    guid: string;
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
    email_address: string;
    display_name: string;
    _id: string;
    is_guest: boolean;
}
/* eslint-enable camelcase */

interface NodeAppAttendees {
    [fields: string]: Attendees;
}

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

const nodeUrl = `${host}${namespace}/project/{}`;
const requestWebMeetingsApiUrl = `${nodeUrl}/{2}/request_api`;
const registerWebMeetingsEmailUrl = `${nodeUrl}/{2}/register_email`;
const profileUrlBase = `${host}/profile/`;

export default class GuidNodeWebMeetings extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service intl!: Intl;
    @service currentUser!: CurrentUser;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<WebMeetingsConfigModel>;

    displayedWebMeetings = '';

    showCreateWebMeetingsDialog = false;
    showCreateWebMeetingsInputDialog = false;
    showUpdateWebMeetingsDialog = false;
    showDeleteWebMeetingsDialog = false;
    showDetailWebMeetingsDialog =false;
    detailMode = true;
    showManageAttendees = false;
    showRegisteredAttendees = false;
    showRegisterWebMeetingsEmailDialog = false;
    webMeetingsSubject = '';
    webMeetingsPk = '';
    webMeetingsAttendees: string[] = [];
    webMeetingsStartDate = '';
    webMeetingsStartTime = '';
    webMeetingsStartDateTime = '';
    webMeetingsEndDate = '';
    webMeetingsEndTime = '';
    webMeetingsEndDateTime = '';
    webMeetingsContent = '';
    webMeetingsPassword = '';
    webMeetingsJoinUrl = '';
    webMeetingsOrganizerFullname = '';

    webMeetingsUpdateMeetingId = '';
    webMeetingsDetailSubject = '';
    webMeetingsDetailAttendees: string[] = [];
    webMeetingsDetailStartDate = '';
    webMeetingsDetailStartTime = '';
    webMeetingsDetailStartDateTime = '';
    webMeetingsDetailEndDate = '';
    webMeetingsDetailEndTime = '';
    webMeetingsDetailEndDateTime = '';
    webMeetingsDetailContent = '';

    webMeetingsDeleteMeetingId = '';
    webMeetingsDeleteSubject = '';
    webMeetingsDeleteStartDate = '';
    webMeetingsDeleteStartTime = '';
    webMeetingsDeleteEndDate = '';
    webMeetingsDeleteEndTime = '';

    guestFullname = '';
    signInAddress = '';
    outsideEmail = '';
    usernameOfApp = '';
    userType = '';
    emailType = '';

    selectedUser: AttendeesInfo = {} as AttendeesInfo;
    selectedAttendees: AttendeesInfo[] = [];
    selectedDetailAttendees: AttendeesInfo[] = [];

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

    @computed('config.isFulfilled')
    get loading(): boolean {
        return !this.config || !this.config.get('isFulfilled');
    }

    @action
    save(this: GuidNodeWebMeetings) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;

        appsConfig.save()
            .then(() => {
                this.set('isPageDirty', false);
            })
            .catch(() => {
                this.saveError(appsConfig);
            });
    }

    saveError(appsConfig: WebMeetingsConfigModel) {
        appsConfig.rollbackAttributes();
        const message = this.intl.t('web_meetings.failed_to_save');
        this.toast.error(message);
    }

    @action
    startMeeting(this: GuidNodeWebMeetings, v: string) {
        window.open(v, '_blank');
    }

    @action
    setDefaultDate(this: GuidNodeWebMeetings) {
        const updateStartDateElement = $('#update_start_date') as any;
        const updateEndDateElement = $('#update_end_date') as any;
        updateStartDateElement[0].value = this.webMeetingsStartDate;
        updateEndDateElement[0].value = this.webMeetingsEndDate;
    }

    @action
    setDisplayWebMeetings(this: GuidNodeWebMeetings, name: string) {
        this.set('displayedWebMeetings', name);
    }

    @action
    setCreateWebMeetingsInputDialog(this: GuidNodeWebMeetings, name: string) {
        this.setDisplayWebMeetings(name);
        this.set('showCreateWebMeetingsInputDialog', true);
    }

    @action
    resetValue(this: GuidNodeWebMeetings) {
        // dialog
        this.set('showCreateWebMeetingsDialog', false);
        this.set('showCreateWebMeetingsInputDialog', false);
        this.set('showUpdateWebMeetingsDialog', false);
        this.set('showDeleteWebMeetingsDialog', false);
        this.set('showManageAttendees', false);
        this.set('showDetailWebMeetingsDialog', false);

        // items
        this.set('webMeetingsPk', '');
        this.set('webMeetingsSubject', '');
        this.set('webMeetingsAttendees', []);
        this.set('selectedAttendees', []);
        this.set('webMeetingsStartDate', '');
        this.set('webMeetingsStartTime', '');
        this.set('webMeetingsEndDate', '');
        this.set('webMeetingsEndTime', '');
        this.set('webMeetingsContent', '');
        this.set('webMeetingsPassword', '');

        // update items
        this.set('webMeetingsUpdateMeetingId', '');


        // delete items
        this.set('webMeetingsDeleteMeetingId', '');
        this.set('webMeetingsDeleteSubject', '');
        this.set('webMeetingsDeleteStartDate', '');
        this.set('webMeetingsDeleteStartTime', '');
        this.set('webMeetingsDeleteEndDate', '');
        this.set('webMeetingsDeleteEndTime', '');

        // detail item
        this.set('detailMode', true);
        this.set('webMeetingsDetailSubject', '');
        this.set('webMeetingsDetailAttendees', []);
        this.set('selectedDetailAttendees', []);
        this.set('webMeetingsDetailStartDate', '');
        this.set('webMeetingsDetailStartTime', '');
        this.set('webMeetingsDetailEndDate', '');
        this.set('webMeetingsDetailEndTime', '');
        this.set('webMeetingsDetailContent', '');

        this.set('webMeetingsJoinUrl', '');
        this.set('displayedWebMeetings', '');
    }

    resetRegisterEmailValue(this: GuidNodeWebMeetings) {
        this.set('selectedUser', {});
        this.set('guestFullname', '');
        this.set('userType', '');
        this.set('emailType', '');
        this.set('signInAddress', '');
        this.set('usernameOfApp', '');
        this.set('showRegisterWebMeetingsEmailDialog', false);
        this.set('showRegisteredAttendees', false);
    }

    @action
    makeManageAttendeesDialog(this: GuidNodeWebMeetings) {
        this.set('showManageAttendees', true);
        this.set('showRegisteredAttendees', true);
    }

    @action
    makeRegisteredAttendeesDialog(this: GuidNodeWebMeetings) {
        this.set('showRegisteredAttendees', true);
        this.set('showRegisterWebMeetingsEmailDialog', false);
    }

    @action
    makeRegisterWebMeetingsEmailDialog(this: GuidNodeWebMeetings) {
        this.set('showRegisterWebMeetingsEmailDialog', true);
        this.set('showRegisteredAttendees', false);
        this.set('userType', 'radio_grdmUserOrRegisteredGuest');
        this.set('emailType', 'radio_signInAddress');
    }

    @action
    setUserType(this: GuidNodeWebMeetings, userType: string) {
        this.set('userType', userType);
    }

    @action
    setEmailType(this: GuidNodeWebMeetings, emailType: string) {
        this.set('emailType', emailType);
    }

    @action
    manageWebMeetingsEmail(
        this: GuidNodeWebMeetings,
        actionType: string,
        _id: string,
        guid: string,
        isGuest: boolean,
    ) {
        const headers = this.currentUser.ajaxHeaders();
        const webMeetingsDir = ((this.displayedWebMeetings).replace(' ', '')).toLowerCase();
        const url = registerWebMeetingsEmailUrl.replace('{}', String(this.model.guid)).replace('{2}', webMeetingsDir);
        let email = '';

        const selectedUser = this.selectedUser as AttendeesInfo;
        const guestFullname = this.guestFullname as string;
        const userType = this.userType as string;
        let emailTypeFlg = false;
        let fullname = '';
        let requestAttendeeId = '';
        let requestGuid = '';
        let requestIsGuest = isGuest;

        switch (actionType) {
        case 'create': {
            if (userType === 'radio_grdmUserOrRegisteredGuest') {
                if (selectedUser._id) {
                    requestAttendeeId = selectedUser._id;
                }
                const index = (selectedUser.name).indexOf('@') + 1;
                requestGuid = (selectedUser.name).slice(index, index + 5);
                requestIsGuest = false;
            } else if (userType === 'radio_newGuest') {
                requestGuid = `${(new Date()).getTime()}`;
                fullname = guestFullname;
                requestIsGuest = true;
            }
            const emailType = this.emailType as string;
            email = emailType === 'radio_signInAddress' ? this.signInAddress : this.outsideEmail;
            if (emailType === 'radio_signInAddress') {
                emailTypeFlg = true;
            } else {
                emailTypeFlg = false;
            }
            break;
        }
        case 'update': {
            const elmentId = `#${guid}`;
            const element = $(elmentId) as any;
            email = element[0].textContent;
            requestAttendeeId = _id;
            requestGuid = guid;
            requestIsGuest = isGuest;
            break;
        }
        default:
        }
        const payload = {
            _id: requestAttendeeId,
            fullname,
            guid: requestGuid,
            email,
            is_guest: requestIsGuest,
            actionType,
            emailType: emailTypeFlg,
        };

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
                    this.toast.error('fail to register Web Meetigns email');
                    return;
                }
                this.save();
                this.toast.info('success to register Web Meetings email');
            })
            .catch(() => {
                this.toast.error(this.intl.t('web_meetings.error.failedToRequest'));
            });
    }

    @action
    makeUpdateWebMeetingDialog(
        this: GuidNodeWebMeetings,
        meetingPk: string,
        meetingId: string,
        subject: string,
        attendees: string[],
        startDatetime: string,
        endDatetime: string,
        content: string,
        password: string,
        joinUrl: string,
        appName:string,
    ) {
        this.set('detailMode', false);
        this.set('webMeetingsPk', meetingPk);
        this.set('webMeetingsUpdateMeetingId', meetingId);
        this.set('webMeetingsSubject', subject);
        this.set('webMeetingsAttendees', attendees);
        this.set('selectedAttendees', this.selectedDetailAttendees);
        this.set('webMeetingsStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingsEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsEndTime', moment(endDatetime).format('HH:mm'));
        this.set('webMeetingsContent', content);
        this.set('webMeetingsPassword', password);
        this.set('webMeetingsJoinUrl', joinUrl);
        this.setDisplayWebMeetings(appName);
    }

    makeWebMeetingsAttendees(this: GuidNodeWebMeetings, appName: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const webMeetingsDetailAttendees = this.webMeetingsDetailAttendees as string[];

        switch (appName) {
        case appsConfig.appNameMicrosoftTeams: {
            const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
            this.makeAppAttendeesInfo(nodeMicrosoftTeamsAttendees, webMeetingsDetailAttendees);
            break;
        }
        case appsConfig.appNameWebexMeetings: {
            const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
            this.makeAppAttendeesInfo(nodeWebexMeetingsAttendees, webMeetingsDetailAttendees);
            break;
        }
        default:
        }
    }

    @action
    makeAppAttendeesInfo(
        this: GuidNodeWebMeetings,
        nodeAppAttendees: NodeAppAttendees[],
        webMeetingsDetailAttendees: string[],
    ) {
        let guidOrEmail = '';
        let profileUrl = '';
        let isGuest = false;
        let userGuid = '';
        let appMail;
        webMeetingsDetailAttendees.forEach((webMeetingsDetailAttendee: any) => {
            for (const nodeAppAttendee of nodeAppAttendees) {
                if (webMeetingsDetailAttendee === nodeAppAttendee.pk) {
                    isGuest = nodeAppAttendee.fields.is_guest;
                    appMail = nodeAppAttendee.fields.email_address;
                    userGuid = nodeAppAttendee.fields.user_guid;

                    guidOrEmail = isGuest ? `(${appMail})` : `@${userGuid}`;
                    profileUrl = isGuest ? '' : profileUrlBase + userGuid;
                    this.selectedDetailAttendees.push(
                        {
                            guid: userGuid,
                            name: nodeAppAttendee.fields.fullname + guidOrEmail,
                            email: nodeAppAttendee.fields.email_address,
                            nameForApp: nodeAppAttendee.fields.display_name,
                            profile: profileUrl,
                            _id: nodeAppAttendee.fields._id,
                            is_guest: nodeAppAttendee.fields.is_guest,
                            disabled: false,
                        },
                    );
                }
            }
        });
    }

    @action
    makeDeleteWebMeetingsDialog(
        this: GuidNodeWebMeetings,
        meetingId: string,
        subject: string,
        startDatetime: string,
        endDatetime: string,
        appName: string,
    ) {
        this.set('showDeleteWebMeetingsDialog', true);
        this.set('webMeetingsDeleteMeetingId', meetingId);
        this.set('webMeetingsDeleteSubject', subject);
        this.set('webMeetingsDeleteStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsDeleteStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingsDeleteEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsDeleteEndTime', moment(endDatetime).format('HH:mm'));
        this.setDisplayWebMeetings(appName);
    }

    @action
    makeDetailWebMeetingDialog(
        this: GuidNodeWebMeetings,
        meetingPk: string,
        meetingId: string,
        subject: string,
        attendees: string[],
        organizerFullname: string,
        startDatetime: string,
        endDatetime: string,
        content: string,
        password: string,
        joinUrl: string,
        appName:string,
    ) {
        this.set('detailMode', true);
        this.set('showDetailWebMeetingsDialog', true);
        this.set('webMeetingsPk', meetingPk);
        this.set('webMeetingsUpdateMeetingId', meetingId);
        this.set('webMeetingsDetailSubject', subject);
        this.set('webMeetingsDetailAttendees', attendees);
        this.set('webMeetingsOrganizerFullname', organizerFullname);
        this.set('webMeetingsDetailStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsDetailStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingsDetailStartDateTime', startDatetime);
        this.set('webMeetingsDetailEndDate', moment(endDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsDetailEndTime', moment(endDatetime).format('HH:mm'));
        this.set('webMeetingsDetailEndDateTime', endDatetime);
        this.set('webMeetingsDetailContent', content);
        this.set('webMeetingsPassword', password);
        this.set('webMeetingsJoinUrl', joinUrl);
        this.setDisplayWebMeetings(appName);
        this.makeWebMeetingsAttendees(appName);
    }

    @action
    reqLaunch(this: GuidNodeWebMeetings, actionType: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const microsoftTeamsSignature = appsConfig.microsoftTeamsSignature as string;
        const headers = this.currentUser.ajaxHeaders();
        const webMeetingsDir = ((this.displayedWebMeetings).replace(' ', '')).toLowerCase();
        const url = requestWebMeetingsApiUrl.replace('{}', String(this.model.guid)).replace('{2}', webMeetingsDir);
        const webMeetingsSubject = this.webMeetingsSubject as string;
        const webMeetingsStartDate = this.webMeetingsStartDate
            ? moment(this.webMeetingsStartDate).format('YYYY-MM-DD')
            : '';
        /* eslint-disable max-len */
        const webMeetingsStartTimeElement = document.querySelectorAll('select[id=create_web_meetings_start_time]').length
                ? document.querySelectorAll('select[id=create_web_meetings_start_time]') as any
                : document.querySelectorAll('select[id=update_web_meetings_start_time]') as any;
        /* eslint-enable max-len */
        const webMeetingsStartTime = webMeetingsStartTimeElement.length ? webMeetingsStartTimeElement[0].value : '';
        const strWebMeetingsStartDatetime = `${webMeetingsStartDate} ${webMeetingsStartTime}`;
        const webMeetingsEndDate = this.webMeetingsEndDate ? moment(this.webMeetingsEndDate).format('YYYY-MM-DD') : '';
        const webMeetingsEndTimeElement = document.querySelectorAll('select[id=create_web_meetings_end_time]').length
            ? document.querySelectorAll('select[id=create_web_meetings_end_time]') as any
            : document.querySelectorAll('select[id=update_web_meetings_end_time]') as any;
        const webMeetingsEndTime = webMeetingsEndTimeElement.length ? webMeetingsEndTimeElement[0].value : '';
        const strWebMeetingsEndDatetime = `${webMeetingsEndDate} ${webMeetingsEndTime}`;
        const webMeetingsContent = this.webMeetingsContent as string;
        const webMeetingsPassword = this.webMeetingsPassword as string;
        const webMeetingsStartDatetime = strWebMeetingsStartDatetime !== ' '
            ? (new Date(strWebMeetingsStartDatetime)).toISOString()
            : '';

        const webMeetingsEndDatetime = strWebMeetingsEndDatetime !== ' '
            ? (new Date(strWebMeetingsEndDatetime)).toISOString()
            : '';

        const updateMeetingId = this.webMeetingsUpdateMeetingId;
        const deleteMeetingId = this.webMeetingsDeleteMeetingId;

        const selectedAttendees = this.selectedAttendees as AttendeesInfo[];
        let webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        let webexMeetingsDeleteInvitees: string[] = [];

        let body = {};
        let contentExtract = '';
        switch (this.displayedWebMeetings) {
        case appsConfig.appNameMicrosoftTeams: {
            const microsoftTeamsAttendees = this.makeMicrosoftTeamsAttendees(selectedAttendees);
            const content = (this.webMeetingsContent).replace(/\n/g, '<br>') as string;
            const updateContent = (microsoftTeamsSignature
                .replace('{1}', content))
                .replace('{2}', this.webMeetingsJoinUrl);
            contentExtract = (this.webMeetingsContent).replace(/\n/g, '\r\n');
            body = {
                subject: webMeetingsSubject,
                start: {
                    dateTime: webMeetingsStartDatetime,
                    timeZone: 'Asia/Tokyo',
                },
                end: {
                    dateTime: webMeetingsEndDatetime,
                    timeZone: 'Asia/Tokyo',
                },
                body: {
                    contentType: 'HTML',
                    content: actionType === 'update' ? updateContent : content,
                },
                attendees: microsoftTeamsAttendees,
                isOnlineMeeting: true,
            };
            break;
        }
        case appsConfig.appNameWebexMeetings: {
            /* eslint-disable max-len */
            const webexMeetingsAttendeesInfo = this.makeWebexMeetingsAttendees(selectedAttendees, updateMeetingId, actionType);
            /* eslint-enable max-len */
            webexMeetingsCreateInvitees = webexMeetingsAttendeesInfo.createInvitees;
            webexMeetingsDeleteInvitees = webexMeetingsAttendeesInfo.deleteInvitees;
            body = {
                title: webMeetingsSubject,
                start: webMeetingsStartDatetime,
                end: webMeetingsEndDatetime,
                invitees: webexMeetingsAttendeesInfo.invitees,
                agenda: webMeetingsContent,
                password: webMeetingsPassword,
            };
            break;
        }
        case appsConfig.appNameZoomMeetings: {
            const startDate = new Date(webMeetingsStartDatetime);
            const endDate = new Date(webMeetingsEndDatetime);
            const duration = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
            body = {
                topic: webMeetingsSubject,
                start_time: webMeetingsStartDatetime,
                duration,
                agenda: webMeetingsContent,
                timezone: 'UTC',
                type: 2,
            };
            break;
        }
        default:
        }

        const payload = {
            actionType,
            updateMeetingId,
            deleteMeetingId,
            contentExtract,
            createInvitees: webexMeetingsCreateInvitees,
            deleteInvitees: webexMeetingsDeleteInvitees,
            body,
        };

        this.resetValue();

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
                        'an error happens',
                    );
                    return;
                }
                this.save();
            })
            .catch(() => {
                this.toast.error('AN ERROR HAPPENS');
            });
    }

    makeMicrosoftTeamsAttendees(
        this: GuidNodeWebMeetings,
        selectedAttendees: AttendeesInfo[],
    ) {
        const microsoftTeamsAttendees: MicrosoftTeamsAttendee[] = [];
        selectedAttendees.forEach((selectedAttendee: any) => {
            microsoftTeamsAttendees.push(
                {
                    emailAddress: {
                        address: selectedAttendee.email,
                        name: selectedAttendee.nameForApp ? selectedAttendee.nameForApp : 'Unregistered',
                    },
                },
            );
        });
        return microsoftTeamsAttendees;
    }

    makeWebexMeetingsAttendees(
        this: GuidNodeWebMeetings,
        selectedAttendees: AttendeesInfo[],
        updateMeetingId: string,
        actionType: string,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const arrayAttendees: string[] = [];
        const arrayAttendeePks: string[] = [];
        let arrayCreateAttendeePks = [];
        let arrayDeleteAttendeePks = [];
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const webexMeetingsAttendees: WebexMeetingsAttendee[] = [];
        const webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        const webexMeetingsDeleteInvitees: string[] = [];
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const nodeWebexMeetingsAttendeesRelation = JSON.parse(appsConfig.nodeWebexMeetingsAttendeesRelation);

        selectedAttendees.forEach((selectedAttendee: any) => {
            webexMeetingsAttendees.push(
                {
                    email: selectedAttendee.email,
                },
            );
        });

        if (actionType === 'update') {
            selectedAttendees.forEach((selectedAttendee: any) => {
                arrayAttendees.push(selectedAttendee.email);

                nodeWebexMeetingsAttendees.forEach((nodeWebexMeetingsAttendee: any) => {
                    if (selectedAttendee.email === nodeWebexMeetingsAttendee.fields.email_address) {
                        arrayAttendeePks.push(nodeWebexMeetingsAttendee.pk);
                    }
                });
            });

            arrayCreateAttendeePks = arrayAttendeePks.filter(i => (this.webMeetingsAttendees).indexOf(i) === -1);
            arrayDeleteAttendeePks = (this.webMeetingsAttendees).filter(i => arrayAttendeePks.indexOf(i) === -1);

            arrayCreateAttendeePks.forEach((arrayCreateAttendeePk: any) => {
                nodeWebexMeetingsAttendees.forEach((nodeWebexMeetingsAttendee: any) => {
                    if (arrayCreateAttendeePk === nodeWebexMeetingsAttendee.pk) {
                        webexMeetingsCreateInvitees.push(
                            {
                                email: nodeWebexMeetingsAttendee.fields.email_address,
                                meetingId: updateMeetingId,
                            },
                        );
                    }
                });
            });
            arrayDeleteAttendeePks.forEach((arrayDeleteAttendeePk: any) => {
                nodeWebexMeetingsAttendeesRelation.forEach((relation: any) => {
                    if (this.webMeetingsPk === relation.fields.webex_meetings) {
                        if (arrayDeleteAttendeePk === relation.fields.attendees) {
                            webexMeetingsDeleteInvitees.push(
                                relation.fields.webex_meetings_invitee_id,
                            );
                        }
                    }
                });
            });
        }
        return {
            invitees: webexMeetingsAttendees,
            createInvitees: webexMeetingsCreateInvitees,
            deleteInvitees: webexMeetingsDeleteInvitees,
        };
    }

    @computed('config.webMeetingsApps')
    get webMeetingsApps() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const webMeetingsApps = JSON.parse(appsConfig.webMeetingsApps);

        return webMeetingsApps;
    }

    @computed('config.appNameMicrosoftTeams')
    get appNameMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const appNameMicrosoftTeams = appsConfig.appNameMicrosoftTeams as string;

        return appNameMicrosoftTeams;
    }

    @computed('config.appNameWebexMeetings')
    get appNameWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const appNameWebexMeetings = appsConfig.appNameWebexMeetings as string;

        return appNameWebexMeetings;
    }

    @computed('config.appNameZoomMeetings')
    get appNameZoomMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const appNameZoomMeetings = appsConfig.appNameZoomMeetings as string;

        return appNameZoomMeetings;
    }

    @computed('config.allUpcomingWebMeetings')
    get allUpcomingWebMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const allUpcomingWebMeetings = JSON.parse(appsConfig.allUpcomingWebMeetings);

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

        for (let i = 0; i < allUpcomingWebMeetings.length; i++) {
            // for display Date Bar
            if (i === 0) {
                allUpcomingWebMeetings[i].date_bar = false;
            } else if (i !== 0) {
                previousDatetime = new Date(allUpcomingWebMeetings[i - 1].fields.start_datetime);
                pYear = previousDatetime.getFullYear();
                pMonth = previousDatetime.getMonth() + 1;
                pDate = previousDatetime.getDate();
                currentDatetime = new Date(allUpcomingWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                previousDate = `${pYear}/${pMonth}/${pDate}`;
                currentDate = `${cYear}/${cMonth}/${cDate}`;

                if (currentDate !== previousDate) {
                    allUpcomingWebMeetings[i].date_bar = true;
                } else {
                    allUpcomingWebMeetings[i].date_bar = false;
                }
            }
        }
        return allUpcomingWebMeetings;
    }

    @computed('config.allPreviousWebMeetings')
    get allPreviousWebMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const allPreviousWebMeetings = JSON.parse(appsConfig.allPreviousWebMeetings);

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

        for (let i = 0; i < allPreviousWebMeetings.length; i++) {
            // for display Date Bar
            if (i === 0) {
                allPreviousWebMeetings[i].date_bar = false;
            } else if (i !== 0) {
                nextDatetime = new Date(allPreviousWebMeetings[i - 1].fields.start_datetime);
                nYear = nextDatetime.getFullYear();
                nMonth = nextDatetime.getMonth() + 1;
                nDate = nextDatetime.getDate();
                currentDatetime = new Date(allPreviousWebMeetings[i].fields.start_datetime);
                cYear = currentDatetime.getFullYear();
                cMonth = currentDatetime.getMonth() + 1;
                cDate = currentDatetime.getDate();
                nextDate = `${nYear}/${nMonth}/${nDate}`;
                currentDate = `${cYear}/${cMonth}/${cDate}`;

                if (currentDate !== nextDate) {
                    allPreviousWebMeetings[i].date_bar = true;
                } else {
                    allPreviousWebMeetings[i].date_bar = false;
                }
            }
        }
        return allPreviousWebMeetings;
    }

    @computed('config.institutionUsers')
    get institutionUsers() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const attendeesInfo: AttendeesInfo[] = [];

        institutionUsers.forEach((institutionUser: any) => {
            attendeesInfo.push(
                {
                    guid: institutionUser.guid,
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
        this: GuidNodeWebMeetings,
        nodeAppAttendees: NodeAppAttendees[],
        institutionUsers: InstitutionUsers[],
        suggestionDisabled: boolean,
    ) {
        let institutionUserList: AttendeesInfo[] = [];
        const registeredInstitutionUsers: AttendeesInfo[] = [];
        const unregisteredInstitutionUsers: AttendeesInfo[] = [];
        const guestUsers: AttendeesInfo[] = [];
        let userName = '';
        let unregisteredUserInfo = '';
        const unregisteredLabel = this.intl.t('web_meetings.meetingDialog.unregisteredLabel');
        let registeredUserName = '';
        let registeredUserInfo = '';
        let guestUserName = '';
        let guestUserInfo = '';

        for (let i = 0; i < institutionUsers.length; i++) {
            userName = institutionUsers[i].fullname;
            unregisteredUserInfo = suggestionDisabled
                ? `@${institutionUsers[i].guid}${unregisteredLabel}`
                : `@${institutionUsers[i].guid}`;

            unregisteredInstitutionUsers.push(
                {
                    guid: institutionUsers[i].guid,
                    name: userName + unregisteredUserInfo,
                    email: '',
                    nameForApp: '',
                    profile: profileUrlBase + institutionUsers[i].guid,
                    _id: '',
                    is_guest: false,
                    disabled: suggestionDisabled,
                },
            );
            for (const nodeAppAttendee of nodeAppAttendees) {
                if (institutionUsers[i].guid === nodeAppAttendee.fields.user_guid) {
                    registeredUserName = nodeAppAttendee.fields.fullname;
                    registeredUserInfo = `@${nodeAppAttendee.fields.user_guid}`;
                    registeredInstitutionUsers.push(
                        {
                            guid: nodeAppAttendee.fields.user_guid,
                            name: registeredUserName + registeredUserInfo,
                            email: nodeAppAttendee.fields.email_address,
                            nameForApp: nodeAppAttendee.fields.display_name,
                            profile: profileUrlBase + nodeAppAttendee.fields.user_guid,
                            _id: nodeAppAttendee.fields._id,
                            is_guest: false,
                            disabled: false,
                        },
                    );

                    unregisteredInstitutionUsers.pop();
                }
                if (i === 0) {
                    if (nodeAppAttendee.fields.is_guest) {
                        guestUserName = nodeAppAttendee.fields.fullname;
                        guestUserInfo = `(${nodeAppAttendee.fields.email_address})`;
                        guestUsers.push(
                            {
                                guid: nodeAppAttendee.fields.user_guid,
                                name: guestUserName + guestUserInfo,
                                email: nodeAppAttendee.fields.email_address,
                                nameForApp: nodeAppAttendee.fields.display_name,
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

        if (suggestionDisabled) { institutionUserList = institutionUserList.concat(registeredInstitutionUsers); }
        if (suggestionDisabled) { institutionUserList = institutionUserList.concat(guestUsers); }
        institutionUserList = institutionUserList.concat(unregisteredInstitutionUsers);

        return institutionUserList;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get nodeMicrosoftTeamsAttendees() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);

        return nodeMicrosoftTeamsAttendees;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);

        const institutionUsersMicrosoftTeams = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            true,
        );

        return institutionUsersMicrosoftTeams;
    }

    @computed('config.nodeMicrosoftTeamsAttendees')
    get institutionUsersMicrosoftTeamsToRegister() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const institutionUsersMicrosoftTeamsToRegister = this.makeInstitutionUserList(
            nodeMicrosoftTeamsAttendees,
            institutionUsers,
            false,
        );

        return institutionUsersMicrosoftTeamsToRegister;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get nodeWebexMeetingsAttendees() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);

        return nodeWebexMeetingsAttendees;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);

        const institutionUsersWebexMeetings = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            true,
        );

        return institutionUsersWebexMeetings;
    }

    @computed('config.nodeWebexMeetingsAttendees')
    get institutionUsersWebexMeetingsToRegister() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const institutionUsers = JSON.parse(appsConfig.institutionUsers);
        const institutionUsersWebexMeetingsToRegister = this.makeInstitutionUserList(
            nodeWebexMeetingsAttendees,
            institutionUsers,
            false,
        );

        return institutionUsersWebexMeetingsToRegister;
    }

    @computed('node')
    get config(): DS.PromiseObject<WebMeetingsConfigModel> | undefined {
        if (this.configCache) {
            return this.configCache;
        }
        if (!this.node) {
            return undefined;
        }
        this.configCache = this.store.findRecord('webmeetings-config', this.node.id);
        return this.configCache!;
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/webmeetings': GuidNodeWebMeetings;
    }
}
