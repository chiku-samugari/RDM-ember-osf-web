import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import DS from 'ember-data';
import { requiredAction } from 'ember-osf-web/decorators/component';
import { BootstrapPath } from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel, { BinderHub, JupyterHub } from 'ember-osf-web/models/binderhub-config';
import Node from 'ember-osf-web/models/node';

/* eslint-disable camelcase */
export interface JupyterServerOptions {
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

interface JupyterServerEntry {
    ownerUrl: string;
    entry: JupyterServer;
}

export interface SelectableBinderhub {
    name: string;
    binderhub_url: string;
}
/* eslint-enable camelcase */

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

export function validateBinderHubToken(binderhub: BinderHub) {
    if (!binderhub.token || (binderhub.token.expires_at && binderhub.token.expires_at * 1000 <= Date.now())) {
        return false;
    }
    return true;
}

export function validateJupyterHubToken(jupyterhub: JupyterHub) {
    if (jupyterhub.token
        && (!jupyterhub.token.expires_at || new Date(jupyterhub.token.expires_at).getTime() > Date.now())) {
        return true;
    }
    return false;
}

export function updateContext(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    window.history.pushState('', '', `?${params.toString()}`);
}

export function getContext(key: string) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

export default class JupyterServersList extends Component {
    binderHubConfig: DS.PromiseObject<BinderHubConfigModel> & BinderHubConfigModel = this.binderHubConfig;

    @requiredAction renewToken!: (jupyterhubUrl: string) => void;

    @requiredAction onError!: (exception: any) => void;

    initialized: boolean = false;

    node?: Node | null = null;

    servers: JupyterServer[] | null = null;

    showDeleteConfirmDialogTarget: JupyterServerEntry | null = null;

    buildPhase: string | null = this.buildPhase;

    oldBuildPhase: string | null = null;

    selectedBinderhubUrl: string | null = null;

    notAuthorized: boolean = false;

    didReceiveAttrs() {
        const bhubUrl = getContext('jh');
        if (!this.selectedBinderhubUrl && bhubUrl) {
            this.selectedBinderhubUrl = bhubUrl;
        }
        if (!this.validateToken()) {
            return;
        }
        if (!this.node) {
            return;
        }
        if (this.initialized && this.buildPhase === this.oldBuildPhase) {
            return;
        }
        this.initialized = true;
        this.oldBuildPhase = this.buildPhase;
        const url = this.defaultJupyterhubUrl;
        if (!url) {
            throw new EmberError('Illegal config');
        }
        this.performLoadServers(url);
    }

    @computed('servers')
    get loading(): boolean {
        if (!this.servers) {
            return true;
        }
        return false;
    }

    @computed('binderHubConfig', 'defaultBinderhubUrl')
    get defaultJupyterhubUrl(): string {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            throw new EmberError('Illegal state');
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        const binderhubUrl = this.get('defaultBinderhubUrl');
        const binderhub = config.findBinderHubCandidateByBinderHubURL(binderhubUrl);
        if (!binderhub) {
            throw new EmberError('Illegal state');
        }
        return binderhub.jupyterhub_url;
    }

    @computed('binderHubConfig', 'selectedBinderhubUrl')
    get defaultBinderhubUrl(): string {
        if (this.selectedBinderhubUrl && this.checkSelectable(this.selectedBinderhubUrl)) {
            return this.selectedBinderhubUrl;
        }
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.binderHubConfig.get('defaultBinderhub');
        return binderhub.url;
    }

    @computed('defaultJupyterhubUrl')
    get defaultJupyterhub() {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            return null;
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        if (!config.jupyterhubs) {
            return null;
        }
        const jupyterhubUrl = this.defaultJupyterhubUrl;
        const jupyterhubs = config.jupyterhubs
            .filter(jupyterhub => this.urlEquals(jupyterhub.url, jupyterhubUrl));
        if (jupyterhubs.length === 0) {
            return null;
        }
        return jupyterhubs[0];
    }

    @computed('defaultJupyterhub')
    get defaultJupyterhubUser() {
        const jupyterhub = this.defaultJupyterhub;
        if (!jupyterhub || !jupyterhub.token || !jupyterhub.token.user) {
            return null;
        }
        return jupyterhub.token.user;
    }

    @computed('binderHubConfig')
    get selectableBinderhubs(): SelectableBinderhub[] {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            return [];
        }
        const nodeBinderhubs = this.binderHubConfig.get('node_binderhubs');
        const userBinderhubs = this.binderHubConfig.get('user_binderhubs');
        const nodeCands = (nodeBinderhubs || [])
            .map(hub => ({
                binderhub_url: hub.binderhub_url,
                name: hub.binderhub_url,
            }));
        const userCands = (userBinderhubs || [])
            .filter(hub => nodeCands
                .every(nodeHub => nodeHub.binderhub_url !== hub.binderhub_url))
            .map(hub => ({
                binderhub_url: hub.binderhub_url,
                name: `${hub.binderhub_url} (User)`,
            }));
        return nodeCands.concat(userCands);
    }

    checkSelectable(url: string) {
        return this.selectableBinderhubs
            .filter(hub => this.urlEquals(hub.binderhub_url, url)).length > 0;
    }

    urlEquals(url1: string, url2: string): boolean {
        return this.normalizeUrl(url1) === this.normalizeUrl(url2);
    }

    normalizeUrl(url: string): string {
        const m = url.match(/^(.+)\/+$/);
        if (!m) {
            return url;
        }
        return m[1];
    }

    performLoadServers(jupyterhubUrl: string) {
        later(async () => {
            const servers = await this.loadServers(jupyterhubUrl);
            this.set('servers', servers);
        }, 0);
    }

