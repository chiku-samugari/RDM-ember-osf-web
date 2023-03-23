import Component from '@ember/component';
import { SelectionManager } from 'ember-osf-web/guid-node/package/selection';
import Node from 'ember-osf-web/models/node';

export default class FileSelector extends Component {
    node?: Node;
    selectionManager?: SelectionManager;

    wikiEnabled = true;
    commentEnabled = true;
    logEnabled = true;
}
