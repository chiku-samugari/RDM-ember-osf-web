import Controller from '@ember/controller';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { camelize } from '@ember/string';
import Features from 'ember-feature-flags/services/features';
import config from 'ember-get-config';

const { featureFlagNames: { ABTesting } } = config;

const {
    organization,
    OSF: {
        longBrand,
        simplePage,
    },
} = config;

export default class Home extends Controller {
    @service features!: Features;

    queryParams = [{
        loginNotAvailable: {
            as: 'login_not_available',
        },
    }];

    organization: string = organization;
    brand: string = longBrand;
    useSimplePage: boolean = simplePage;
    loginNotAvailable: boolean = false;

    get heroStyle(): string {
        return simplePage ? 'height: 600px !important;' : 'min-height: auto;';
    }

    @alias(`features.${camelize(ABTesting.homePageHeroTextVersionB)}`)
    shouldShowVersionB!: boolean;
}

declare module '@ember/controller' {
    interface Registry {
        home: Home;
    }
}
