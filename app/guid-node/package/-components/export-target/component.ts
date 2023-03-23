import Component from '@ember/component';
import { action } from '@ember/object';
import Node from 'ember-osf-web/models/node';

export default class ExportTarget extends Component {
    node?: Node;
    destination = 'weko';

    @action
    destinationChanged(value: string) {
        this.set('destination', value);
    }
}
