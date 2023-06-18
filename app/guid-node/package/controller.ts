import Controller from '@ember/controller';
import { action, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import { task } from 'ember-concurrency-decorators';
import config from 'ember-get-config';
import Intl from 'ember-intl/services/intl';
import { SelectionManager } from 'ember-osf-web/guid-node/package/selection';
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

    selectionManager = new SelectionManager();

    wikiEnabled = true;
    commentEnabled = true;
    logEnabled = true;

    editingCreatorName?: string;
    editingCreatorAffiliationName?: string;
    editingCategory?: string;
    editingProjectDescription?: string;
    editingLicense?: string;

    phase = 0;

    @computed('phase')
    get phaseFiles() {
        return this.phase === 0;
    }

    @computed('phase')
    get phaseProjectInfo() {
        return this.phase === 1;
    }

    @computed('phase')
    get phaseExportTarget() {
        return this.phase === 2;
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

    @computed('node', 'editingCreatorName')
    get creatorName() {
        if (this.editingCreatorName !== undefined) {
            return this.editingCreatorName;
        }
        if (!this.node) {
            return '';
        }
        return this.node.get('creator').get('fullName');
    }

    set creatorName(value: string) {
        if (this.creatorName === value) {
            return;
        }
        this.set('editingCreatorName', value);
    }

    @computed('node', 'editingCreatorAffiliationName')
    get creatorAffiliationName() {
        if (this.editingCreatorAffiliationName !== undefined) {
            return this.editingCreatorAffiliationName;
        }
        if (!this.node) {
            return '';
        }
        const employment = this.node.get('creator').get('employment');
        if (!employment) {
            return '';
        }
        return employment[0].institution;
    }

    set creatorAffiliationName(value: string) {
        if (this.creatorAffiliationName === value) {
            return;
        }
        this.set('editingCreatorAffiliationName', value);
    }

    @computed('node', 'editingCategory')
    get category() {
        if (this.editingCategory !== undefined) {
            return this.editingCategory;
        }
        if (!this.node) {
            return '';
        }
        return this.node.get('category').toString();
    }

    set category(value: string) {
        if (this.category === value) {
            return;
        }
        this.set('editingCategory', value);
    }

    @computed('node', 'editingProjectDescription')
    get projectDescription() {
        if (this.editingProjectDescription !== undefined) {
            return this.editingProjectDescription;
        }
        if (!this.node) {
            return '';
        }
        return this.node.get('description');
    }

    set projectDescription(value: string) {
        if (this.projectDescription === value) {
            return;
        }
        this.set('editingProjectDescription', value);
    }

    @computed('node', 'editingLicense')
    get license() {
        if (this.editingLicense !== undefined) {
            return this.editingLicense;
        }
        if (!this.node) {
            return '';
        }
        return this.node.get('license').get('name');
    }

    set license(value: string) {
        if (this.license === value) {
            return;
        }
        this.set('editingLicense', value);
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
                node: {
                    creator: {
                        name: this.creatorName,
                        affiliation: this.creatorAffiliationName,
                    },
                    description: this.projectDescription,
                    license: this.license,
                    category: this.category,
                },
                addons: {
                    weko: {
                        enable: false,
                    },
                    osfstorage: {
                        files,
                    },
                },
                wiki: {
                    enable: this.wikiEnabled,
                },
                comment: {
                    enable: this.commentEnabled,
                },
                log: {
                    enable: this.logEnabled,
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
            this.set('exporting', false);
            if (progress.info && progress.info.file_url) {
                window.location.href = progress.info.file_url;
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
