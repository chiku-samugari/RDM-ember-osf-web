import { action } from '@ember/object';
import Component from '@glimmer/component';
import { BootstrapPath } from 'ember-osf-web/guid-node/binderhub/controller';

const labEndpoint = {
    id: 'lab',
    name: 'JupyterLab',
    path: 'lab/',
};

interface Args {
    serverReady: boolean;
    onClick: (path: BootstrapPath) => void;
}

export default class LabLaunchButton extends Component<Args> {
    @action
    launch() {
        this.args.onClick({
            path: labEndpoint.path,
            pathType: 'url',
        });
    }
}
