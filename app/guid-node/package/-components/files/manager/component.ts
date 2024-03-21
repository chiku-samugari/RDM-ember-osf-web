import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { camelize } from '@ember/string';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';
import Intl from 'ember-intl/services/intl';
import Toast from 'ember-toastr/services/toast';

import { layout } from 'ember-osf-web/decorators/component';
import FileProvider from 'ember-osf-web/models/file-provider';
import Node from 'ember-osf-web/models/node';
import CurrentUser from 'ember-osf-web/services/current-user';
import { WaterButlerFile } from 'ember-osf-web/utils/waterbutler/base';
import { wrap } from 'ember-osf-web/utils/waterbutler/wrap';

import template from './template';
import { WaterButlerFileWrapper } from './wrapper';

export interface WaterButlerFilesManager {
    loading: boolean;
    loadingFolderItems: boolean;
    canEdit: boolean;
    sort: string;
    inRootFolder: boolean;
    currentFolder: WaterButlerFile;
    rootFolder: WaterButlerFile;
    displayedItems: WaterButlerFile[];
    fileProvider: FileProvider;
    getParentFolder: (item: WaterButlerFile) => WaterButlerFile | null;
    goToFolder: (item: WaterButlerFile) => void;
    goToParentFolder: (item: WaterButlerFile) => void;
    onSelectFile?: (item: WaterButlerFile) => void;
    sortItems: (sort: string) => void;
}

type SortKey = 'date_modified' | '-date_modified' | 'name' | '-name';

@tagName('')
@layout(template)
export default class WaterButlerFilesManagerComponent extends Component
    implements WaterButlerFilesManager {
    @service intl!: Intl;
    @service store!: DS.Store;
    @service toast!: Toast;
    @service currentUser!: CurrentUser;

    node!: Node;

    fileProvider!: FileProvider;
    currentFolder!: WaterButlerFileWrapper;
    rootFolder!: WaterButlerFileWrapper;
    nestedFolders: WaterButlerFile[] = [];
    sort: SortKey = 'date_modified';

    @alias('node.userHasAdminPermission') canEdit!: boolean;
    @alias('getRootItems.isRunning') loading!: boolean;
    @alias('getCurrentFolderItems.isRunning') loadingFolderItems!: boolean;

    @computed('currentFolder', 'page')
    get maxFilesDisplayed() {
        if (!this.currentFolder) {
            return 0;
        }
        return this.currentFolder.files.length;
    }

    @computed('currentFolder')
    get inRootFolder() {
        const { currentFolder } = this;
        return !(currentFolder && currentFolder.parentFolder);
    }

    @computed('currentFolder', 'sort', 'maxFilesDisplayed')
    get displayedItems() {
        if (!this.currentFolder) {
            return [];
        }

        let sortedItems: WaterButlerFile[] = this.currentFolder.files;

        if (this.sort) {
            const regex = /^(-?)([-\w]+)/;
            const groups = regex.exec(this.sort)!;

            groups.shift();
            const [reverse, sortKey] = groups.slice(0, 2);

            sortedItems = sortedItems.sortBy(camelize(sortKey));

            if (reverse) {
                sortedItems = sortedItems.reverse();
            }
            sortedItems = sortedItems.slice(0, this.maxFilesDisplayed);
        }

        return sortedItems;
    }

    @task({ restartable: true, on: 'didReceiveAttrs' })
    getRootItems = task(function *(this: WaterButlerFilesManagerComponent) {
        assert('@node is required', Boolean(this.node));

        const fileProviders = yield this.node.loadAll('files');
        const fileProvider = this.getDefaultStorage(fileProviders) as FileProvider;
        const rootFolder = (yield wrap(this.currentUser, fileProvider)) as WaterButlerFile;
        const wrapper = new WaterButlerFileWrapper(null, rootFolder);

        yield wrapper.load();

        this.setProperties({
            fileProvider,
            rootFolder,
            currentFolder: wrapper,
        });
    });

    @task
    getCurrentFolderItems = task(function *(
        this: WaterButlerFilesManagerComponent,
        targetFolder: WaterButlerFileWrapper,
    ) {
        yield targetFolder.load();
        this.set('currentFolder', targetFolder);
    });

    getDefaultStorage(allProviders: FileProvider[]): FileProvider {
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

    getParentFolder(file: WaterButlerFile): WaterButlerFile | null {
        const wrapper = file as WaterButlerFileWrapper;
        return wrapper.parentFolder ? wrapper.parentFolder : null;
    }

    @action
    goToParentFolder(currentFolder: WaterButlerFile) {
        const wrapper = currentFolder as WaterButlerFileWrapper;
        if (!wrapper.parentFolder) {
            throw new EmberError('No parent folder');
        }
        this.setProperties({ currentFolder: wrapper.parentFolder });
    }

    @action
    goToFolder(targetFolder: WaterButlerFile) {
        const folder = new WaterButlerFileWrapper(this.currentFolder, targetFolder);
        this.getCurrentFolderItems.perform(folder);
    }

    @action
    sortItems(sort: string) {
        this.setProperties({ sort });
    }
}
