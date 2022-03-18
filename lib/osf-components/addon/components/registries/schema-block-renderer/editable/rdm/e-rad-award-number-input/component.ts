import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';

import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { ChangesetDef } from 'ember-changeset/types';
import { layout } from 'ember-osf-web/decorators/component';
import MetadataNodeEradModel from 'ember-osf-web/models/metadata-node-erad';
import styles from './styles';
import template from './template';

@layout(template, styles)
@tagName('')
export default class ERadAwardNumberInput extends Component {
    // Required param
    metadataNodeErad!: MetadataNodeEradModel;
    changeset!: ChangesetDef;
    metadataChangeset!: ChangesetDef;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;
    onMetadataInput!: () => void;

    candidates!: string[];
    anotherOption?: string;

    didReceiveAttrs() {
        this.candidates = this.metadataNodeErad.records.map(rc => rc.kadai_id);
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
        const eradRecord = this.metadataNodeErad.records.find(rc => rc.kadai_id === option);
        if (eradRecord) {
            const funder = eradRecord.haibunkikan_cd;
            const ja = eradRecord.kadai_mei;
            const en = eradRecord.kadai_mei;
            this.changeset.set('__responseKey_e-rad-award-funder', funder);
            this.changeset.set('__responseKey_e-rad-award-title-ja', ja);
            this.changeset.set('__responseKey_e-rad-award-title-en', en);
            this.metadataChangeset.set('title', `${ja} (${en})`);
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
