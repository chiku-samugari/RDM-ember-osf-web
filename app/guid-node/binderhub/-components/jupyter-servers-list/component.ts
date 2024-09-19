import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { requiredAction } from 'ember-osf-web/decorators/component';
import {
    BootstrapPath,
    getContext,
    getJupyterHubServerURL,
    isBinderHubConfigFulfilled,
    SelectableBinderhub,
    urlEquals,
    validateBinderHubToken,
} from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel, { JupyterHub } from 'ember-osf-web/models/binderhub-config';
import Node from 'ember-osf-web/models/node';
import { addPathSegment } from 'ember-osf-web/utils/url-parts';

/* eslint-disable camelcase */
export interface JupyterServerOptions {
    binder_persistent_request?: string;
    rdm_node?: string;
}

interface JupyterUser {
    named_server_limit?: number | null;
    servers?: {[key: string]: JupyterServer} | null;
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

interface JupyterServerResponse {
    namedServerLimit: number | null;
    entries: JupyterServerEntry[];
}
/* eslint-enable camelcase */

export function validateJupyterHubToken(jupyterhub: JupyterHub) {
    if (!jupyterhub.authorize_url) {
        return true;
    }
    if (jupyterhub.token
        && (!jupyterhub.token.expires_at || new Date(jupyterhub.token.expires_at).getTime() > Date.now())) {
        return true;
    }
    return false;
}

export function updateContext(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
}

export default class JupyterServersList extends Component {
    binderHubConfig!: BinderHubConfigModel;

    @requiredAction renewToken!: (jupyterhubUrl: string) => void;

    @requiredAction logout!: (jupyterhubUrl: string) => void;

    @requiredAction onError!: (exception: any) => void;

    initialized: boolean = false;

    node?: Node | null = null;

    allServers: JupyterServerEntry[] | null = null;

    serversLink: string | null = null;

    showDeleteConfirmDialogTarget: JupyterServerEntry | null = null;

    buildPhase: string | null = this.buildPhase;

    oldBuildPhase: string | null = null;

    selectedBinderhubUrl: string | null = null;

    requestNotAuthorized: boolean = false;

    loggedOutDomains: string[] | null = null;

    namedServerLimit: number | null = null;

