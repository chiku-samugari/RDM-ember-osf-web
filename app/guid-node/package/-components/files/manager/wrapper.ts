import EmberError from '@ember/error';
import { WaterButlerFile } from 'ember-osf-web/utils/waterbutler/base';

export class WaterButlerFileWrapper implements WaterButlerFile {
    public parentFolder: WaterButlerFileWrapper | null;
    private file: WaterButlerFile;
    private cachedFiles: WaterButlerFile[] | null = null;

    constructor(parentFolder: WaterButlerFileWrapper | null, file: WaterButlerFile) {
        this.parentFolder = parentFolder;
        this.file = file;
    }

    async load() {
        if (this.cachedFiles !== null) {
            return this.cachedFiles;
        }
        this.cachedFiles = await this.file.files;
        return this.cachedFiles;
    }

    get provider() {
        return this.file.provider;
    }

    get name() {
        return this.file.name;
    }

    get path() {
        return this.file.path;
    }

    get materializedPath() {
        return this.file.materializedPath;
    }

    get dateModified() {
        return this.file.dateModified;
    }

    get isFile() {
        return this.file.isFile;
    }

    get files(): WaterButlerFile[] {
        const { cachedFiles } = this;
        if (cachedFiles === null) {
            throw new EmberError('Files not loaded');
        }
        return cachedFiles;
    }

    get htmlURL() {
        return this.file.htmlURL;
    }

    reload() {
        return this.file.reload();
    }

    getContents() {
        return this.file.getContents();
    }

    updateContents(data: string) {
        return this.file.updateContents(data);
    }

    createFile(name: string, data: string) {
        return this.file.createFile(name, data);
    }

    delete() {
        return this.file.delete();
    }
}
