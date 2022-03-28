import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';

import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { ChangesetDef } from 'ember-changeset/types';
import { layout } from 'ember-osf-web/decorators/component';
import MetadataNodeEradModel from 'ember-osf-web/models/metadata-node-erad';
import DraftRegistrationManager from 'registries/drafts/draft/draft-registration-manager';
import styles from './styles';
import template from './template';

@layout(template, styles)
@tagName('')
export default class ERadAwardNumberInput extends Component {
    // Required param
    metadataNodeErad!: MetadataNodeEradModel;
    changeset!: ChangesetDef;
    metadataChangeset!: ChangesetDef;
    draftManager!: DraftRegistrationManager;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;
    onMetadataInput!: () => void;

    candidates!: string[];
    anotherOption?: string;

    didReceiveAttrs() {
        this.candidates = [...new Set(this.metadataNodeErad.records.map(rc => rc.kadai_id))];
        const current = this.changeset.get(this.valuePath);
        if (!this.candidates.includes(current)) {
            this.anotherOption = current;
        }
    }

    @computed('anotherOption')
    get options(): string[] {
        const options: string[] = this.candidates.slice();
        if (this.anotherOption) {
            options.push(this.anotherOption);
        }
        return options;
    }

    @action
    onChange(option: string) {
        const eradRecords = this.metadataNodeErad.records.filter(rc => rc.kadai_id === option);
        eradRecords.sort((a, b) => b.nendo - a.nendo);
        if (eradRecords.length) {
            this.changeset.set(
                this.draftManager.getResponseKeyByBlockType('e-rad-award-funder-input'),
                eradRecords[0].haibunkikan_cd,
            );
            this.changeset.set(
                this.draftManager.getResponseKeyByBlockType('e-rad-award-title-ja-input'),
                eradRecords[0].kadai_mei,
            );
            this.changeset.set(
                this.draftManager.getResponseKeyByBlockType('e-rad-award-title-en-input'),
                eradRecords[0].kadai_mei,
            );
            this.metadataChangeset.set(
                'title',
                `${eradRecords[0].kadai_mei}`,
            );
        }
        this.changeset.set(this.valuePath, option);
        this.onMetadataInput();
        this.onInput();
    }

    @action
    onInputSearch(text: string) {
        if (!this.candidates.includes(text) && this.anotherOption !== text) {
            this.set('anotherOption', text);
        }
        return true;
    }
}
