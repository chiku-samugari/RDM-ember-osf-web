import Component from '@glimmer/component';

import { Image } from 'ember-osf-web/models/binderhub-config';

interface Args {
    image: Image;
    showImageURL: (imageReference: string) => boolean;
    checked: boolean;
    isSelectionAllowed: boolean;
    isSelecting: boolean;
    onButtonClick: () => void;
}

export default class BaseImageEntry extends Component<Args> {
    get isImageURLVisible() {
        return this.args.showImageURL(this.args.image.url);
    }
}