    validateToken() {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            return false;
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        const binderhub = config.findBinderHubByURL(this.get('defaultBinderhubUrl'));
        if (!binderhub) {
            return false;
        }
        if (!validateBinderHubToken(binderhub)) {
            return false;
        }
        if (!binderhub.jupyterhub_url) {
            return false;
        }
        const jupyterhub = config.findJupyterHubByURL(binderhub.jupyterhub_url);
        if (!jupyterhub) {
            return false;
        }
        if (validateJupyterHubToken(jupyterhub)) {
            return true;
        }
        if (!this.renewToken) {
            return false;
        }
        this.renewToken(jupyterhub.url);
        return false;
    }

    async jupyterhubAPIAJAX(jupyterhubUrl: string, apiPath: string, ajaxOptions: JQuery.AjaxSettings | null = null) {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            throw new EmberError('Illegal config');
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        try {
            return await config.jupyterhubAPIAJAX(jupyterhubUrl, apiPath, ajaxOptions);
        } catch (e) {
            if (e.status === 403) {
                this.set('notAuthorized', true);
            }
            if (!this.onError) {
                return null;
            }
            this.onError(e);
            return null;
        }
    }

    async loadServers(jupyterhubUrl: string): Promise<JupyterServerEntry[]> {
        if (!this.binderHubConfig || !this.binderHubConfig.get('isFulfilled')) {
            throw new EmberError('Illegal config');
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        const jupyterhub = config.findJupyterHubByURL(jupyterhubUrl);
        if (!jupyterhub || !jupyterhub.token || !validateJupyterHubToken(jupyterhub)) {
            this.set('notAuthorized', true);
            throw new EmberError('Insufficient parameters');
        }
        this.set('notAuthorized', false);
        const response = await this.jupyterhubAPIAJAX(jupyterhubUrl, `users/${jupyterhub.token.user}`);
        const result = response as any;
        if (result.servers === undefined || result.servers === null) {
            throw new EmberError('Unexpected object');
        }
        const serverNames: string[] = Object.keys(result.servers).map(key => key as string);
        serverNames.sort();
        const servers = serverNames.map(serverName => result.servers[serverName] as JupyterServer);
        return servers.filter(server => this.isTarget(server)).map(server => ({
            ownerUrl: jupyterhubUrl,
            entry: server,
        }));
    }

    isTarget(server: JupyterServer) {
        if (!this.node) {
            return false;
        }
        const m = server.name.match(/^(.+)-osfstorage-(.+)$/);
        if (!m) {
            return false;
        }
        return m[1] === this.node.id;
    }

    @action
    binderhubChanged(this: JupyterServersList, binderhubUrl: string) {
        this.set('selectedBinderhubUrl', binderhubUrl);
        updateContext('jh', binderhubUrl);
        const url = this.get('defaultJupyterhubUrl');
        if (!url) {
            throw new EmberError('Illegal config');
        }
        this.performLoadServers(url);
    }

    @action
    refreshServers(this: JupyterServersList) {
        const url = this.get('defaultJupyterhubUrl');
        if (!url) {
            throw new EmberError('Illegal config');
        }
        this.performLoadServers(url);
    }

    @action
    authorize(this: JupyterServersList) {
        const url = this.get('defaultJupyterhubUrl');
        if (!this.renewToken) {
            return;
        }
        this.renewToken(url);
    }

    @action
    openServerWithPath(this: JupyterServersList, server: JupyterServerEntry, path: BootstrapPath | null) {
        const binderHubConfig = this.get('binderHubConfig');
        const config = binderHubConfig.content as BinderHubConfigModel;
        const jupyterhub = config.findJupyterHubByURL(server.ownerUrl);
        if (!jupyterhub) {
            throw new EmberError('Illegal config');
        }
        const url = new URL(jupyterhub.url);
        url.pathname = server.entry.url;
        window.open(getJupyterHubServerURL(url.toString(), undefined, path), '_blank');
    }

    @action
    openServer(this: JupyterServersList, server: JupyterServerEntry) {
        const binderHubConfig = this.get('binderHubConfig');
        const config = binderHubConfig.content as BinderHubConfigModel;
        const jupyterhub = config.findJupyterHubByURL(server.ownerUrl);
        if (!jupyterhub) {
            throw new EmberError('Illegal config');
        }
        const url = new URL(jupyterhub.url);
        url.pathname = server.entry.url;
        window.open(url.toString(), '_blank');
    }

    @action
    deleteServer(this: JupyterServersList) {
        if (!this.showDeleteConfirmDialogTarget || !this.binderHubConfig
            || !this.binderHubConfig.get('isFulfilled')) {
            throw new EmberError('Illegal state');
        }
        const binderHubConfig = this.get('binderHubConfig');
        const config = binderHubConfig.content as BinderHubConfigModel;
        const jupyterhub = config.findJupyterHubByURL(this.showDeleteConfirmDialogTarget.ownerUrl);
        if (!jupyterhub || !jupyterhub.token || !validateJupyterHubToken(jupyterhub)) {
            this.set('notAuthorized', true);
            throw new EmberError('Insufficient parameters');
        }
        this.set('notAuthorized', false);
        const { user } = jupyterhub.token;
        const server = this.showDeleteConfirmDialogTarget;
        this.set('showDeleteConfirmDialogTarget', null);
        later(async () => {
            const serverpath = server.entry.name.length > 0 ? `servers/${server.entry.name}` : 'server';
            await this.jupyterhubAPIAJAX(
                server.ownerUrl,
                `users/${user}/${serverpath}`,
                {
                    method: 'DELETE',
                    contentType: 'application/json',
                    data: JSON.stringify({ remove: true }),
                },
            );
            const servers = await this.loadServers(server.ownerUrl);
            this.set('servers', servers);
        }, 0);
    }
}
