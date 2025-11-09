import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import config from 'ember-get-config';
import Session from 'ember-simple-auth/services/session';

import { layout } from 'ember-osf-web/decorators/component';
import CurrentUser from 'ember-osf-web/services/current-user';
import defaultTo from 'ember-osf-web/utils/default-to';

import template from './template';

const osfURL = config.OSF.url;

const {
    support: {
        serviceUrl,
    },
    navbar: {
        useQuickfiles,
        useRegistrations,
        useSearch,
        useSupport,
        useDonate,
    },
} = config;

@layout(template)
@tagName('') // Don't wrap this component in a div
export default class XLinks extends Component {
    @service router!: any;
    @service session!: Session;
    @service currentUser!: CurrentUser;

    serviceSupportURL: string = serviceUrl;
    searchURL: string = defaultTo(this.searchURL, `${osfURL}search/`);
    myProjectsURL: string = defaultTo(this.myProjectsURL, `${osfURL}myprojects/`);
    myRegistrationsURL: string = defaultTo(this.myRegistrationsURL, `${osfURL}myprojects/#registrations`);
    onLinkClicked: () => void = defaultTo(this.onLinkClicked, () => null);

    useNavQuickfiles: boolean = useQuickfiles;
    useNavRegistrations: boolean = useRegistrations;
    useNavSearch: boolean = useSearch;
    useNavSupport: boolean = useSupport;
    useNavDonate: boolean = useDonate;

    @computed('this.serviceSupportURL')
    get serviceSupportTarget() {
        if (/^https?:\/\//.test(this.serviceSupportURL)) {
            return '_blank';
        }
        return '_self';
    }

    @computed('router.currentRouteName', 'this.serviceSupportURL')
    get supportURL() {
        if (this.onInstitutions) {
            return 'https://openscience.zendesk.com/hc/en-us/categories/360001550913';
        }
        if (this.serviceSupportURL) {
            return this.serviceSupportURL;
        }
        return 'support';
    }

    @computed('router.currentRouteName')
    get onInstitutions() {
        return this.router.currentRouteName === 'institutions.index';
    }
}
