import ArrayProxy from '@ember/array/proxy';
import Controller from '@ember/controller';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { readOnly } from '@ember/object/computed';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import DS from 'ember-data';

import Intl from 'ember-intl/services/intl';
import BinderHubConfigModel, {
    BinderHub,
    JupyterHub,
} from 'ember-osf-web/models/binderhub-config';
import FileProviderModel from 'ember-osf-web/models/file-provider';
import Node from 'ember-osf-web/models/node';
import ServerAnnotationModel from 'ember-osf-web/models/server-annotation';
import Analytics from 'ember-osf-web/services/analytics';
import CurrentUser from 'ember-osf-web/services/current-user';
import StatusMessages from 'ember-osf-web/services/status-messages';
import getHref from 'ember-osf-web/utils/get-href';
import { addPathSegment } from 'ember-osf-web/utils/url-parts';
import { WaterButlerFile } from 'ember-osf-web/utils/waterbutler/base';
import { wrap } from 'ember-osf-web/utils/waterbutler/wrap';
import Toast from 'ember-toastr/services/toast';

export interface BuildFormValues {
    providerPrefix: string;
    repo: string;
    ref: string;
}

/* eslint-disable camelcase */
interface JupyterServerOptions {
    binder_persistent_request?: string;
    rdm_node?: string;
}
export interface JupyterServer {
    name: string;
    last_activity?: string | null;
    started?: string | null;
    pending?: string | null;
    ready?: boolean;
    url: string;
    user_options?: JupyterServerOptions | null;
}

export interface JupyterServerEntry {
    ownerUrl: string;
    // TODO: It should be renamed to `server`
    entry: JupyterServer;
}

export interface BuildMessage {
    phase: string;
    message: string;
    authorization_url?: string;
    url?: string;
    token?: string;
}

export interface HostDescriptor {
    name: string;
    url: URL;
}
/* eslint-enable camelcase */

export interface BootstrapPath {
    path: string;
    pathType: string;
}

interface BinderHubContext {
    binderHubConfig: BinderHubConfigModel;
}

export function isBinderHubConfigFulfilled(context: BinderHubContext): boolean {
    return !!context.binderHubConfig;
}

export function validateBinderHubToken(binderhub: BinderHub) {
    if (!binderhub.authorize_url) {
        return true;
    }
    if (!binderhub.token || (binderhub.token.expires_at && binderhub.token.expires_at * 1000 <= Date.now())) {
        return false;
    }
    return true;
}

function getContext(key: string) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

export function getJupyterHubServerURL(
    originalUrl: string,
    token: string | undefined,
    targetPath: BootstrapPath | null,
) {
    // redirect a user to a running server with a token
    let url = originalUrl;
    if (targetPath && targetPath.path) {
        // strip trailing /
        url = url.replace(/\/$/, '');
        // trim leading '/'
        let path = targetPath.path.replace(/(^\/)/g, '');
        if (targetPath.pathType === 'file') {
            // trim trailing / on file paths
            path = path.replace(/(\/$)/g, '');
            // /tree is safe because it allows redirect to files
            // need more logic here if we support things other than notebooks
            url = `${url}/tree/${encodeURI(path)}`;
        } else {
            // pathType === 'url'
            url = `${url}/${path}`;
        }
    }
    if (!token) {
        return url;
    }
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
}

function getURLWithContext(url: string): string {
    const host = getContext('host');
    const ourl = new URL(url);
    if (host) {
        ourl.searchParams.set('host', host);
    }
    return ourl.href;
}

function updateContext(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
}

export default class GuidNodeBinderHub extends Controller {
    queryParams = ['host'];

    @service toast!: Toast;
    @service intl!: Intl;
    @service statusMessages!: StatusMessages;
    @service analytics!: Analytics;
    @service currentUser!: CurrentUser;

    @readOnly('model.node.taskInstance.value')
    node?: Node;

    dyServerAnnotations: ServerAnnotationModel[] = [];

    isPageDirty = false;

    configFolder: WaterButlerFile | null = null;

    configCache?: DS.PromiseObject<BinderHubConfigModel>;

    buildLog: BuildMessage[] | null = null;

    jupyterHubAPIError = false;

    binderHubBuildError = false;

    buildPhase: string | null = null;

    selectedHost?: HostDescriptor;

    bh: string | null = null;

    jh: string | null = null;

    loadingPath?: string;

