import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { HostDescriptor } from 'ember-osf-web/guid-node/binderhub/controller';

interface Args {
    guid: string;
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

    get addonPageURLString(): string {
        const { protocol, host } = window.location;
        return `${protocol}//${host}/${this.args.guid || ''}/addons`;
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
        if (this.picked !== this.args.selectedHost.url.href) {
            this.args.onHostSelect(this.picked);
        }
        this.selectDialogueOpenBit = false;
    }
}
