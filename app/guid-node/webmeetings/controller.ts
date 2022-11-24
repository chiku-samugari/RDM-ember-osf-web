import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import DS from 'ember-data';

import eIntl from 'ember-intl/services/intl';
import Node from 'ember-osf-web/models/node';
import WebMeetingsConfigModel from 'ember-osf-web/models/webmeetings-config';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

import config from 'ember-get-config';
import CurrentUser from 'ember-osf-web/services/current-user';
import $ from 'jquery';
import moment from 'moment';

interface ProjectContributors {
    fullname: string;
    guid: string;
    username: string;
    institution: string;
    institutionJa: string;
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
    dispName: string;
    fullname: string;
    email: string;
    institution: string;
    appUsername: string;
    appEmail: string;
    profile: string;
    _id: string;
    is_guest: boolean;
    has_grdm_account: boolean;
}

interface Attendees {
    fullname: string;
    user_guid: string;
    email_address: string;
    display_name: string;
    _id: string;
    is_guest: boolean;
    is_active: boolean;
    has_grdm_account: boolean;
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
const registerWebMeetingsContributorsEmailUrl = `${nodeUrl}/{2}/register_contributors_email`;
const profileUrlBase = `${host}/profile/`;

export default class GuidNodeWebMeetings extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service intl!: eIntl;
    @service currentUser!: CurrentUser;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<WebMeetingsConfigModel>;

    preDisplayedWebMeetings = '';
    displayedWebMeetings = '';
    displayedUserId = '';
    displayedUser = '';
    appDisplayName = '';
    appUsername = '';
    displayedUserGuid = '';
    displayedUserFullname = '';
    displayedUserHasGrdmAccount = false;

    showMeetingsList = true;
    showAttendeesList = false;
    showCreateWebMeetingsDialog = false;
    showCreateWebMeetingsInputDialog = false;
    showUpdateWebMeetingsDialog = false;
    showDeleteWebMeetingsDialog = false;
    showDetailWebMeetingsDialog = false;
    detailMode = true;
    upcomingMode = true;
    showManageAttendees = false;
    showRegisteredAttendees = false;
    showRegisterWebMeetingsEmailDialog = false;
    showRegisterWebMeetingsAppEmailDialog = false;
    showRegisterWebMeetingsGuestEmailDialog = false;
    showUpdateWebMeetingsEmailDialog = false;
    showDeleteWebMeetingsEmailDialog = false;
    webMeetingsSubject = '';
    webMeetingsPk = '';
    webMeetingsAttendees: string[] = [];
    webMeetingsStartDate = '';
    webMeetingsStartTime = '';
    webMeetingsStartDateTime = '';
    webMeetingsDurationHours = '';
    webMeetingsDurationMinutes = '';
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

    msgInvalidSelectedUser = '';
    msgInvalidEmail = '';
    msgInvalidFullname = '';
    msgInvalidSubject = '';
    msgInvalidAttendees = '';
    msgInvalidDatetime = '';
    msgOutsideEmail = '';
    msgDuplicatedEmail = '';
    canNotRegisterContrib = '';

    selectedUser: AttendeesInfo = {} as AttendeesInfo;
    selectedAttendees: AttendeesInfo[] = [];
    selectedDetailAttendees: AttendeesInfo[] = [];

    currentTime = new Date();
    start = this.currentTime.setMinutes(Math.round(this.currentTime.getMinutes() / 30) * 30);
    end = this.currentTime.setMinutes((Math.round(this.currentTime.getMinutes() / 30) * 30) + 60);
    defaultStartTime = moment(this.start).format('HH:mm');
    defaultEndTime = moment(this.end).format('HH:mm');

    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    times = [
        '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
        '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
        '24:00',
    ];

    hours = [
        '0', '1', '2', '3', '4', '5', '6',
    ];

