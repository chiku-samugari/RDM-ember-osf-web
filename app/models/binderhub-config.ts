import EmberError from '@ember/error';
import { computed } from '@ember/object';
import DS from 'ember-data';
import { addPathSegment } from 'ember-osf-web/utils/url-parts';
import RSVP from 'rsvp';
import OsfModel from './osf-model';

const { attr } = DS;

/* eslint-disable camelcase */
export interface Token {
    user?: string;
    access_token: string;
    expires_at: number | null;
    token_type: string;
}

export interface BinderHub {
    default: boolean;
    url: string;
    authorize_url: string | null;
    token?: Token;
    api_url?: string;
    jupyterhub_url?: string;
}

export interface JupyterHub {
    url: string;
    authorize_url: string | null;
    token?: Token;
    api_url?: string;
    logout_url?: string | null;
    max_servers?: number | null;
}

export interface Image {
    url: string;
    name: string;
    description?: string;
    description_en?: string;
    description_ja?: string;
    packages?: string[];
    recommended?: boolean;
}

export interface Deployment {
    images: Image[];
}

export interface Endpoint {
    id: string;
    name: string;
    path: string | null;
    imageurl?: string;
}

export interface Launcher {
    endpoints: Endpoint[];
}

export interface BinderHubCandidate {
    binderhub_url: string;
    jupyterhub_url: string;
}
/* eslint-enable camelcase */

export default class BinderHubConfigModel extends OsfModel {
    @attr('array') binderhubs!: BinderHub[];

    @attr('array') jupyterhubs?: JupyterHub[];

    @attr('object') deployment!: Deployment;

    @attr('object') launcher!: Launcher;

    /* eslint-disable camelcase */
    // tslint:disable-next-line:variable-name
    @attr('array') node_binderhubs!: BinderHubCandidate[];

    // tslint:disable-next-line:variable-name
    @attr('array') user_binderhubs!: BinderHubCandidate[];
    /* eslint-enable camelcase */

    @computed('binderhubs')
    get defaultBinderhub() {
        const result = this.get('binderhubs').filter(
            binderhub => binderhub.default,
        );
        if (result.length === 0) {
            throw new EmberError('Default BinderHub not defined');
        }
        return result[0];
    }

    findBinderHubByURL(binderhubUrl: string): BinderHub | null {
        const result = this.get('binderhubs').filter(
            binderhub => this.urlEquals(binderhub.url, binderhubUrl),
        );
        if (result.length === 0) {
            return null;
        }
        return result[0];
    }

    findJupyterHubByURL(jupyterhubUrl: string): JupyterHub | null {
        const jupyterhubs = this.get('jupyterhubs');
        if (!jupyterhubs) {
            return null;
        }
        const result = jupyterhubs.filter(
            jupyterhub => this.urlEquals(jupyterhub.url, jupyterhubUrl),
        );
        if (result.length === 0) {
            return null;
        }
        return result[0];
    }

    findBinderHubCandidateByBinderHubURL(binderhubUrl: string): BinderHubCandidate | null {
        const nresult = this.get('node_binderhubs').filter(
            binderhub => this.urlEquals(binderhub.binderhub_url, binderhubUrl),
        );
        if (nresult.length > 0) {
            return nresult[0];
        }
        const uresult = this.get('user_binderhubs').filter(
            binderhub => this.urlEquals(binderhub.binderhub_url, binderhubUrl),
        );
        if (uresult.length > 0) {
            return uresult[0];
        }
        return null;
    }

    findBinderHubCandidateByJupyterHubURL(jupyterhubUrl: string): BinderHubCandidate | null {
        const nresult = this.get('node_binderhubs').filter(
            binderhub => this.urlEquals(binderhub.jupyterhub_url, jupyterhubUrl),
        );
        if (nresult.length > 0) {
            return nresult[0];
        }
        const uresult = this.get('user_binderhubs').filter(
            binderhub => this.urlEquals(binderhub.jupyterhub_url, jupyterhubUrl),
        );
        if (uresult.length > 0) {
            return uresult[0];
        }
        return null;
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

    async jupyterhubAPIAJAX(jupyterhubUrl: string, apiPath: string, ajaxOptions: JQuery.AjaxSettings | null = null) {
        const opts = ajaxOptions ? { ...ajaxOptions } : {};
        const jupyterhub = this.findJupyterHubByURL(jupyterhubUrl);
        if (!jupyterhub || !jupyterhub.api_url || !jupyterhub.token) {
            throw new EmberError(`JupyterHub not found: ${jupyterhubUrl}`);
        }
        opts.url = addPathSegment(jupyterhub.api_url, apiPath);
        opts.headers = {
            Authorization: `${jupyterhub.token.token_type} ${jupyterhub.token.access_token}`,
        };
        return new RSVP.Promise((resolve, reject) => $.ajax(opts).then(resolve).catch(reject));
    }
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'binderhub-config': BinderHubConfigModel;
    } // eslint-disable-line semi
}
