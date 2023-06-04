import CurrentUser from 'ember-osf-web/services/current-user';

export interface WaterButlerFile {
    name: string;

    path: string;

    files: Promise<WaterButlerFile[]> | WaterButlerFile[];

    htmlURL: string | undefined;

    reload: () => Promise<WaterButlerFile>;

    getContents: () => Promise<object>;

    updateContents: (data: string) => Promise<void>;

    createFile: (name: string, data: string) => Promise<void>;

    delete: () => Promise<void>;
}

export interface Metadata {
    kind: string | undefined;

    name: string;

    path: string;

    provider: string;
}

export interface FilesResponseLinks {
    move?: string;

    upload?: string;

    delete?: string;
}

export interface FilesResponse {
    type: string;

    id: string;

    attributes: Metadata;

    links: FilesResponseLinks;
}

export abstract class AbstractFile implements WaterButlerFile {
    currentUser!: CurrentUser;

    metadata: Metadata;

    cachedContent: WaterButlerFile[] | null = null;

    constructor(currentUser: CurrentUser, metadata: Metadata) {
        this.currentUser = currentUser;
        this.metadata = metadata;
    }

    get name() {
        return this.metadata.name;
    }

    get path() {
        return this.metadata.path;
    }

    abstract get filesURL(): string;

    abstract get deleteURL(): string;

    abstract get htmlURL(): string | undefined;

    abstract get downloadURL(): string | undefined;

    abstract get uploadURL(): string;

    get isFile(): boolean {
        return this.metadata.kind === 'file';
    }

    get files(): Promise<WaterButlerFile[]> | WaterButlerFile[] {
        if (this.cachedContent) {
            return this.cachedContent;
        }
        return this.loadFiles();
    }

    async loadFiles(): Promise<WaterButlerFile[]> {
        const content = await this.wbAuthenticatedAJAX({
            url: this.filesURL,
            type: 'GET',
            xhrFields: { withCredentials: true },
        });
        const { data } = content;
        if (!data) {
            return [];
        }
        return (data as FilesResponse[]).map(file => this.wrap(file));
    }

    async delete(): Promise<void> {
        await this.wbAuthenticatedAJAX({
            url: this.deleteURL,
            type: 'DELETE',
            xhrFields: { withCredentials: true },
        });
    }

    async getContents(): Promise<object> {
        if (this.isFile) {
            return this.wbAuthenticatedAJAX({
                url: this.downloadURL,
                type: 'GET',
                data: {
                    direct: true,
                    mode: 'render',
                },
            });
        }
        throw Error('Can only get the contents of files.');
    }

    async updateContents(data: string): Promise<void> {
        await this.wbAuthenticatedAJAX({
            url: this.uploadURL,
            type: 'PUT',
            xhrFields: { withCredentials: true },
            data,
        });
        await this.reload();
    }

    async createFile(name: string, data: string): Promise<void> {
        await this.wbAuthenticatedAJAX({
            url: `${this.uploadURL}?name=${name}`,
            type: 'PUT',
            xhrFields: { withCredentials: true },
            data,
        });
        await this.reload();
    }

    async reload(): Promise<WaterButlerFile> {
        this.cachedContent = null;
        return this;
    }

    abstract wrap(file: FilesResponse): WaterButlerFile;

    async wbAuthenticatedAJAX(ajaxOptions: JQuery.AjaxSettings) {
        const r = await this.currentUser.authenticatedAJAX(ajaxOptions);
        return r;
    }
}
