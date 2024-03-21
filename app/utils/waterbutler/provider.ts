import { FileProviderLinks } from 'ember-osf-web/models/file-provider';
import CurrentUser from 'ember-osf-web/services/current-user';
import getHref from 'ember-osf-web/utils/get-href';
import { AbstractFile, FilesResponse, Metadata, WaterButlerFile } from './base';
import DefaultWaterButlerFile from './file';

export default class WaterButlerFileProvider extends AbstractFile implements WaterButlerFile {
    links!: FileProviderLinks;

    constructor(currentUser: CurrentUser, metadata: Metadata, links: FileProviderLinks) {
        super(currentUser, metadata);
        this.links = links;
    }

    get filesURL(): string {
        const link = this.links.upload;
        return getHref(link);
    }

    get deleteURL(): string {
        const link = this.links.delete;
        return getHref(link);
    }

    get uploadURL(): string {
        const link = this.links.upload;
        return getHref(link);
    }

    get downloadURL(): string | undefined {
        const link = this.links.download;
        if (!link) {
            return undefined;
        }
        return getHref(link);
    }

    get htmlURL(): string | undefined {
        const link = this.links.html;
        if (!link) {
            return undefined;
        }
        return getHref(link);
    }

    wrap(file: FilesResponse): WaterButlerFile {
        if (file.type !== 'files') {
            throw new Error(`Unknown type: ${file.type}`);
        }
        return new DefaultWaterButlerFile(this.currentUser, file);
    }
}