    loggedOutDomains: string[] | null = null;

    @computed('config')
    get loading(): boolean {
        return !this.config;
    }

    @action
    renewBinderHubToken(this: GuidNodeBinderHub, binderhubUrl: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const binderhub = this.config.findBinderHubByURL(binderhubUrl);
        if (!binderhub) {
            throw new EmberError('Illegal config');
        }
        if (!binderhub.authorize_url) {
            throw new EmberError('Illegal config');
        }
        window.location.href = getURLWithContext(binderhub.authorize_url);
    }

    @action
    renewJupyterHubToken(this: GuidNodeBinderHub, jupyterhubUrl: string) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const jupyterhub = this.config.findJupyterHubByURL(jupyterhubUrl);
        if (jupyterhub) {
            if (!jupyterhub.authorize_url) {
                throw new EmberError('Illegal config');
            }
            window.location.href = getURLWithContext(jupyterhub.authorize_url);
            return;
        }
        // Maybe BinderHub not authorized
        const binderhubCand = this.config.findBinderHubCandidateByJupyterHubURL(jupyterhubUrl);
        if (!binderhubCand) {
            throw new EmberError('Illegal config');
        }
        this.renewBinderHubToken(binderhubCand.binderhub_url);
    }

    @action
    logoutJupyterHub(this: GuidNodeBinderHub, jupyterhubUrl: URL) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const jupyterhub = this.config.findJupyterHubByURL(jupyterhubUrl.toString());
        if (!jupyterhub) {
            // Already logout
            return;
        }
        const logoutUrl = jupyterhub.logout_url;
        if (!logoutUrl) {
            throw new EmberError('Illegal config');
        }
        later(async () => {
            const resp = await this.currentUser.authenticatedAJAX({
                url: logoutUrl,
                type: 'DELETE',
                xhrFields: { withCredentials: true },
            });
            if (!resp || !resp.data) {
                return;
            }
            if (!resp.data.deleted) {
                return;
            }
            const jhLogoutUrl = resp.data.jupyterhub_logout_url;
            window.open(jhLogoutUrl, '_blank');
            if (!this.node) {
                throw new EmberError('Illegal state');
            }
            const configCache = this.store.findRecord('binderhub-config', this.node.id);
            await configCache;
            this.configCache = configCache;
            this.notifyPropertyChange('config');
            this.set('loggedOutDomains', (this.loggedOutDomains || []).concat(jupyterhubUrl.toString()));
        }, 0);
    }

    async ensureConfigFolder() {
        if (!this.node) {
            throw new EmberError('Illegal state');
        }
        const allProviders = await this.node.get('files');
        const provider = this.getDefaultStorage(allProviders);
        const defaultStorage = await wrap(this.currentUser, provider);
        if (!defaultStorage) {
            throw new EmberError('Illegal state');
        }
        const files = await defaultStorage.files;
        const configFolders = files.filter(file => file.name === '.binder');
        if (configFolders.length === 0) {
            const links = provider.get('links');
            const link = links.new_folder;
            if (!link) {
                throw new EmberError('Illegal state');
            }
            await this.wbAuthenticatedAJAX({
                url: `${getHref(link)}&name=.binder`,
                type: 'PUT',
                xhrFields: { withCredentials: true },
            });
            await defaultStorage.reload();
            const filesUpdated = await defaultStorage.files;
            const configFoldersUpdated = filesUpdated.filter(file => file.name === '.binder');
            if (configFoldersUpdated.length === 0) {
                throw new EmberError('Illegal state');
            }
            this.set('configFolder', configFoldersUpdated[0]);
            return;
        }
        this.set('configFolder', configFolders[0]);
    }

    getDefaultStorage(allProviders: ArrayProxy<FileProviderModel>): FileProviderModel {
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

    async generatePersonalToken() {
        const scopeIds = ['osf.full_read', 'osf.full_write'];
        const scopes = await Promise.all(scopeIds.map(scopeId => this.store.findRecord('scope', scopeId)));
        const token = await this.store.createRecord('token', {
            name: `BinderHub addon ${new Date().toISOString()}`,
            scopes,
        });
        await token.save();
        return token;
    }

    async performBuild(
        binderhubURLString: string,
        needsPersonalToken: boolean,
        path: BootstrapPath | null,
        callback: (result: BuildMessage) => void,
    ) {
        if (!this.config) {
            throw new EmberError('Illegal config');
        }
        const { buildFormValues } = this;
        if (!buildFormValues) {
            throw new EmberError('Illegal state');
        }
        const buildPath = this.getBinderPath(buildFormValues, path);
        if (!buildPath) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.config.findBinderHubByURL(binderhubURLString);
        let additional = '';
        if (this.currentUser && this.currentUser.currentUserId) {
            additional += `&userctx=${this.currentUser.currentUserId}`;
        }
        additional += `&${this.getUserOptions()}`;
        if (binderhub && !binderhub.authorize_url) {
            const token = await this.generatePersonalToken();
            additional += `&repo_token=${token.tokenValue}`;
            const hubUrl = addPathSegment(binderhub.url, 'hub');
            const hubBuildUrl = addPathSegment(hubUrl, buildPath);
            const hubUrlSep = hubBuildUrl.includes('?') ? '&' : '?';
            const url = `${hubBuildUrl}${hubUrlSep}${additional.substring(1)}`;
            window.open(url, '_blank');
            return;
        }
        if (!binderhub || !binderhub.token) {
            throw new EmberError('Illegal config');
        }
        if (needsPersonalToken) {
            const token = await this.generatePersonalToken();
            additional += `&repo_token=${token.tokenValue}`;
        }
        const buildUrl = addPathSegment(binderhub.url, buildPath);
        const urlSep = buildUrl.includes('?') ? '&' : '?';
        const source = new EventSource(`${buildUrl}${urlSep}token=${binderhub.token.access_token}${additional}`);
        source.onmessage = (message: MessageEvent) => {
            const data = JSON.parse(message.data) as BuildMessage;
            if (data.phase === 'auth' && data.authorization_url && !needsPersonalToken) {
                source.close();
                later(async () => {
                    await this.performBuild(binderhubURLString, true, path, callback);
                }, 0);
                return;
            }
            this.handleBuildMessage(source, data, callback);
        };
        source.onerror = (_: any) => {
            this.set('binderHubBuildError', true);
        };
    }

    getUserOptions(): string {
        if (!this.node) {
            throw new EmberError('Illegal config');
        }
        if (!this.node.links.self) {
            throw new EmberError('Illegal config');
        }
        const nodeUrl = this.node.links.self.toString();
        let opts = `useropt.rdm_node=${encodeURIComponent(nodeUrl)}`;
        const matched = nodeUrl.match(/^(http.+\/v2\/)nodes\/([a-zA-Z0-9]+)\/.*$/);
        if (!matched) {
            throw new EmberError('Illegal config');
        }
        opts += `&useropt.rdm_api_url=${encodeURIComponent(matched[1])}`;
        opts += `&useropt.rdm_node_id=${encodeURIComponent(matched[2])}`;
        return opts;
    }

    get buildFormValues(): BuildFormValues | null {
        if (!this.node) {
            throw new EmberError('Illegal config');
        }
        if (!this.configFolder) {
            throw new EmberError('Illegal config');
        }
        const nodeUrl = this.node.links.html as string;
        const storageUrl = addPathSegment(nodeUrl, this.configFolder.provider);
        const encodedNodeUrl = encodeURIComponent(storageUrl);
        return {
            providerPrefix: 'rdm',
            repo: encodedNodeUrl,
            ref: 'master',
        } as BuildFormValues;
    }

    getBinderPath(args: BuildFormValues, path: BootstrapPath | null) {
        // return a v2 url from a providerPrefix, repository, ref, and (file|url)path
        if (args.repo.length === 0) {
            // no repo, no url
            return null;
        }
        let url = `build/${args.providerPrefix}/${args.repo}/${args.ref}`;
        if (path && path.path && path.path.length > 0) {
            // encode the path, it will be decoded in loadingMain
            url = `${url}?${path.pathType}path=${encodeURIComponent(path.path)}`;
        }
        return url;
    }

    handleBuildMessage(source: EventSource, data: BuildMessage, callback: (result: BuildMessage) => void) {
        const logs: BuildMessage[] = (this.buildLog || []).map(elem => elem);
        logs.push(data);
        this.set('buildLog', logs);
        if (data.phase) {
            this.set('buildPhase', data.phase);
        }
        if (data.phase === 'ready' || data.phase === 'failed' || data.phase === 'failure') {
            source.close();
            if (!callback) {
                return;
            }
            callback(data);
        }
    }

    @computed('model.binderHubConfig')
    get config(): BinderHubConfigModel {
        if (this.configCache) {
            return this.configCache.content!;
        }
        this.configCache = this.model.binderHubConfig;
        return this.model.binderHubConfig!;
    }

    @computed('config')
    get availableHosts(): HostDescriptor[] {
        if (!isBinderHubConfigFulfilled(this.model)) {
            return [];
        }
        const nodeCands = (this.config.get('node_binderhubs') || []).map(
            hub => ({
                url: new URL(hub.binderhub_url),
                name: hub.binderhub_url,
            }),
        );
        const userCands = (this.config.get('user_binderhubs') || []).reduce(
            (acc: HostDescriptor[], item) => {
                const url = new URL(item.binderhub_url);
                if (nodeCands.every(nodeHub => url.href !== nodeHub.url.href)) {
                    acc.push({ url, name: `${item.binderhub_url} (User)` });
                }
                return acc;
            },
            [],
        );
        return nodeCands.concat(userCands);
    }

    isAvailableHostURL(url: URL): boolean {
        return this.availableHosts.some(
            hub => hub.url.href === url.href,
        );
    }

    @computed('config', 'selectedHost')
    get currentBinderHubURL(): URL {
        if (!isBinderHubConfigFulfilled(this.model)) {
            throw new EmberError('Inappropriate BinderHub configuration. [GuidNodeBinderHub.currentBinderHubURL]');
        }
        if (this.selectedHost && this.isAvailableHostURL(this.selectedHost.url)) {
            return this.selectedHost.url;
        }
        return new URL(this.config.get('defaultBinderhub').url);
    }

    @action
    selectHostURL(this: GuidNodeBinderHub, hostURLString: string) {
        try {
            const hostURL = new URL(hostURLString);
            if (!this.isAvailableHostURL(hostURL)) {
                throw new EmberError('Illegal Input. Input hostURL seems wired.');
            }
            this.set('selectedHost', { url: hostURL, name: hostURL.toString() });
            updateContext('host', hostURL.toString());
        } catch (e) {
            if (e instanceof TypeError) {
                throw new EmberError('Malformed URL string is submitted. [GuidNodeBinderHub.selectHostURL]');
            } else if (e instanceof EmberError) {
                throw e;
            } else {
                throw new EmberError('Unknown Error [GuidNodeBinderHub.selectHostURL]');
            }
        }
    }

    // TODO: Eliminate double negation
    @computed('currentJupyterHub.href')
    get canLogout(): boolean {
        const jupyterhub = this.currentJupyterHub;
        if (!jupyterhub) {
            return false;
        }
        if (!jupyterhub.logout_url) {
            return false;
        }
        return true;
    }

    @computed('config', 'currentBinderHubURL')
    get currentJupyterHubURL(): URL {
        if (!isBinderHubConfigFulfilled(this.model)) {
            throw new EmberError('BinderHubConfigModel is not ready. [GuidNodeBinderHub.currentJupyterHubURL]');
        }
        const binderhub = this.config.findBinderHubCandidateByBinderHubURL(
            this.get('currentBinderHubURL').toString(),
        );
        if (!binderhub) {
            throw new EmberError('Cannot find out current BinderHub. [GuidNodeBinderHub.currentJupyterHubURL]');
        }
        return new URL(binderhub.jupyterhub_url);
    }

    @computed('currentJupyterHubURL')
    get currentJupyterHub(): JupyterHub | null {
        if (!isBinderHubConfigFulfilled(this.model)) {
            return null;
        }
        return this.config.findJupyterHubByURL(this.currentJupyterHubURL.toString());
    }

    @computed('currentJupyterHub')
    get currentJupyterHubUser(): string {
        const jupyterhub = this.currentJupyterHub;
        if (!jupyterhub || !jupyterhub.token || !jupyterhub.token.user) {
            return null;
        }
        return jupyterhub.token.user;
    }

    @action
    requestError(this: GuidNodeBinderHub, _: any) {
        this.set('jupyterHubAPIError', true);
    }

    @action
    projectError(this: GuidNodeBinderHub, exception: any, message: string) {
        if (!exception.message) {
            this.toast.error(message);
            return;
        }
        this.toast.error(`${message}: ${exception.message}`);
    }

    @action
    build(
        this: GuidNodeBinderHub,
        binderhubURLString: string,
        path: BootstrapPath | null,
        callback: (result: BuildMessage) => void,
    ) {
        this.set('buildLog', []);
        later(async () => {
            await this.performBuild(binderhubURLString, false, path, callback);
        }, 0);
    }

    async wbAuthenticatedAJAX(ajaxOptions: JQuery.AjaxSettings) {
        const r = await this.currentUser.authenticatedAJAX(ajaxOptions);
        return r;
    }

    /**
     * Initialization in addition to Route.setupController. This method
     * is assumed to be called in GuidNodeBinderHubRoute.setupController,
     * after `super.setupController` is called and therefore, we can
     * safely use `this.model`.
     */
    setup() {
        const defaultBinderHubURL = new URL(this.config.get('defaultBinderhub').url);
        this.set(
            'selectedHost',
            this.availableHosts.find(
                host => host.url.href === defaultBinderHubURL.href,
            ),
        );
        this.set(
            'dyServerAnnotations',
            this.model.serverAnnotations.toArray(),
        );
    }

    @action
    pollute(this: GuidNodeBinderHub) {
        this.set('isPageDirty', true);
    }

    @action
    cleanse(this: GuidNodeBinderHub) {
        this.set('isPageDirty', false);
    }

    @computed('dyServerAnnotations', 'currentBinderHubURL')
    get serverAnnotationHash() {
        return this.dyServerAnnotations.reduce(
            (acc: {[key: string]: ServerAnnotationModel}, item: ServerAnnotationModel) => {
                if ((new URL(item.binderhubUrl)).toString() === this.get('currentBinderHubURL').toString()) {
                    return {
                        ...acc,
                        [(new URL(item.serverUrl)).toString()]: item,
                    };
                }
                return acc;
            },
            {} as {[key: string]: ServerAnnotationModel},
        );
    }

    @action
    async reloadServerAnnotations(peek: boolean) {
        const node = this.get('node');
        if (!node) {
            throw new EmberError('Illegal state. The node object is not set.');
        }

        const latest = peek ? await this.store.peekAll('server-annotation')
            : await this.store.query('server-annotation', { guid: node.id });

        this.set('dyServerAnnotations', latest);
    }

    /**
     * Create ServerAnnotation and returns corresponding
     * ServerAnnotationModel object. If `updateDy` is `true`, then
     * `dyServerAnnotations` will be updated to include returned
     * ServerAnnotationModel.
     *
     * What we need on this creation is not only the jupyter server's
     * URL, but also the URL of BinderHub and/or JupyterHub server.
     * It is not guaranteed that the `currentBinderHubURL` is the same
     * as the BinderHub URL used to create the jupyter server. Since the
     * server building process takes long-long time, the user can change
     * the selected BinderHub URL (by the HostSelector) during the
     * building process. So, it must be informed. Since we can find the
     * BinderHub URL from JupyterHub URL, a JupyterServerEntry is
     * enough. The `ownerUrl` is the URL of the JupyterHubServer.
     *
     * @param {JupyterServerEntry} entry
     * @param {boolean} updateDy - update dyServerAnnotations by the
     *                             array that includes newly created
     *                             annotation.
     * @return {ServerAnnotationModel}
     */
    @action
    async createServerAnnotation(entry: JupyterServerEntry, updateDy: boolean) {
        if (!isBinderHubConfigFulfilled(this.model)) {
            throw new EmberError('Illegal state. The configuration object is not set.');
        }
        const node = this.get('node');
        if (!node) {
            throw new EmberError('Illegal state. The node object is not set.');
        }

        const { ownerUrl, entry: server } = entry;
        const candidate = this.get('config').findBinderHubCandidateByJupyterHubURL(ownerUrl);
        if (!candidate) {
            throw new EmberError('Illegal configuration. Failed to lookup BinderHub from JupyterHubURL.');
        }
        const annotation = await this.store.createRecord(
            'server-annotation',
            {
                serverUrl: server.url,
                name: server.name,
                binderhubUrl: candidate.binderhub_url,
                jupyterhubUrl: ownerUrl,
                memotext: '',
            },
        ).save({ adapterOptions: { guid: node.id } });
        if (updateDy) {
            this.set(
                'dyServerAnnotations',
                [...this.get('dyServerAnnotations'), annotation],
            );
        }
        return annotation;
    }
}

declare module '@ember/controller' {
    interface Registry {
        'guid-node/binderhub': GuidNodeBinderHub;
    }
}
