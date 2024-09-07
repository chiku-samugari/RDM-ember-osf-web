import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import sanitizeHtml from 'sanitize-html';

import Analytics from 'ember-osf-web/services/analytics';
import Theme from 'ember-osf-web/services/theme';

import config from 'ember-get-config';

const {
    OSF: {
        pageName,
    },
} = config;

export default class Index extends Controller {
    @service analytics!: Analytics;
    @service theme!: Theme;

    title: string = pageName;

    sanitizeOptions = {
        allowedTags: [
            ...sanitizeHtml.defaults.allowedTags,
            'h1',
            'h2',
        ],
        allowedClasses: {
            '*': '/^.*$/',
        },
    };
}
