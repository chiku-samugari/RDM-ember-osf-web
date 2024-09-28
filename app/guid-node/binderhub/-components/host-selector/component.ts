import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { HostDescriptor } from 'ember-osf-web/guid-node/binderhub/controller';

interface Args {
    selectedHost: HostDescriptor;
    availableHosts: HostDescriptor[];
    onHostSelect: (hostURL: string) => void;
}

export default class HostSelector extends Component<Args> {
    @tracked selectDialogueOpenBit: boolean = false;

    @tracked picked: string;

    constructor(owner: any, args: Args) {
        super(owner, args);
        this.picked = args.selectedHost.url.toString();
    }

    @action
    updateOpenBit(openBit: boolean) {
        this.selectDialogueOpenBit = openBit;
    }

    @action
    pick(urlString: string) {
        this.picked = urlString;
    }

    @action
    applyPicked() {
        this.args.onHostSelect(this.picked);
        this.selectDialogueOpenBit = false;
    }
}
