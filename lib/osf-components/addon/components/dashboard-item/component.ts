import Component from '@ember/component';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/string';
import moment from 'moment';

import { layout } from 'ember-osf-web/decorators/component';
import Contributor from 'ember-osf-web/models/contributor';
import Node from 'ember-osf-web/models/node';
import Analytics from 'ember-osf-web/services/analytics';
import styles from './styles';
import template from './template';

@layout(template, styles)
export default class DashboardItem extends Component {
    @service analytics!: Analytics;

    node?: Node;

    @alias('getAncestorTitles.lastComplete.value') ancestry!: string[];
    @alias('node.bibliographicContributors') contributors!: Contributor[];

    @computed('node.dateModified')
    get date(): string | undefined {
        return this.node ? moment(this.node.dateModified).format('YYYY-MM-DD h:mm A') : undefined;
    }

    @computed('node.{quotaThreshold,quotaRate}')
    get quotaNotice() {
        if (this.node) {
            if (this.node.quotaRate > 1) {
                return htmlSafe('<b>Warning</b><div>Surpassed max quota</div>');
            }
            if (this.node.quotaRate > this.node.quotaThreshold) {
                const threshold = Math.round(this.node.quotaThreshold * 100);
                return htmlSafe(`<b>Alert</b><div>Used more than ${threshold}%</div>`);
            }
        }
        return htmlSafe('');
    }

    @computed('node.creator')
    get administrator(): string | undefined {
        return this.node
            ? this.node.creator.get('familyName')
            || this.node.creator.get('givenName')
            || this.node.creator.get('fullName')
            : undefined;
    }
}
