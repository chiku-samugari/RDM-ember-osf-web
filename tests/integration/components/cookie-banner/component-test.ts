import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { module, test } from 'qunit';

module('Integration | Component | cookie-banner', hooks => {
    setupRenderingTest(hooks);

    test('it renders', async function(assert) {
        await render(hbs`{{cookie-banner}}`);

        assert.dom(this.element)
            .hasText('GakuNin RDM is a service provided by the National Institute of Informatics (NII) '
                + 'on trust from user organizations, and the terms of use and privacy policy of '
                + 'each user organization are applied. GakuNin RDM uses cookies to operate the service '
                + 'and improve the user experience. Users of GakuNin RDM are requested to read the '
                + 'information on our privacy policy. By clicking "I agree" or continuing to use this '
                + 'site, you agree to our use of cookies. If you disagree, please disable cookies in '
                + 'your browser settings or discontinue using this site. Please note that by not using '
                + 'cookies, you may not be able to use some of this website\'s functions. Accept');
    });
});
