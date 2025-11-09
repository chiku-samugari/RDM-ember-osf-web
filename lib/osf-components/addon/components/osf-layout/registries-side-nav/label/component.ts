import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';

import Intl from 'ember-intl/services/intl';
import { layout } from 'ember-osf-web/decorators/component';
import defaultTo from 'ember-osf-web/utils/default-to';

import styles from './styles';
import template from './template';

@tagName('')
@layout(template, styles)
export default class Label extends Component {
    @service intl!: Intl;
    // Required parameters
    label!: string;

    // Optional parameters
    count?: number;

    // Private properties
    isCollapsed: boolean = defaultTo(this.isCollapsed, false);

    @computed('count')
    get hasCount() {
        return typeof this.count === 'number';
    }

    @computed('count', 'isCollapsed')
    get showCount() {
        return this.hasCount && !this.isCollapsed;
    }

    @computed('label')
    get localizedLabel() {
        return this.getLocalizedText(this.label);
    }

    didReceiveAttrs() {
        assert(
            'OsfLayout::RegistriesSideNav::Label: @label is required for this component to render',
            Boolean(this.label),
        );
    }

    getLocalizedText(text: string) {
        if (!text.includes('|')) {
            return text;
        }
        const texts = text.split('|');
        if (this.intl.locale.includes('ja')) {
            return texts[0];
        }
        return texts[1];
    }
}
