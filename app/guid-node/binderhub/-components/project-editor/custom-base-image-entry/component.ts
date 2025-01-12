import { action } from '@ember/object';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { Image } from 'ember-osf-web/models/binderhub-config';
import CustomBaseImageModel from 'ember-osf-web/models/custom-base-image';

interface Args {
    guid: string;
    target: CustomBaseImageModel;
    localizer: (model: CustomBaseImageModel) => Image;
    checked: boolean;
    isSelectionAllowed: boolean;
    isSelecting: boolean;
    onButtonClick: () => void;
    onDeleteClick?: () => void;
    requestCustomBaseImageReloading: (peek: boolean) => void;
}

export default class CustomBaseImageEntry extends Component<Args> {
    @tracked editorOpenBit: boolean = false;

    @tracked editFatalFailuerBit: boolean = false;

    @action
    updateEditorOpenBit(openBit: boolean) {
        this.editorOpenBit = openBit;
    }

    get description() {
        return this.args.localizer(this.args.target).description;
    }

    @action
    updateFatalFailureBit(bit: boolean) {
        this.editFatalFailuerBit = bit;
    }

    @action
    closeFatalDialogue() {
        this.args.requestCustomBaseImageReloading(false);
        this.updateFatalFailureBit(false);
    }
}
