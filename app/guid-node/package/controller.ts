import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import { task } from 'ember-concurrency-decorators';
import config from 'ember-get-config';
import Intl from 'ember-intl/services/intl';
import { SelectionManager } from 'ember-osf-web/guid-node/package/selection';
import FileProviderModel from 'ember-osf-web/models/file-provider';
import Node from 'ember-osf-web/models/node';
import CurrentUser from 'ember-osf-web/services/current-user';
import StatusMessages from 'ember-osf-web/services/status-messages';
import { addPathSegment } from 'ember-osf-web/utils/url-parts';
import Toast from 'ember-toastr/services/toast';

const {
    OSF: {
        url: host,
        webApiNamespace: namespace,
    },
} = config;

/* eslint-disable camelcase */
interface ExportingProgressInformation {
    file_url?: string;
}
/* eslint-enable camelcase */

interface ExportingProgress {
    state?: string;
    info?: ExportingProgressInformation;
}

export default class GuidNodePackage extends Controller {
    @service toast!: Toast;
    @service intl!: Intl;
    @service statusMessages!: StatusMessages;
    @service currentUser!: CurrentUser;

    @reads('model.taskInstance.value')
    node?: Node;

    loading = true;
    exporting = false;
    opening = false;

    selectionManager = new SelectionManager();

    wikiEnabled = true;
    commentEnabled = true;
    logEnabled = true;

    destinationProvider = '';

    phase = 0;

    @computed('phase')
    get phaseFiles() {
        return this.phase === 0;
    }

    @computed('phase')
    get phaseExportTarget() {
        return this.phase === 1;
    }

    @task
    getRelatedAttrs = task(function *(this: GuidNodePackage) {
        yield this.model.taskInstance;
        this.set('loading', false);
    });

    @action
    goToNext() {
        this.set('phase', this.get('phase') + 1);
    }

    @action
    goToPrevious() {
        this.set('phase', this.get('phase') - 1);
    }

    @action
    export() {
        this.performExport()
            .catch(error => {
                this.toast.error(error.toString());
            });
    }

    getDefaultStorage(allProviders: FileProviderModel[]): FileProviderModel {
        const providers = allProviders.filter(f => f.name === 'osfstorage');
        if (providers.length > 0) {
            return providers[0];
        }
        const instProviders = allProviders.filter(f => f.forInstitutions);
        if (instProviders.length === 0) {
            throw new EmberError('No default storages');
        }
        // Sort storages by name
        instProviders.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        return instProviders[0];
    }

    async performExport() {
        if (!this.node) {
            throw new Error('Node not loaded');
        }
        this.set('exporting', true);
        const apiPath = addPathSegment(
            'project',
            addPathSegment(this.node.id, 'metadata/packages/'),
        );
        const url = addPathSegment(host, addPathSegment(namespace, apiPath));
        const files = Object.keys(this.selectionManager.checked).map(materialized => ({
            materialized,
            enable: this.selectionManager.checked[materialized],
        }));
        const allProviders = await this.node.loadAll('files');
        const defaultStorage = await this.getDefaultStorage(allProviders);
        const addons: any = {
            weko: {
                enable: false,
            },
        };
        addons[defaultStorage.name] = {
            files,
        };
        const resp = await this.currentUser.authenticatedAJAX({
            url,
            type: 'PUT',
            xhrFields: {
                withCredentials: true,
            },
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                addons,
                wiki: {
                    enable: this.wikiEnabled,
                },
                comment: {
                    enable: this.commentEnabled,
                },
                log: {
                    enable: this.logEnabled,
                },
                destination: {
                    provider: this.destinationProvider,
                },
            }),
        });
        const { progress_api_url: progressApiUrl } = resp;
        later(async () => {
            await this.checkProgress(addPathSegment(host, progressApiUrl));
        }, 500);
    }

    async checkProgress(progressApiUrl: string) {
        const resp = await this.currentUser.authenticatedAJAX({
            url: progressApiUrl,
            type: 'GET',
            xhrFields: { withCredentials: true },
        });
        const progress = resp as ExportingProgress;
        if (progress.state === 'SUCCESS') {
            if (progress.info && progress.info.file_url) {
                this.set('opening', true);
                window.location.href = `${progress.info.file_url}#edit-metadata`;
            } else {
                this.set('exporting', false);
            }
            return;
        }
        if (progress.state === 'FAILURE') {
            this.set('exporting', false);
            const { error } = resp;
            this.toast.error(error.toString());
            return;
        }
        later(async () => {
            await this.checkProgress(progressApiUrl);
        }, 500);
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/package': GuidNodePackage;
    }
}
