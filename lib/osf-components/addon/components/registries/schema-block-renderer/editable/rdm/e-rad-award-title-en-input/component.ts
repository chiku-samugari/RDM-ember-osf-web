import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';

import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { ChangesetDef } from 'ember-changeset/types';
import { layout } from 'ember-osf-web/decorators/component';
import DraftRegistrationManager from 'registries/drafts/draft/draft-registration-manager';
import styles from './styles';
import template from './template';

@layout(template, styles)
@tagName('')
export default class ERadAwardTitleEnInput extends Component {
    // Required param
    changeset!: ChangesetDef;
    metadataChangeset!: ChangesetDef;
    draftManager!: DraftRegistrationManager;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;
    onMetadataInput!: () => void;
    @alias('schemaBlock.spaceNormalization')
    spaceNormalization!: boolean;

    normalize(value: string) {
        if (this.spaceNormalization) {
            return value.replace(/\s+/g, ' ').trim();
        }
        return value;
    }

    @action
    onInput2() {
        const ja = this.changeset.get(
            this.draftManager.getResponseKeyByBlockType('e-rad-award-title-ja-input'),
        );
        const en = this.normalize(this.changeset.get(this.valuePath));
        this.metadataChangeset.set('title', `${ja} (${en})`);
        this.onMetadataInput();
        this.changeset.set(this.valuePath, en);
        this.onInput();
    }
}
