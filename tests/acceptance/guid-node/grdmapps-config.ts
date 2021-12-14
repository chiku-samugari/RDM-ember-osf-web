import { currentRouteName } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { percySnapshot } from 'ember-percy';
import { module, test } from 'qunit';

import { currentURL, setupOSFApplicationTest, visit } from 'ember-osf-web/tests/helpers';

module('Acceptance | guid-node/grdmapps', hooks => {
    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('logged in', async assert => {
        const node = server.create('node', { id: 'in2g6' });
        server.create('grdmapps-config', { id: node.id, workflows: '123' });
        const url = `/${node.id}/grdmapps`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.grdmapps', 'We are at guid-node.grdmapps');
        await percySnapshot(assert);
        assert.dom('[data-test-workflows-table]').exists();
        assert.dom('[data-test-microsoft-teams-screen]').doesNotExist();
        assert.dom('[data-test-web-meeting-screen]').doesNotExist();
        assert.dom('[data-test-create-meeting-modal]').doesNotExist();
        assert.dom('[data-test-update-meeting-modal]').doesNotExist();
        assert.dom('[data-test-delete-meeting-modal]').doesNotExist();
        assert.dom('[data-test-detail-meeting-modal]').doesNotExist();
        assert.dom('[data-test-register-alternative-webhookurl-modal]').doesNotExist();
        assert.dom('[data-test-register-meeting-attendee-modal]').doesNotExist();
    });
});
