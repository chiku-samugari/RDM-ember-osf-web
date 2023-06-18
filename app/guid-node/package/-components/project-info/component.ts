import Component from '@ember/component';
import Node from 'ember-osf-web/models/node';

export default class ProjectInfo extends Component {
    node?: Node;

    creatorName: string | null = null;
    creatorAffiliationName: string | null = null;
    category: string | null = null;
    projectDescription: string | null = null;
    license: string | null = null;
}
