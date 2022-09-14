import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { freezeDateAt, unfreezeDate } from 'ember-mockdate-shim';
import { percySnapshot } from 'ember-percy';
import { TestContext } from 'ember-test-helpers';
import { module, test } from 'qunit';

import { currentURL, visit } from '@ember/test-helpers';
import { stubRegistriesShareSearch } from 'ember-osf-web/tests/engines/registries/helpers';
import { setupEngineApplicationTest } from 'ember-osf-web/tests/helpers/engines';

// TODO: more thorough tests (these are just for percy's sake)
module('Registries | Acceptance | landing page', hooks => {
    setupEngineApplicationTest(hooks, 'registries');
    setupMirage(hooks);

    hooks.beforeEach(function(this: TestContext) {
        stubRegistriesShareSearch(this);
        freezeDateAt('1982-06-23');
    });

    hooks.afterEach(() => {
        unfreezeDate();
    });

    test('visiting /registries/', async assert => {
        await visit('/registries/');
        // registries page is disabled for metadata addon
        // assert.dom('[data-test-search-box]').exists();
        assert.equal(currentURL(), '/', 'redirected to home');
        await percySnapshot(assert);
    });

    test('visiting /registries/discover', async assert => {
        await visit('/registries/discover/');
        // registries page is disabled for metadata addon
        // assert.dom('[data-test-results]').exists();
        assert.equal(currentURL(), '/', 'redirected to home');
        await percySnapshot(assert);
    });
});
