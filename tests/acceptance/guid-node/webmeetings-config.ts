import { currentRouteName } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { percySnapshot } from 'ember-percy';
import { module, test } from 'qunit';

import { currentURL, setupOSFApplicationTest, visit } from 'ember-osf-web/tests/helpers';

module('Acceptance | guid-node/webmeetings', hooks => {
    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('logged in', async assert => {
        const node = server.create('node', { id: 'in2g6' });
        server.create('webmeetings-config', { id: node.id });
        const url = `/${node.id}/webmeetings`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.webmeetings', 'We are at guid-node.webmeetings');
        await percySnapshot(assert);
        assert.dom('[data-test-web-meeting-screen]').exists();
        assert.dom('[data-test-create-web-meeting-modal]').doesNotExist();
        // no data-test-update-web-meeting-modal
        assert.dom('[data-test-delete-meeting-modal]').doesNotExist();
        assert.dom('[data-test-detail-meeting-modal]').doesNotExist();
        assert.dom('[data-test-register-meeting-attendee-modal]').doesNotExist();
    });
});