    didReceiveAttrs() {
        const bhubUrl = getContext('jh');
        if (!this.selectedBinderhubUrl && bhubUrl) {
            this.selectedBinderhubUrl = bhubUrl;
        }
        if (!this.initialized && !this.validateToken()) {
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

    @computed('servers', 'serversLink')
    get loading(): boolean {
        return this.servers === null && this.serversLink === null;
    }

    @computed('servers')
    get apiLoaded(): boolean {
        return this.allServers !== null;
    }

    @computed('allServers')
    get servers(): JupyterServerEntry[] | null {
        const servers = this.allServers;
        if (servers === null) {
            return null;
        }
        return servers.filter(server => this.isTarget(server.entry));
    }

    get maxServers(): number | null {
        if (this.namedServerLimit !== null) {
            return this.namedServerLimit;
        }
        const jupyterhub = this.defaultJupyterhub;
        if (!jupyterhub) {
            return null;
        }
        if (jupyterhub.max_servers === null || jupyterhub.max_servers === undefined) {
            return null;
        }
        return jupyterhub.max_servers;
    }

    @computed('allServers', 'defaultJupyterhub')
    get maxServersExceeded(): boolean {
        const servers = this.allServers;
        if (servers === null) {
            return false;
        }
        if (this.maxServers === null) {
            return false;
        }
        return servers.length >= this.maxServers;
    }

    @computed('defaultJupyterhub')
    get canLogout(): boolean {
        const jupyterhub = this.defaultJupyterhub;
        if (!jupyterhub) {
            return false;
        }
        if (!jupyterhub.logout_url) {
            return false;
        }
        return true;
    }

    @computed('binderHubConfig', 'defaultBinderhubUrl')
    get defaultJupyterhubUrl(): string {
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.binderHubConfig.findBinderHubCandidateByBinderHubURL(
            this.get('defaultBinderhubUrl'),
        );
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
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        return this.binderHubConfig.get('defaultBinderhub').url;
    }

    @computed('defaultJupyterhubUrl')
    get defaultJupyterhub() {
        if (!isBinderHubConfigFulfilled(this)) {
            return null;
        }
        const config = this.binderHubConfig;
        if (!config.jupyterhubs) {
            return null;
        }
        const jupyterhubUrl = this.defaultJupyterhubUrl;
        const jupyterhubs = config.jupyterhubs
            .filter(jupyterhub => urlEquals(jupyterhub.url, jupyterhubUrl));
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
        if (!isBinderHubConfigFulfilled(this)) {
            return [];
        }
        const nodeBinderhubs = this.binderHubConfig.get('node_binderhubs');
        const userBinderhubs = this.binderHubConfig.get('user_binderhubs');
        const nodeCands = (nodeBinderhubs || []).map(hub => ({
            binderhub_url: hub.binderhub_url,
            name: hub.binderhub_url,
        }));
        const userCands = (userBinderhubs || []).filter(
            hub => nodeCands.every(nodeHub => !urlEquals(hub.binderhub_url, nodeHub.binderhub_url)),
        ).map(hub => ({
            binderhub_url: hub.binderhub_url,
            name: `${hub.binderhub_url} (User)`,
        }));
        return nodeCands.concat(userCands);
    }

    @computed('binderHubConfig', 'requestNotAuthorized', 'defaultJupyterhubUrl', 'loggedOutDomains', 'initialized')
    get notAuthorized(): boolean {
        if (!this.initialized) {
            return false;
        }
        if (!isBinderHubConfigFulfilled(this)) {
            return false;
        }
        if (this.requestNotAuthorized) {
            return true;
        }
        const jupyterhubUrl = this.defaultJupyterhubUrl;
        const jupyterhub = this.binderHubConfig.findJupyterHubByURL(jupyterhubUrl);
        if (this.loggedOutDomains !== null && this.loggedOutDomains.includes(jupyterhubUrl)) {
            return true;
        }
        if (jupyterhub && !jupyterhub.authorize_url) {
            // Non-API
            return false;
        }
        if (jupyterhub && jupyterhub.token && validateJupyterHubToken(jupyterhub)) {
            return false;
        }
        return true;
    }

    checkSelectable(url: string) {
        return this.selectableBinderhubs
            .filter(hub => urlEquals(hub.binderhub_url, url)).length > 0;
    }

    performLoadServers(jupyterhubUrl: string) {
        this.set('allServers', null);
        this.set('serversLink', null);
        this.set('namedServerLimit', null);
        later(async () => {
            const servers = await this.loadServers(jupyterhubUrl);
            this.set('serversLink', addPathSegment(jupyterhubUrl, 'hub/home'));
            this.set('allServers', servers !== null ? servers.entries : null);
            this.set('namedServerLimit', servers !== null ? servers.namedServerLimit : null);
        }, 0);
    }

    validateToken() {
        if (!isBinderHubConfigFulfilled(this)) {
            return false;
        }
        const config = this.binderHubConfig;
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
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal config');
        }
        this.set('requestNotAuthorized', false);
        try {
            return await this.binderHubConfig.jupyterhubAPIAJAX(jupyterhubUrl, apiPath, ajaxOptions);
        } catch (e) {
            if (e.status === 403) {
                this.set('requestNotAuthorized', true);
            }
            if (!this.onError) {
                return null;
            }
            this.onError(e);
            return null;
        }
    }

    async loadServers(jupyterhubUrl: string): Promise<JupyterServerResponse | null> {
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal config');
        }
        const jupyterhub = this.binderHubConfig.findJupyterHubByURL(jupyterhubUrl);
        if (jupyterhub && !jupyterhub.authorize_url) {
            // Non-API
            return null;
        }
        if (!jupyterhub || !jupyterhub.token || !validateJupyterHubToken(jupyterhub)) {
            throw new EmberError('Not authorized');
        }
        const { servers, named_server_limit: limit } = await this.jupyterhubAPIAJAX(
            jupyterhubUrl,
            `users/${jupyterhub.token.user}?include_stopped_servers=1`,
        ) as JupyterUser;
        if (servers === undefined || servers === null) {
            throw new EmberError('Unexpected object');
        }
        const serverNames: string[] = Object.keys(servers)
            .map(key => key as string)
            .filter(key => key.length > 0);
        serverNames.sort();
        return {
            namedServerLimit: limit !== undefined ? limit : null,
            entries: serverNames.map(serverName => ({
                ownerUrl: jupyterhubUrl,
                entry: servers[serverName] as JupyterServer,
            })),
        };
    }

    isTarget(server: JupyterServer) {
        if (this.node) {
            const m = server.name.match(/^(.+)-([a-z0-9]+)-(.+)$/);
            return m && m[1] === this.node.id;
        }
        return false;
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
        const jupyterhub = this.get('binderHubConfig').findJupyterHubByURL(server.ownerUrl);
        if (!jupyterhub) {
            throw new EmberError('Illegal config');
        }
        const url = new URL(jupyterhub.url);
        url.pathname = server.entry.url;
        window.open(getJupyterHubServerURL(url.toString(), undefined, path), '_blank');
    }

    @action
    openServer(this: JupyterServersList, server: JupyterServerEntry) {
        const jupyterhub = this.get('binderHubConfig').findJupyterHubByURL(server.ownerUrl);
        if (!jupyterhub) {
            throw new EmberError('Illegal config');
        }
        const url = new URL(jupyterhub.url);
        url.pathname = server.entry.url;
        window.open(url.toString(), '_blank');
    }

    @action
    deleteServer(this: JupyterServersList) {
        if (!this.showDeleteConfirmDialogTarget || !isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        const jupyterhub = this.get('binderHubConfig').findJupyterHubByURL(
            this.showDeleteConfirmDialogTarget.ownerUrl,
        );
        if (!jupyterhub || !jupyterhub.token || !validateJupyterHubToken(jupyterhub)) {
            throw new EmberError('Not authorized');
        }
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
            this.set('allServers', servers !== null ? servers.entries : null);
        }, 0);
    }

    @action
    performLogout(this: JupyterServersList) {
        this.logout(this.defaultJupyterhubUrl);
    }
}
