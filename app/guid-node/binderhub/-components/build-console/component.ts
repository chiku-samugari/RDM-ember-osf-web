import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { htmlSafe } from '@ember/template';
import { requiredAction } from 'ember-osf-web/decorators/component';
import AnsiUp from 'ember-osf-web/guid-node/binderhub/-components/build-console/ansi_up';
import {
    BootstrapPath,
    BuildMessage,
    getJupyterHubServerURL,
    isBinderHubConfigFulfilled,
    validateBinderHubToken,
} from 'ember-osf-web/guid-node/binderhub/controller';
import BinderHubConfigModel from 'ember-osf-web/models/binderhub-config';
import $ from 'jquery';

export default class BuildConsole extends Component {
    binderHubConfig!: BinderHubConfigModel;

    initialized: boolean = false;

    buildLog: BuildMessage[] | null = null;

    buildLogLineCount = 0;

    buildStatusOpen = true;

    buildPhase: string | null = null;

    currentBinderHubURL!: URL;

    notAuthorized: boolean = false;

    @requiredAction renewToken!: (binderhubUrl: string) => void;

    @requiredAction requestBuild!: (
        binderhubUrl: string,
        path: BootstrapPath | null,
        callback: (result: BuildMessage) => void,
    ) => void;

    @requiredAction beforeLaunch!: () => void;

    didReceiveAttrs() {
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
    safeLaunch(this: BuildConsole) {
        // Grab the *current* BinderHub URL beforehand. It is required since
        // the user may (quickly) change its value via HostSelector component
        // after clicking the launch button.
        const binderhubUrl = this.get('currentBinderHubURL');
        later(async () => {
            await this.beforeLaunch();
            this.launch(binderhubUrl);
        }, 0);
    }

    launch(binderhubUrl: URL) {
        if (!isBinderHubConfigFulfilled(this)) {
            throw new EmberError('Illegal config');
        }
        const binderhub = this.binderHubConfig.findBinderHubByURL(
            binderhubUrl.toString(),
        );
        if (!binderhub || !validateBinderHubToken(binderhub)) {
            this.set('notAuthorized', true);
            throw new EmberError('Insufficient parameters');
        }
        this.set('notAuthorized', false);
        this.performBuild(
            binderhubUrl,
            { path: 'lab/', pathType: 'url' } as BootstrapPath,
        );
    }

    @action
    authorize(this: BuildConsole) {
        if (!this.renewToken) {
            return;
        }
        this.renewToken(this.get('currentBinderHubURL').toString());
    }

    performBuild(binderhubUrl: URL, path: BootstrapPath | null) {
        if (!this.requestBuild) {
            return;
        }
        this.requestBuild(
            binderhubUrl.toString(),
            path,
            (result: BuildMessage) => {
                // TODO: is this callback called repeatedly until the
                // `result.phase` get `'ready'`? It's worth to know.
                if (result.phase !== 'ready') {
                    return;
                }
                this.performLaunch(result.url, result.token, path);
            },
        );
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
        if (!this.validateToken(this.get('currentBinderHubURL').toString())) {
            return false;
        }
        return true;
    }

    validateToken(binderhubUrl: string) {
        if (!isBinderHubConfigFulfilled(this)) {
            return true;
        }
        const binderhub = this.binderHubConfig.findBinderHubByURL(binderhubUrl);
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
