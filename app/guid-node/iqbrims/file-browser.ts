import { A } from '@ember/array';
import EmberObject, { action, computed } from '@ember/object';
import { all, timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

import File from 'ember-osf-web/models/file';
import Node from 'ember-osf-web/models/node';

import GuidNodeIQBRIMS from './controller';

export default class IQBRIMSFileBrowser extends EmberObject {
    static readonly FILES_TXT = '.files.txt';

    folderName: string | null = null;
    owner: GuidNodeIQBRIMS | null = null;

    filter: string = this.filter || '';
    sort: string = this.sort || 'name';
    newFolderRequest?: object;
    gdLoading = true;
    filled = false;
    hasError = false;
    rejectedFiles: string[] = [];
    acceptExtensions: string[] | null = null;
    rejectExtensions: string[] | null = null;
    indexFile: File | null = null;
    targetDirectory: File | undefined = undefined;
    allFiles: File[] | undefined = undefined;
    gdTargetDirectory: File | undefined = undefined;
    gdAllFiles: File[] | undefined = undefined;

    dropzoneOptions = {
        createImageThumbnails: false,
        method: 'PUT',
        withCredentials: true,
        preventMultipleFiles: false,
        acceptDirectories: false,
        timeout: 1000 * 60 * 60 * 48,
        maxFilesize: null,
    };

    @computed('allFiles.[]')
    get loading(): boolean {
        if (!this.get('allFiles')) {
            return true;
        }
        return false;
    }

    @task({ restartable: true })
    updateFilter = task(function *(this: IQBRIMSFileBrowser, filter: string) {
        yield timeout(250);
        this.setProperties({ filter });
    });

    @task
    flash = task(function *(item: File, message: string, type: string = 'success', duration: number = 2000) {
        item.set('flash', { message, type });
        yield timeout(duration);
        item.set('flash', null);
    });

    @task
    addFile = task(function *(this: IQBRIMSFileBrowser, id: string) {
        const allFiles = this.get('allFiles');
        if (!allFiles || !this.owner) {
            return;
        }
        const duplicate = allFiles.findBy('id', id);

        const file = yield this.owner.get('store')
            .findRecord('file', id, duplicate ? {} : { adapterOptions: { query: { create_guid: 1 } } });

        if (duplicate) {
            allFiles.removeObject(duplicate);
        }

        allFiles.pushObject(file);
        this.notifyChange();

        if (duplicate) {
            return;
        }

        const intl = this.owner.get('intl');
        this.owner.get('toast').success(intl.t('file_browser.file_added_toast'));
        this.get('flash').perform(file, intl.t('file_browser.file_added'));
    });

    @task
    deleteFile = task(function *(this: IQBRIMSFileBrowser, file: File) {
        if (!this.owner) {
            return;
        }
        try {
            yield file.destroyRecord();
            yield this.get('flash').perform(file, this.owner.get('intl').t('file_browser.file_deleted'), 'danger');
            const allFiles = this.get('allFiles');
            if (!allFiles) {
                return;
            }
            allFiles.removeObject(file);
            this.notifyChange();
        } catch (e) {
            yield this.get('flash').perform(file, this.owner.get('intl').t('file_browser.delete_failed'), 'danger');
        }
    });

    @task
    deleteFiles = task(function *(this: IQBRIMSFileBrowser, files: File[]) {
        const deleteFile = this.get('deleteFile');

        yield all(files.map(file => deleteFile.perform(file)));
    });

    @task
    moveFile = task(function *(this: IQBRIMSFileBrowser, file: File, node: Node): IterableIterator<any> {
        if (!this.owner) {
            return;
        }
        try {
            yield file.move(node);
            yield this.get('flash').perform(file, this.owner.get('intl').t('file_browser.successfully_moved'));
            const allFiles = this.get('allFiles');
            if (!allFiles) {
                return;
            }
            allFiles.removeObject(file);
            this.notifyChange();
        } catch (ex) {
            this.owner.get('toast').error(this.owner.get('intl').t('move_to_project.could_not_move_file'));
        }
    });

    @task
    renameFile = task(function *(
        this: IQBRIMSFileBrowser,
        file: File,
        name: string,
        conflict?: string,
        conflictingFile?: File,
    ) {
        if (!this.owner) {
            return;
        }
        const flash = this.get('flash');

        try {
            yield file.rename(name, conflict);

            // intentionally not yielded
            flash.perform(file, this.owner.get('intl').t('file_browser.successfully_renamed'));

            if (conflictingFile) {
                yield flash.perform(conflictingFile, this.owner.get('intl').t('file_browser.file_replaced'), 'danger');
                const allFiles = this.get('allFiles');
                if (!allFiles) {
                    return;
                }
                allFiles.removeObject(conflictingFile);
            }
            this.notifyChange();
        } catch (ex) {
            yield this.get('flash').perform(file, this.owner.get('intl').t('file_browser.rename_failed'), 'danger');
        }
    });

    @task
    prepareDefaultStorageFiles = task(function *(this: IQBRIMSFileBrowser, workingDirectory: File) {
        let storageFiles: [File] = yield workingDirectory.loadAll('files');
        let files = storageFiles.filter(f => f.name === this.folderName);
        if (files.length === 0) {
            yield this.createTargetDirectory.perform(workingDirectory);
            yield workingDirectory.reload();
            storageFiles = yield workingDirectory.get('files');
            files = storageFiles.filter(f => f.name === this.folderName);
        }
        const targetDirectory = files[0];
        this.set('targetDirectory', targetDirectory);
        const fileList: [File] = yield targetDirectory.loadAll('files');
        const allFiles = fileList.filter(this.filterFiles);
        const indexFiles = fileList.filter(f => !this.filterFiles(f));
        this.set('indexFile', indexFiles.length > 0 ? indexFiles[0] : null);
        this.notifyFilled(allFiles);
        this.set('allFiles', allFiles);
    });

    @task
    createTargetDirectory = task(function *(this: IQBRIMSFileBrowser, workingDirectory: File) {
        if (!this.owner || !this.folderName) {
            throw new Error('Illegal state');
        }
        const newFolderUrl = workingDirectory.get('links').new_folder;
        yield this.owner.currentUser.authenticatedAJAX({
            url: `${newFolderUrl}&name=${encodeURIComponent(this.folderName)}`,
            type: 'PUT',
        });
    });

    @task
    loadGoogleDriveFiles = task(function *(this: IQBRIMSFileBrowser, storageFiles: [File]) {
        const files = storageFiles.filter(f => f.name === this.folderName);
        if (files.length === 0) {
            this.set('gdAllFiles', []);
            this.set('gdLoading', false);
            return;
        }
        const targetDirectory = files[0];
        this.set('gdTargetDirectory', targetDirectory);
        this.set('gdLoading', false);
        const fileList: [File] = yield targetDirectory.loadAll('files');
        const allFiles = fileList.filter(this.filterFiles);
        this.set('gdAllFiles', allFiles);
    });

    @computed('allFiles.[]', 'filter', 'sort')
    get files(): File[] | null {
        const filter: string = this.get('filter');
        const sort: string = this.get('sort');

        let results: File[] | undefined | null = this.get('allFiles');
        if (!results) {
            return null;
        }

        if (filter) {
            const filterLowerCase = filter.toLowerCase();
            results = results.filter(file => file.get('name').toLowerCase().includes(filterLowerCase));
        }

        if (sort) {
            const reverse: boolean = sort.slice(0, 1) === '-';

            results = A(results).sortBy(sort.slice(+reverse));

            if (reverse) {
                results = results.reverse();
            }
        }

        return results;
    }

    @computed('currentUser.currentUserId', 'user.id')
    get canEdit(): boolean {
        return true;
    }

    @action
    async openFile(this: IQBRIMSFileBrowser, file: File, show: string) {
        if (!this.owner) {
            return;
        }
        const guid = file.get('guid') || await file.getGuid();

        this.owner.transitionToRoute('guid-file', guid, { queryParams: { show } });
    }

    buildUrl(files: File[]) {
        const { name } = files[0];
        const dir = this.targetDirectory;
        if (!dir) {
            return undefined;
        }
        return `${dir.links.upload}?${$.param({ name })}`;
    }

    notifyChange() {
        const files = this.allFiles;
        if (files == null) {
            this.notifyFilled([]);
        } else {
            this.notifyFilled(files);
        }
    }

    notifyFilled(files: File[]) {
        let rejectedFiles: string[] = [];
        if (files.length === 0) {
            this.set('filled', false);
        } else if (this.acceptExtensions != null) {
            const extensions = this.acceptExtensions;
            const rejecteds = files.filter(file => !extensions.includes(this.getExtension(file.get('name'))));
            this.set('filled', rejecteds.length === 0);
            rejectedFiles = rejecteds.map(file => file.get('name'));
        } else if (this.rejectExtensions != null) {
            const extensions = this.rejectExtensions;
            const rejecteds = files.filter(file => extensions.includes(this.getExtension(file.get('name'))));
            this.set('filled', rejecteds.length === 0);
            rejectedFiles = rejecteds.map(file => file.get('name'));
        } else {
            this.set('filled', true);
        }
        this.set('rejectedFiles', rejectedFiles);
        this.set('hasError', rejectedFiles.length > 0);
    }

    getExtension(filename: string) {
        if (filename == null) {
            return '';
        }
        const pos = filename.lastIndexOf('.');
        if (pos <= 0) {
            return filename;
        }
        return filename.substring(pos).toLowerCase();
    }

    filterFiles(f: File) {
        return f.name !== IQBRIMSFileBrowser.FILES_TXT;
    }
}
