import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { htmlSafe } from '@ember/template';
import DS from 'ember-data';
import { requiredAction } from 'ember-osf-web/decorators/component';
import AnsiUp from 'ember-osf-web/guid-node/binderhub/-components/build-console/ansi_up';
import {
    BootstrapPath,
    BuildMessage,
    getContext,
    getJupyterHubServerURL,
    isBinderHubConfigFulfilled,
    SelectableBinderhub,
    urlEquals,
    validateBinderHubToken,
} from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel from 'ember-osf-web/models/binderhub-config';
import $ from 'jquery';

export default class BuildConsole extends Component {
    binderHubConfig: DS.PromiseObject<BinderHubConfigModel> & BinderHubConfigModel = this.binderHubConfig;

    initialized: boolean = false;

    buildLog: BuildMessage[] | null = this.buildLog;

    buildLogLineCount = 0;

    buildStatusOpen = true;

    buildPhase: string | null = this.buildPhase;

    selectedBinderhubUrl: string | null = null;

    selectedBinderhubUrlForJupyterHub: string | null = null;

    notAuthorized: boolean = false;

    @requiredAction renewToken!: (binderhubUrl: string) => void;

    @requiredAction requestBuild!: (
        binderhubUrl: string,
        path: BootstrapPath | null,
        callback: (result: BuildMessage) => void,
    ) => void;

    didReceiveAttrs() {
        const url = getContext('bh');
        if (!this.selectedBinderhubUrl && url) {
            this.selectedBinderhubUrl = url;
        }
        const urlForJhub = getContext('jh');
        if (!this.selectedBinderhubUrlForJupyterHub && urlForJhub) {
            this.selectedBinderhubUrlForJupyterHub = urlForJhub;
        }
        if (!this.initialized && !this.validateTokens()) {
            return;
        }
        this.initialized = true;
        if (!this.buildLog) {
            return;
        }
        if (this.buildLog.length === this.buildLogLineCount) {
            return;
        }
        this.buildLogLineCount = this.buildLog.length;
        this.scrollToBottom();
    }

    @computed('binderHubConfig', 'selectedBinderhubUrl')
    get defaultBinderhubUrl() {
        if (this.selectedBinderhubUrl && this.checkSelectable(this.selectedBinderhubUrl)) {
            return this.selectedBinderhubUrl;
        }
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.binderHubConfig.get('defaultBinderhub');
        return binderhub.url;
    }

    @computed('binderHubConfig', 'selectedBinderhubUrlForJupyterHub')
    get defaultBinderhubUrlForJupyterHub() {
        if (this.selectedBinderhubUrlForJupyterHub && this.checkSelectable(this.selectedBinderhubUrlForJupyterHub)) {
            return this.selectedBinderhubUrlForJupyterHub;
        }
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal state');
        }
        const binderhub = this.binderHubConfig.get('defaultBinderhub');
        return binderhub.url;
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

    @computed('buildLog')
    get buildLogLines(): string {
        if (!this.buildLog) {
            return '';
        }
        return this.buildLog.map(log => log.message).join('');
    }

    @computed('buildLog')
    get buildLogLinesHTML() {
        if (!this.buildLog) {
            return htmlSafe('');
        }
        const text = this.buildLog.map(log => log.message).join('');
        const ansiUp = new AnsiUp();
        return htmlSafe(ansiUp.ansi_to_html(text));
    }

    @computed('buildLog')
    get buildLogVisible(): boolean {
        if (!this.buildLog) {
            return false;
        }
        if (this.buildLog.length === 0) {
            return false;
        }
        return true;
    }

    @action
    launch(this: BuildConsole, path: BootstrapPath | null) {
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal config');
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        const binderhub = config.findBinderHubByURL(this.get('defaultBinderhubUrl'));
        if (!binderhub || !validateBinderHubToken(binderhub)) {
            this.set('notAuthorized', true);
            throw new EmberError('Insufficient parameters');
        }
        this.set('notAuthorized', false);
        const defaultPath = {
            path: 'lab/',
            pathType: 'url',
        } as BootstrapPath;
        this.performBuild(path || defaultPath);
    }

    @action
    authorize(this: BuildConsole) {
        const url = this.get('defaultBinderhubUrl');
        if (!this.renewToken) {
            return;
        }
        this.renewToken(url);
    }

    checkSelectable(url: string) {
        return this.selectableBinderhubs
            .filter(hub => urlEquals(hub.binderhub_url, url)).length > 0;
    }

    performBuild(path: BootstrapPath | null) {
        if (!this.requestBuild) {
            return;
        }
        this.requestBuild(this.get('defaultBinderhubUrl'), path, (result: BuildMessage) => {
            if (result.phase !== 'ready') {
                return;
            }
            this.performLaunch(result.url, result.token, path);
        });
    }

    performLaunch(originalUrl: string | undefined, token: string | undefined, targetPath: BootstrapPath | null) {
        if (!originalUrl || !token) {
            throw new EmberError('Missing parameters in the result');
        }
        const url = getJupyterHubServerURL(originalUrl, token, targetPath);
        window.open(url, '_blank');
    }

    scrollToBottom() {
        const terminal = $('#binderhub-build-terminal');
        const terminalContent = $('#binderhub-build-terminal pre');
        const height = terminalContent.height();
        if (!height) {
            return;
        }
        terminal.scrollTop(height);
    }

    validateTokens() {
        if (!isBinderHubConfigFulfilled(this)) {
            return true;
        }
        if (!this.validateToken(this.get('defaultBinderhubUrl'))) {
            return false;
        }
        if (!this.validateToken(this.get('defaultBinderhubUrlForJupyterHub'))) {
            return false;
        }
        return true;
    }

    validateToken(binderhubUrl: string) {
        if (!isBinderHubConfigFulfilled(this)) {
            return true;
        }
        const config = this.binderHubConfig.content as BinderHubConfigModel;
        const binderhub = config.findBinderHubByURL(binderhubUrl);
        if (!binderhub || validateBinderHubToken(binderhub)) {
            return true;
        }
        if (!this.renewToken) {
            return true;
        }
        this.renewToken(binderhub.url);
        return false;
    }
}
