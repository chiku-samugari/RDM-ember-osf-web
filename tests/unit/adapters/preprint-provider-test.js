import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Adapter | preprint provider', function(hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function(assert) {
        const adapter = this.owner.lookup('adapter:preprint-provider');
        assert.ok(adapter);
    });
});
