import Component from '@ember/component';
import { action } from '@ember/object';
import { requiredAction } from 'ember-osf-web/decorators/component';

export default class LogoutButton extends Component {
    currentJupyterHubURL?: URL;

    @requiredAction logout!: (jupyterhubUrl: URL) => void;

    @action
    performLogout(this: LogoutButton) {
        if (this.currentJupyterHubURL) {
            this.logout(this.currentJupyterHubURL);
        }
    }
}
