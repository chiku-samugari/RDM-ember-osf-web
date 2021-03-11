import { currentRouteName } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { percySnapshot } from 'ember-percy';
import { module, test } from 'qunit';

import { currentURL, setupOSFApplicationTest, visit } from 'ember-osf-web/tests/helpers';

module('Acceptance | guid-node/integromat', hooks => {
    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('logged in', async assert => {
        const node = server.create('node', { id: 'i9bri' });
        server.create('integromat-config', { id: node.id });
        const url = `/${node.id}/integromat`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.integromat', 'We are at guid-node.integromat');
        await percySnapshot(assert);
        assert.dom('[data-test-workflows-table] table').exists();
        assert.dom('[data-test-microsoft-teams-screen] div').doesNotExist();
    });
});