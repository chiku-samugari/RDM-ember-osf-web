import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember-decorators/object';
import { reads } from '@ember-decorators/object/computed';
import { service } from '@ember-decorators/service';

import DS from 'ember-data';

import IntegromatConfigModel from 'ember-osf-web/models/integromat-config';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import StatusMessages from 'ember-osf-web/services/status-messages';
import Toast from 'ember-toastr/services/toast';

import $ from 'jquery';

export default class GuidNodeIntegromat extends Controller {
    @service toast!: Toast;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;

    @reads('model.taskInstance.value')
    node?: Node;

    isPageDirty = false;

    configCache?: DS.PromiseObject<IntegromatConfigModel>;

    showCreateMicrosoftTeamsMeetingDialog = false;

    showWorkflows = true;
    showMicrosoftTeamsMeetings = false;

    teams_subject = '';
    teams_attendees = '';
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
    startCreateMeetingScenario(this: GuidNodeIntegromat) {

        if (!this.config) {
            throw new EmberError('Illegal config');
        }

        const config = this.config.content as IntegromatConfigModel;
        const webhookUrl = config.webhook_url;
        const node_id = config.node_settings_id;
        const app_name = config.app_name_microsoft_teams;
        const guid = this.model.guid;
        const info_grdm_scenario_processing = config.info_grdm_scenario_processing
        const teams_subject = this.teams_subject;
        const teams_attendees = this.teams_attendees;
        const teams_startDate = this.teams_startDate;
        const teams_startTime = this.teams_startTime;
        const teams_start_date_time = teams_startDate + ' ' + teams_startTime
        const teams_endDate = this.teams_endDate;
        const teams_endTime = this.teams_endTime;
        const teams_end_date_time = teams_endDate + ' ' + teams_endTime
        const teams_location = this.teams_location;
        const teams_content = this.teams_content;
        
        const payload = {
                "Node Id": node_id,
                "Meeting App Name": app_name,
                "guid": guid,
                "Action": 'createMicrosoftTeamsMeeting',
                "infoGrdmScenarioProcessing": info_grdm_scenario_processing,
                "Start Date": teams_start_date_time,
                "End Date": teams_end_date_time,
                "Subject": teams_subject,
                "Attendees": teams_attendees,
                "Location": teams_location,
                "Content": teams_content
                };

        this.set('showCreateMicrosoftTeamsMeetingDialog', false);

        return $.post(webhookUrl, payload)

    }

    @action
    closeDialogs() {
        this.set('showCreateMicrosoftTeamsMeetingDialog', false);
    }

    saveError(config: IntegromatConfigModel) {
        config.rollbackAttributes();
        const message = 'integromat.failed_to_save';
        this.toast.error(message);
    }

    @computed('config.microsoft_teams_meetings')
    get microsoft_teams_meetings() {
        if (!this.config || !this.config.get('isFulfilled')) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const microsoft_teams_meetings = JSON.parse(config.microsoft_teams_meetings);
        return microsoft_teams_meetings;
    }

    @computed('config.workflows')
    get workflows() {
        if (!this.config || !this.config.get('isFulfilled')) {
            return '';
        }
        const config = this.config.content as IntegromatConfigModel;
        const workflows = JSON.parse(config.workflows);
        return workflows;
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