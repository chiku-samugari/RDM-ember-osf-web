import CurrentUser from 'ember-osf-web/services/current-user';
import { AbstractFile, FilesResponse, WaterButlerFile } from './base';

export default class DefaultWaterButlerFile extends AbstractFile {
    file: FilesResponse;

    constructor(currentUser: CurrentUser, file: FilesResponse) {
        super(currentUser, file.attributes);
        this.file = file;
    }

    get filesURL(): string {
        return this.file.links.delete!;
    }

    get deleteURL(): string {
        return this.file.links.delete!;
    }

    get uploadURL(): string {
        return this.file.links.delete!;
    }

    get downloadURL(): string | undefined {
        return this.file.links.delete!;
    }

    get htmlURL(): string | undefined {
        return undefined;
    }

    wrap(file: FilesResponse): WaterButlerFile {
        if (file.type !== 'files') {
            throw new Error(`Unknown type: ${file.type}`);
        }
        return new DefaultWaterButlerFile(this.currentUser, file);
    }
}