    minutes = [
        '0', '15', '30', '45',
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
    fixDate(this: GuidNodeWebMeetings, actionType: string) {
        let startDateElement = null;
        const startDate = new Date(moment(this.webMeetingsStartDate).format('YYYY/MM/DD'));
        const tzOffSet = startDate.getTimezoneOffset() / 60;
        if (tzOffSet > 0) {
            startDate.setDate(startDate.getDate() + 1);
        }
        this.set('webMeetingsStartDate', moment(startDate).format('YYYY/MM/DD'));
        switch (actionType) {
        case 'create': {
            startDateElement = $('#create_start_date') as any;
            break;
        }
        case 'update': {
            startDateElement = $('#update_start_date') as any;
            break;
        }
        default:
        }
        startDateElement.datepicker('setDate', this.webMeetingsStartDate);
    }

    @action
    setDefaultDate(this: GuidNodeWebMeetings, actionType: string) {
        let startDateElement = null;

        switch (actionType) {
        case 'create': {
            startDateElement = $('#create_start_date') as any;
            this.set('webMeetingsStartDate', moment(new Date()).format('YYYY/MM/DD'));
            break;
        }
        case 'update': {
            startDateElement = $('#update_start_date') as any;
            break;
        }
        default:
        }
        startDateElement.datepicker('setDate', this.webMeetingsStartDate);
    }

    @action
    setDisplayWebMeetings(this: GuidNodeWebMeetings, name: string) {
        this.set('displayedWebMeetings', name);
    }

    @action
    setCreateWebMeetingsInputDialog(this: GuidNodeWebMeetings, appName: string, firstTime: boolean) {
        if (firstTime) {
            if (this.preDisplayedWebMeetings) {
                this.setDisplayWebMeetings(this.preDisplayedWebMeetings);
            } else {
                this.setDisplayWebMeetings(appName);
            }
        } else {
            this.set('preDisplayedWebMeetings', appName);
            this.setDisplayWebMeetings(this.preDisplayedWebMeetings);
        }
        this.set('selectedAttendees', []);
        this.set('showCreateWebMeetingsDialog', true);
        this.set('showCreateWebMeetingsInputDialog', true);
    }

    @action
    addContributorsAsAttendees(this: GuidNodeWebMeetings, appName: string) {
        const headers = this.currentUser.ajaxHeaders();
        const webMeetingsDir = ((appName).replace(' ', '')).toLowerCase();
        /* eslint-disable max-len */
        const url = registerWebMeetingsContributorsEmailUrl.replace('{}', String(this.model.guid)).replace('{2}', webMeetingsDir);
        /* eslint-enable max-len */
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const projectContributors = JSON.parse(appsConfig.projectContributors);
        let nodeAttendees: NodeAppAttendees[] = [];
        switch (appName) {
        case appsConfig.appNameMicrosoftTeams: {
            nodeAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
            break;
        }
        case appsConfig.appNameWebexMeetings: {
            nodeAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
            break;
        }
        default:
        }
        const nodeAttendeesAsContributorInfo = this.makeContributorList(
            nodeAttendees,
            projectContributors,
            true,
        );
        const attendeesAsContributors = nodeAttendeesAsContributorInfo.registered;
        this.set('selectedAttendees', attendeesAsContributors);
        if ((nodeAttendeesAsContributorInfo.unregistered).length > 0) {
            const payload = nodeAttendeesAsContributorInfo.unregistered;
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
                        this.toast.error(this.intl.t('web_meetings.error.failedToRegisterEmail'));
                    }
                    return res.json();
                })
                .then(data => {
                    this.save();
                    this.makeTypeOfAttendeesInfo(data.result);
                    if (data.canNotRegister) {
                        this.setCanNotRegisterMsg(data.canNotRegister);
                    }
                })
                .catch(() => {
                    this.toast.error(this.intl.t('web_meetings.error.failedToRequest'));
                });
        }
    }

    makeTypeOfAttendeesInfo(this: GuidNodeWebMeetings, registeredAttendees: AttendeesInfo[]) {
        registeredAttendees.forEach((registeredAttendee: AttendeesInfo) => {
            this.addNewAttendee(registeredAttendee);
        });
    }

    @action
    setCanNotRegisterMsg(this: GuidNodeWebMeetings, canNotRegister: string) {
        this.set('canNotRegisterContrib',
            this.intl.t(
                'web_meetings.error.canNotRegisterContrib',
                { contributors: canNotRegister },
            ));
    }

    @action
    addNewAttendee(this: GuidNodeWebMeetings, newAttendee: AttendeesInfo) {
        const attendees = this.selectedAttendees;
        attendees.push(newAttendee);
        this.set('selectedAttendees', attendees);
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
        this.set('webMeetingsDurationHours', '');
        this.set('webMeetingsDurationMinutes', '');
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

        this.set('msgInvalidSubject', '');
        this.set('msgInvalidAttendees', '');
        this.set('msgInvalidDatetime', '');

        this.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
    }

    resetRegisterEmailValue(this: GuidNodeWebMeetings) {
        this.set('showRegisterWebMeetingsEmailDialog', false);
        this.set('showRegisterWebMeetingsAppEmailDialog', false);
        this.set('showRegisterWebMeetingsGuestEmailDialog', false);
        this.set('showUpdateWebMeetingsEmailDialog', false);
        this.set('showDeleteWebMeetingsEmailDialog', false);
        this.set('displayedUserFullname', '');
        this.set('displayedUserGuid', '');
        this.set('displayedUserHasGrdmAccount', false);
        this.set('appDisplayName', '');
        this.set('appUsername', '');
        this.set('msgOutsideEmail', '');
        this.set('msgDuplicatedEmail', '');
        this.set('canNotRegisterContrib', '');
        this.set('msgInvalidEmail', '');
        this.set('msgInvalidFullname', '');
    }

    @action
    startRegisterAttendeesFlow(this: GuidNodeWebMeetings, attendees: AttendeesInfo[]) {
        const selectedAttendees = JSON.stringify(this.selectedAttendees);
        const newAttendee = attendees.filter((i: AttendeesInfo) => selectedAttendees.indexOf(JSON.stringify(i)) === -1);
        const newAttendeeGuid = newAttendee.length > 0 ? newAttendee[0].guid : '';
        if (newAttendeeGuid) {
            if (newAttendeeGuid === 'addGuest') {
                this.makeRegisterWebMeetingsEmailDialog('', '', '', false);
                return;
            }
            const newAttendeeUserAppEmail = newAttendee[0].appEmail;
            const newAttendeeUserIsGuest = newAttendee[0].is_guest;
            const newAttendeeUserHasGrdmAccount = newAttendee[0].has_grdm_account;
            if (!newAttendeeUserAppEmail && newAttendeeUserHasGrdmAccount) {
                this.manageWebMeetingsEmail(
                    'create',
                    '',
                    '',
                    '',
                    newAttendeeUserIsGuest,
                    newAttendeeUserHasGrdmAccount,
                    true,
                    this.displayedWebMeetings,
                    newAttendee[0],
                );
                return;
            }
        }
        this.set('selectedAttendees', attendees);
    }

    webMeetingAppsEmailValidationCheck(
        this: GuidNodeWebMeetings,
        email: string,
        fullname: string,
    ) {
        let validFlag = false;
        const regex = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]{1,}.[A-Za-z0-9]{1,}$/;
        if (this.showRegisterWebMeetingsGuestEmailDialog) {
            if (!fullname) {
                this.set('msgInvalidFullname',
                    this.intl.t(
                        'web_meetings.meetingDialog.invalid.empty',
                        { item: this.intl.t('web_meetings.username') },
                    ));
                validFlag = true;
            } else {
                this.set('msgInvalidFullname', '');
            }
        }
        if (!email) {
            this.set('msgInvalidEmail',
                this.intl.t(
                    'web_meetings.meetingDialog.invalid.empty',
                    { item: this.intl.t('web_meetings.emailAdress') },
                ));
            validFlag = true;
        } else if (!(regex.test(email))) {
            this.set(
                'msgInvalidEmail',
                this.intl.t(
                    'web_meetings.meetingDialog.invalid.invalid',
                    { item: this.intl.t('web_meetings.emailAdress') },
                ),
            );
            validFlag = true;
        } else {
            this.set('msgInvalidEmail', '');
        }
        return validFlag;
    }

    webMeetingAppsEmailDuplicatedCheck(
        this: GuidNodeWebMeetings,
        appName: string,
        email: string,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        let nodeAppAttendees: NodeAppAttendees[] = [];
        switch (appName) {
        case appsConfig.appNameMicrosoftTeams: {
            nodeAppAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
            break;
        }
        case appsConfig.appNameWebexMeetings: {
            nodeAppAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
            break;
        }
        default:
        }
        for (const nodeAppAttendee of nodeAppAttendees) {
            if (email === nodeAppAttendee.fields.email_address && nodeAppAttendee.fields.is_active) {
                this.setDuplicatedMsg();
                return true;
            }
        }
        return false;
    }

    @action
    manageWebMeetingsEmail(
        this: GuidNodeWebMeetings,
        actionType: string,
        id: string,
        fullname: string,
        guid: string,
        isGuest: boolean,
        hasGrdmAccount: boolean,
        regAuto: boolean,
        appName: string,
        newAttendee: AttendeesInfo,
    ) {
        const headers = this.currentUser.ajaxHeaders();
        const webMeetingsDir = ((this.displayedWebMeetings).replace(' ', '')).toLowerCase();
        const url = registerWebMeetingsEmailUrl.replace('{}', String(this.model.guid)).replace('{2}', webMeetingsDir);
        let email = '';

        let requestFullname = '';
        let requestAttendeeId = '';
        let requestGuid = '';
        let requestIsGuest = isGuest;
        let requestHasGrdmAccount = hasGrdmAccount;

        switch (actionType) {
        case 'create': {
            if (newAttendee) {
                requestGuid = newAttendee.guid;
                requestFullname = newAttendee.fullname;
                email = newAttendee.email;
                requestIsGuest = newAttendee.is_guest;
                requestHasGrdmAccount = newAttendee.has_grdm_account;
                if (!regAuto && (this.webMeetingAppsEmailValidationCheck(email, '')
                    || this.webMeetingAppsEmailDuplicatedCheck(appName, email))) {
                    return;
                }
            } else {
                if (fullname) {
                    requestFullname = fullname;
                } else {
                    requestFullname = this.appDisplayName;
                }
                requestIsGuest = isGuest;
                email = this.appUsername;
                if (this.webMeetingAppsEmailValidationCheck(email, requestFullname)
                    || this.webMeetingAppsEmailDuplicatedCheck(appName, email)) {
                    return;
                }
                if (requestHasGrdmAccount) {
                    requestGuid = guid;
                } else {
                    requestGuid = `${(new Date()).getTime()}`;
                }
            }
            break;
        }
        case 'update': {
            requestFullname = fullname;
            email = this.appUsername;
            requestAttendeeId = id;
            requestIsGuest = isGuest;
            if (this.webMeetingAppsEmailValidationCheck(email, '')
                || this.webMeetingAppsEmailDuplicatedCheck(appName, email)) {
                return;
            }
            break;
        }
        case 'delete':
            requestAttendeeId = id;
            break;
        default:
        }
        const payload = {
            _id: requestAttendeeId,
            fullname: requestFullname,
            guid: requestGuid,
            email,
            is_guest: requestIsGuest,
            has_grdm_account: requestHasGrdmAccount,
            regAuto,
            actionType,
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
                    this.toast.error(this.intl.t('web_meetings.error.failedToRegisterEmail'));
                }
                return res.json();
            })
            .then(data => {
                if (data.result === '') {
                    this.save();
                    this.resetRegisterEmailValue();
                    this.addNewAttendee(data.newAttendee);
                } else if (data.result === 'outside_email' || data.result === 'duplicated_email') {
                    if (data.regAuto) {
                        this.makeRegisterWebMeetingsEmailDialog(
                            newAttendee.dispName,
                            newAttendee.fullname,
                            requestGuid,
                            requestHasGrdmAccount,
                        );
                    } else {
                        this.setOutsideMsg();
                    }
                }
            })
            .catch(() => {
                this.toast.error(this.intl.t('web_meetings.error.failedToRequest'));
            });
    }

    @action
    setOutsideMsg(this: GuidNodeWebMeetings) {
        this.set(
            'msgOutsideEmail',
            this.intl.t(
                'web_meetings.meetingDialog.invalid.failToRegister',
                { appName: this.displayedWebMeetings },
            ),
        );
    }

    @action
    setDuplicatedMsg(this: GuidNodeWebMeetings) {
        this.set('msgDuplicatedEmail', this.intl.t('web_meetings.meetingDialog.invalid.duplicatedEmail'));
    }

    @action
    setAttendeesList(this: GuidNodeWebMeetings) {
        this.set('showAttendeesList', true);
        this.set('showMeetingsList', false);
    }

    @action
    setMeetingsList(this: GuidNodeWebMeetings) {
        this.set('showAttendeesList', false);
        this.set('showMeetingsList', true);
    }

    @action
    makeRegisterWebMeetingsEmailDialog(
        this: GuidNodeWebMeetings,
        dispName: string,
        fullname: string,
        guid: string,
        hasGrdmAccount: boolean,
    ) {
        this.set('displayedUser', dispName);
        this.set('displayedUserFullname', fullname);
        this.set('displayedUserGuid', guid);
        this.set('displayedUserHasGrdmAccount', hasGrdmAccount);
        if (hasGrdmAccount) {
            this.set('showRegisterWebMeetingsEmailDialog', true);
            this.set('showRegisterWebMeetingsAppEmailDialog', true);
        } else {
            this.set('showRegisterWebMeetingsEmailDialog', true);
            this.set('showRegisterWebMeetingsGuestEmailDialog', true);
        }
    }

    @action
    makeUpdateWebMeetingsEmailDialog(
        this: GuidNodeWebMeetings,
        id: string,
        fullname: string,
        email: string,
        guid: string,
        hasGrdmAccount: boolean,
        appName: string,
    ) {
        this.set('displayedUserId', id);
        this.set('displayedUser', `${fullname}(${email})`);
        this.set('displayedUserFullname', fullname);
        this.set('displayedUserGuid', guid);
        this.set('displayedUserHasGrdmAccount', hasGrdmAccount);
        this.set('displayedWebMeetings', appName);
        this.set('showUpdateWebMeetingsEmailDialog', true);
    }

    @action
    makeDeleteWebMeetingsEmailDialog(
        this: GuidNodeWebMeetings,
        id: string,
        fullname: string,
        email: string,
        appName: string,
    ) {
        this.set('displayedUserId', id);
        this.set('displayedUser', `${fullname}(${email})`);
        this.set('displayedWebMeetings', appName);
        this.set('showDeleteWebMeetingsEmailDialog', true);
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
        appName: string,
    ) {
        this.set('detailMode', false);
        this.set('webMeetingsPk', meetingPk);
        this.set('webMeetingsUpdateMeetingId', meetingId);
        this.set('webMeetingsSubject', subject);
        this.set('webMeetingsAttendees', attendees);
        const selectedDetailAttendees = Object.assign([], this.selectedDetailAttendees);
        this.set('selectedAttendees', selectedDetailAttendees);
        this.set('webMeetingsStartDate', moment(startDatetime).format('YYYY/MM/DD'));
        this.set('webMeetingsStartTime', moment(startDatetime).format('HH:mm'));
        this.set('webMeetingsContent', content);
        this.set('webMeetingsPassword', password);
        this.set('webMeetingsJoinUrl', joinUrl);
        this.setDisplayWebMeetings(appName);

        const dStart = new Date(startDatetime);
        const dEnd = new Date(endDatetime);
        const duration = (dEnd.getTime() - dStart.getTime()) / (60 * 1000);
        const durationHours = Math.floor(duration / 60);
        const durationMinutes = duration % 60;
        this.set('webMeetingsDurationHours', durationHours.toString());
        this.set('webMeetingsDurationMinutes', durationMinutes.toString());
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
        let profileUrl = '';
        let hasGrdmAccount = false;
        let userGuid = '';
        let fullname = '';
        let username = '';
        let institution = '';
        let isActive = true;
        let contrib: ProjectContributors = {} as ProjectContributors;
        const { language } = window.navigator;
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const projectContributors = JSON.parse(appsConfig.projectContributors);
        webMeetingsDetailAttendees.forEach((webMeetingsDetailAttendee: any) => {
            for (const nodeAppAttendee of nodeAppAttendees) {
                if (webMeetingsDetailAttendee === nodeAppAttendee.pk) {
                    hasGrdmAccount = nodeAppAttendee.fields.has_grdm_account;
                    userGuid = nodeAppAttendee.fields.user_guid;
                    fullname = nodeAppAttendee.fields.fullname;
                    contrib = {} as ProjectContributors;
                    if (hasGrdmAccount) {
                        for (const projectContributor of projectContributors) {
                            if (projectContributor.guid === userGuid) {
                                contrib = projectContributor;
                            }
                        }
                    }
                    username = Object.keys(contrib).length ? contrib.username : nodeAppAttendee.fields.email_address;
                    isActive = nodeAppAttendee.fields.is_active;
                    if (!isActive) {
                        username = username.substring(0, username.lastIndexOf('_'));
                    }
                    if (language === 'ja' || language === 'ja-jp' || language === 'ja-JP') {
                        institution = Object.keys(contrib).length ? contrib.institutionJa : '';
                    } else {
                        institution = Object.keys(contrib).length ? contrib.institution : '';
                    }
                    profileUrl = hasGrdmAccount ? profileUrlBase + userGuid : '';
                    this.selectedDetailAttendees.push(
                        {
                            guid: userGuid,
                            dispName: `${fullname}(${username}), ${institution}`,
                            fullname: nodeAppAttendee.fields.fullname,
                            email: username,
                            institution,
                            appUsername: nodeAppAttendee.fields.display_name,
                            appEmail: nodeAppAttendee.fields.email_address,
                            profile: profileUrl,
                            _id: nodeAppAttendee.fields._id,
                            is_guest: nodeAppAttendee.fields.is_guest,
                            has_grdm_account: nodeAppAttendee.fields.has_grdm_account,
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
        appName: string,
        upcomingMeeting: boolean,
    ) {
        if (upcomingMeeting) {
            this.set('upcomingMode', true);
        } else {
            this.set('upcomingMode', false);
        }
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

    webMeetingsInputValidationCheck(
        this: GuidNodeWebMeetings,
        subject: string,
        attendeesNum: number,
        startDate: string,
        startTime: string,
        startDatetime: string,
        endDatetime: string,
        appName: string,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const now = new Date();
        const start = new Date(startDatetime);
        const end = new Date(endDatetime);
        let validFlag = true;

        if (!subject) {
            this.set(
                'msgInvalidSubject',
                this.intl.t(
                    'web_meetings.meetingDialog.invalid.empty',
                    { item: this.intl.t('web_meetings.subject') },
                ),
            );
            validFlag = false;
        } else {
            this.set('msgInvalidSubject', '');
        }

        if (appName !== appsConfig.appNameZoomMeetings) {
            if (!attendeesNum) {
                this.set(
                    'msgInvalidAttendees',
                    this.intl.t(
                        'web_meetings.meetingDialog.invalid.empty',
                        { item: this.intl.t('web_meetings.attendees') },
                    ),
                );
                validFlag = false;
            } else {
                /* eslint-disable max-len */
                const result = (this.selectedAttendees).filter((e, index, self) => self.findIndex(el => el.appEmail === e.appEmail) === index);
                /* eslint-enable max-len */
                this.set('selectedAttendees', result);
            }
        }
        if (!startDate || !startTime) {
            this.set(
                'msgInvalidDatetime',
                this.intl.t(
                    'web_meetings.meetingDialog.invalid.empty',
                    { item: this.intl.t('web_meetings.datetime') },
                ),
            );
            validFlag = false;
        } else if (start < now) {
            this.set('msgInvalidDatetime', this.intl.t('web_meetings.meetingDialog.invalid.datetime.past'));
            validFlag = false;
        } else if (end < start) {
            this.set('msgInvalidDatetime', this.intl.t('web_meetings.meetingDialog.invalid.datetime.endBeforeStart'));
            validFlag = false;
        } else {
            this.set('msgInvalidDatetime', '');
        }
        return validFlag;
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
        const webMeetingsStartTime = webMeetingsStartTimeElement.length ? webMeetingsStartTimeElement[0].value : '';
        const strWebMeetingsStartDatetime = `${webMeetingsStartDate} ${webMeetingsStartTime}`;
        const webMeetingsDurationHoursElement = document.querySelectorAll('select[id=create_web_meetings_duration_hours]').length
            ? document.querySelectorAll('select[id=create_web_meetings_duration_hours]') as any
            : document.querySelectorAll('select[id=update_web_meetings_duration_hours]') as any;
        const webMeetingsDurationMinutesElement = document.querySelectorAll('select[id=create_web_meetings_duration_minutes]').length
            ? document.querySelectorAll('select[id=create_web_meetings_duration_minutes]') as any
            : document.querySelectorAll('select[id=update_web_meetings_duration_minutes]') as any;
        const webMeetingsDurationHours = webMeetingsDurationHoursElement.length ? webMeetingsDurationHoursElement[0].value : '';
        const webMeetingsDurationMinutes = webMeetingsDurationMinutesElement.length ? webMeetingsDurationMinutesElement[0].value : '';
        const webMeetingsDuration = 60 * parseInt(webMeetingsDurationHours, 10) + parseInt(webMeetingsDurationMinutes, 10);
        /* eslint-enable max-len */
        const webMeetingsContent = this.webMeetingsContent as string;
        const webMeetingsPassword = this.webMeetingsPassword as string;
        const dStartDatetime = new Date(strWebMeetingsStartDatetime);
        const browserTzOffset = dStartDatetime.getTimezoneOffset() / 60;
        // Timezone is fixed to JST
        dStartDatetime.setHours(dStartDatetime.getHours() + (browserTzOffset - (-9)));
        const webMeetingsStartDatetime = !isNaN(dStartDatetime.getTime())
            ? moment(dStartDatetime).format('YYYY-MM-DDTHH:mm:ss')
            : '';
        const dEndDatetime = dStartDatetime;
        dEndDatetime.setMinutes(dEndDatetime.getMinutes() + webMeetingsDuration);
        const strWebMeetingsEndDatetime = moment(dEndDatetime).format('YYYY-MM-DDTHH:mm:ss');
        const webMeetingsEndDatetime = !isNaN(dEndDatetime.getTime()) ? strWebMeetingsEndDatetime : '';

        const updateMeetingId = this.webMeetingsUpdateMeetingId;
        const deleteMeetingId = this.webMeetingsDeleteMeetingId;

        const selectedAttendees = this.selectedAttendees as AttendeesInfo[];
        let webexMeetingsCreateInvitees: WebexMeetingsCreateInvitee[] = [];
        let webexMeetingsDeleteInvitees: string[] = [];
        let body = {};
        let contentExtract = '';

        // validation check for input
        if (actionType !== 'delete') {
            if (!this.webMeetingsInputValidationCheck(
                webMeetingsSubject,
                selectedAttendees.length,
                webMeetingsStartDate,
                webMeetingsStartTime,
                webMeetingsStartDatetime,
                webMeetingsEndDatetime,
                this.displayedWebMeetings,
            )) {
                return;
            }
        }
        switch (this.displayedWebMeetings) {
        case appsConfig.appNameMicrosoftTeams: {
            const microsoftTeamsAttendeesInfo = this.makeMicrosoftTeamsAttendees(selectedAttendees);
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
                attendees: microsoftTeamsAttendeesInfo.attendees,
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
                timezone: 'Asia/Tokyo',
            };
            break;
        }
        case appsConfig.appNameZoomMeetings: {
            body = {
                topic: webMeetingsSubject,
                start_time: webMeetingsStartDatetime,
                duration: webMeetingsDuration,
                agenda: webMeetingsContent,
                timezone: 'Asia/Tokyo',
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
            browserTzOffset,
        };

        this.resetValue();

        this.toast.info(this.intl.t('web_meetings.info.launch'));

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
                }
                return res.json();
            })
            .then(data => {
                this.save();
                if (data.errCode === 401) {
                    this.toast.error(this.intl.t('web_meetings.error.notAuth'));
                } else if (data.errCode === 403) {
                    this.toast.error(this.intl.t('web_meetings.error.forbbiden'));
                } else if (data.errCode) {
                    this.toast.error(`Error:${data.errCode}`);
                }
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
                        address: selectedAttendee.appEmail,
                        name: selectedAttendee.appUsername ? selectedAttendee.appUsername : 'Unregistered',
                    },
                },
            );
        });

        return {
            attendees: microsoftTeamsAttendees,
        };
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
                    email: selectedAttendee.appEmail,
                },
            );
        });

        if (actionType === 'update') {
            selectedAttendees.forEach((selectedAttendee: any) => {
                arrayAttendees.push(selectedAttendee.appEmail);

                nodeWebexMeetingsAttendees.forEach((nodeWebexMeetingsAttendee: any) => {
                    if (selectedAttendee.appEmail === nodeWebexMeetingsAttendee.fields.email_address
                        && nodeWebexMeetingsAttendee.fields.is_active) {
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
                    if (this.webMeetingsPk === relation.fields.meeting) {
                        if (arrayDeleteAttendeePk === relation.fields.attendee) {
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

    makeContributorList(
        this: GuidNodeWebMeetings,
        nodeAppAttendees: NodeAppAttendees[],
        projectContributors: ProjectContributors[],
        addRegisteredContrib: boolean,
    ) {
        let projectContributorList: AttendeesInfo[] = [];
        let unregisteredProjectContributorList: AttendeesInfo[] = [];
        const registeredProjectContributors: AttendeesInfo[] = [];
        const unregisteredProjectContributors: AttendeesInfo[] = [];
        const guestUsers: AttendeesInfo[] = [];
        const addGuestLabel = {
            guid: 'addGuest',
            dispName: this.intl.t('web_meetings.addAttendee'),
            fullname: '',
            email: '',
            institution: '',
            appUsername: '',
            appEmail: '',
            profile: '',
            _id: '',
            is_guest: false,
            has_grdm_account: false,
        };
        let fullname = '';
        let username = '';
        let institution = '';
        const { language } = window.navigator;
        for (let i = 0; i < projectContributors.length; i++) {
            fullname = projectContributors[i].fullname;
            username = projectContributors[i].username;
            if (language === 'ja' || language === 'ja-jp' || language === 'ja-JP') {
                institution = projectContributors[i].institutionJa;
            } else {
                institution = projectContributors[i].institution;
            }
            unregisteredProjectContributors.push(
                {
                    guid: projectContributors[i].guid,
                    dispName: `${fullname}(${username}), ${institution}`,
                    fullname,
                    email: username,
                    institution,
                    appUsername: '',
                    appEmail: '',
                    profile: profileUrlBase + projectContributors[i].guid,
                    _id: '',
                    is_guest: false,
                    has_grdm_account: true,
                },
            );
            for (const nodeAppAttendee of nodeAppAttendees) {
                if (projectContributors[i].guid === nodeAppAttendee.fields.user_guid) {
                    fullname = projectContributors[i].fullname;
                    username = projectContributors[i].username;
                    registeredProjectContributors.push(
                        {
                            guid: projectContributors[i].guid,
                            dispName: `${fullname}(${username}), ${institution}`,
                            fullname,
                            email: username,
                            institution,
                            appUsername: nodeAppAttendee.fields.display_name,
                            appEmail: nodeAppAttendee.fields.email_address,
                            profile: profileUrlBase + projectContributors[i].guid,
                            _id: nodeAppAttendee.fields._id,
                            is_guest: nodeAppAttendee.fields.is_guest,
                            has_grdm_account: true,
                        },
                    );

                    unregisteredProjectContributors.pop();
                }
                if (i === 0) {
                    if (nodeAppAttendee.fields.is_active && !(nodeAppAttendee.fields.has_grdm_account)) {
                        fullname = nodeAppAttendee.fields.fullname;
                        username = nodeAppAttendee.fields.email_address;
                        guestUsers.push(
                            {
                                guid: nodeAppAttendee.fields.user_guid,
                                dispName: `${fullname}(${username})`,
                                fullname,
                                email: username,
                                institution: '',
                                appUsername: nodeAppAttendee.fields.display_name,
                                appEmail: nodeAppAttendee.fields.email_address,
                                profile: '',
                                _id: nodeAppAttendee.fields._id,
                                is_guest: true,
                                has_grdm_account: false,
                            },
                        );
                    }
                }
            }
        }

        if (addRegisteredContrib) {
            projectContributorList = projectContributorList.concat(this.selectedAttendees);
            projectContributorList = projectContributorList.concat(registeredProjectContributors);
            /* eslint-disable max-len */
            unregisteredProjectContributorList = unregisteredProjectContributorList.concat(unregisteredProjectContributors);
            /* eslint-enable max-len */
            return {
                registered: projectContributorList,
                unregistered: unregisteredProjectContributorList,
                all: [],
            };
        }
        projectContributorList = projectContributorList.concat(registeredProjectContributors);
        projectContributorList = projectContributorList.concat(unregisteredProjectContributors);
        projectContributorList = projectContributorList.concat(guestUsers);
        projectContributorList = projectContributorList.concat(addGuestLabel);
        return {
            registered: [],
            unregistered: [],
            all: projectContributorList,
        };
    }

    @computed('config.projectContributors')
    get projectContributors() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const projectContributors = JSON.parse(appsConfig.projectContributors);
        return projectContributors;
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

    @computed('config.{projectContributors,nodeMicrosoftTeamsAttendees}')
    get possibleAttendeesMicrosoftTeams() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const projectContributors = JSON.parse(appsConfig.projectContributors);
        const nodeMicrosoftTeamsAttendees = JSON.parse(appsConfig.nodeMicrosoftTeamsAttendees);
        const nodeMicrosoftTeamsAttendeesAsContributor = this.makeContributorList(
            nodeMicrosoftTeamsAttendees,
            projectContributors,
            false,
        );
        return nodeMicrosoftTeamsAttendeesAsContributor.all;
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

    @computed('config.{projectContributors,nodeWebexMeetingsAttendees}')
    get possibleAttendeesWebexMeetings() {
        if (!this.config) {
            return '';
        }
        const appsConfig = this.config.content as WebMeetingsConfigModel;
        const projectContributors = JSON.parse(appsConfig.projectContributors);
        const nodeWebexMeetingsAttendees = JSON.parse(appsConfig.nodeWebexMeetingsAttendees);
        const nodeWebexMeetingsAttendeesAsContributor = this.makeContributorList(
            nodeWebexMeetingsAttendees,
            projectContributors,
            false,
        );
        return nodeWebexMeetingsAttendeesAsContributor.all;
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
