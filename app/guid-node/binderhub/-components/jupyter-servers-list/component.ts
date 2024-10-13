import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { requiredAction } from 'ember-osf-web/decorators/component';
import {
    BootstrapPath,
    getJupyterHubServerURL,
    isBinderHubConfigFulfilled,
    JupyterServer,
    JupyterServerEntry,
    validateBinderHubToken,
} from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel, { JupyterHub } from 'ember-osf-web/models/binderhub-config';
import Node from 'ember-osf-web/models/node';
import ServerAnnotationModel from 'ember-osf-web/models/server-annotation';
import { addPathSegment } from 'ember-osf-web/utils/url-parts';

/* eslint-disable camelcase */
interface JupyterUser {
    named_server_limit?: number | null;
    servers?: {[key: string]: JupyterServer} | null;
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

export default class JupyterServersList extends Component {
    binderHubConfig!: BinderHubConfigModel;

    @requiredAction renewToken!: (jupyterhubUrl: string) => void;

    @requiredAction onError!: (exception: any) => void;

    initialized: boolean = false;

    node?: Node | null = null;

    allServers: JupyterServerEntry[] | null = null;

    serversLink: string | null = null;

    showDeleteConfirmDialogTarget: JupyterServerEntry | null = null;

    buildPhase: string | null = this.buildPhase;

    oldBuildPhase: string | null = null;

    currentBinderHubURL!: URL;

    requestNotAuthorized: boolean = false;

    loggedOutDomains: string[] | null = null;

    namedServerLimit: number | null = null;

    serverAnnotationHash: { [key: string]: ServerAnnotationModel } = {};

    @requiredAction requestAnnotationCreation!: (
        entry: JupyterServerEntry, updateDy: boolean,
    ) => void;

    @requiredAction requestAnnotationReload!: (peek: boolean) => void;

    didReceiveAttrs() {
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

    @computed('binderHubConfig', 'currentBinderHubURL')
    get defaultJupyterhubUrl(): string {
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.binderHubConfig.findBinderHubCandidateByBinderHubURL(
            this.get('currentBinderHubURL').toString(),
        );
        if (!binderhub) {
            throw new EmberError('Illegal state');
        }
        return binderhub.jupyterhub_url;
    }

    @computed('defaultJupyterhubUrl')
    get defaultJupyterhub() {
        if (!isBinderHubConfigFulfilled(this)) {
            return null;
        }
        return this.binderHubConfig.findJupyterHubByURL(this.defaultJupyterhubUrl);
    }

    @computed('defaultJupyterhub')
    get defaultJupyterhubUser() {
        const jupyterhub = this.defaultJupyterhub;
        if (!jupyterhub || !jupyterhub.token || !jupyterhub.token.user) {
            return null;
        }
        return jupyterhub.token.user;
    }

    /**
     * An string array whose `i`th element is the (initial) contents of
     * `i`th jupyter server (i.e. this.servers[i]). An element `null`
     * means that the corresponding server does not have server
     * annotation on the API server side. The `null` value is just a
     * kind of placeholder and server annotations creation process would
     * be started immediately, by this method.
     *
     * This property is needed since `get` helper does not work if the 2nd
     * argument includes some dots and we cannot use
     * `this.serverAnnotationHash` directly in the template.hbs.
     */
    @computed('serverAnnotationHash', 'servers')
    get serverMemoArray(): Array<string | null> {
        const servers = this.get('servers');
        if (servers === null) {
            throw new EmberError('servers not ready');
        }
        let nullDetected = false;
        return servers.map(s => {
            const annot = this.get('serverAnnotationHash')[s.entry.url];
            if (typeof annot === 'undefined') {
                if (!nullDetected) {
                    nullDetected = true;
                    later(async () => {
                        const created = await this.requestAnnotationCreation(s, true);
                    }, 0);
                }
                return null;
            }
            return annot.memotext;
        });
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
        const binderhub = config.findBinderHubByURL(
            this.get('currentBinderHubURL').toString(),
        );
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
        const serverNames: string[] = Object.keys(servers).filter(
            ({ length }) => length > 0,
        ).sort();
        return {
            namedServerLimit: limit !== undefined ? limit : null,
            entries: serverNames.map(serverName => ({
                ownerUrl: jupyterhubUrl,
                entry: servers[serverName] as JupyterServer,
            })),
        };
    }

    isTarget(server: JupyterServer): boolean {
        if (this.node) {
            const m = server.name.match(/^(.+)-([a-z0-9]+)-(.+)$/);
            return m !== null && m[1] === this.node.id;
        }
        return false;
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
    onMemoEdit(this: JupyterServersList, server: JupyterServerEntry, event: { target: HTMLInputElement }) {
        const node = this.get('node');
        if (!node) {
            throw new EmberError('Page is not ready.');
        }
        const annotation = this.get('serverAnnotationHash')[server.entry.url];
        annotation.memotext = event.target.value;
        annotation.save({ adapterOptions: { guid: node.id } });
        later(async () => {
            this.requestAnnotationReload(true);
        }, 0);
    }
}
