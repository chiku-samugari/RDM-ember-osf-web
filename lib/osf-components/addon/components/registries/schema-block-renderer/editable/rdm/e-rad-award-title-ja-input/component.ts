import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';

import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { ChangesetDef } from 'ember-changeset/types';
import { layout } from 'ember-osf-web/decorators/component';
import styles from './styles';
import template from './template';

@layout(template, styles)
@tagName('')
export default class ERadAwardTitleJaInput extends Component {
    // Required param
    changeset!: ChangesetDef;
    metadataChangeset!: ChangesetDef;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;
    onMetadataInput!: () => void;

    @action
    onInput2() {
        const ja = this.changeset.get(this.valuePath);
        const en = this.changeset.get('__responseKey_e-rad-award-title-en');
        this.metadataChangeset.set('title', `${ja} (${en})`);
        this.onMetadataInput();
        this.onInput();
    }
}
