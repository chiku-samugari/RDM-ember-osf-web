import Component from '@ember/component';
import { computed } from '@ember/object';
import Node from 'ember-osf-web/models/node';

export default class ProjectInfo extends Component {
    node?: Node;

    @computed('node')
    get creatorName() {
        if (!this.node) {
            return '';
        }
        return this.node.get('creator').get('fullName');
    }

    @computed('node')
    get creatorAffiliationName() {
        if (!this.node) {
            return '';
        }
        const employment = this.node.get('creator').get('employment');
        if (!employment) {
            return '';
        }
        return employment[0].institution;
    }

    @computed('node')
    get category() {
        if (!this.node) {
            return '';
        }
        return this.node.get('category').toString();
    }

    @computed('node')
    get projectDescription() {
        if (!this.node) {
            return '';
        }
        return this.node.get('description');
    }

    @computed('node')
    get license() {
        if (!this.node) {
            return '';
        }
        return this.node.get('license').get('name');
    }
}
