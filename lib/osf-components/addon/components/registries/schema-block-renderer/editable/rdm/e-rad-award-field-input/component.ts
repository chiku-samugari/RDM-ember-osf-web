import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';
import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';

import { ChangesetDef } from 'ember-changeset/types';
import Intl from 'ember-intl/services/intl';

import { layout } from 'ember-osf-web/decorators/component';
import { SchemaBlock } from 'ember-osf-web/packages/registration-schema';

import template from './template';

@layout(template)
@tagName('')
export default class ERadAwardFieldInput extends Component {
    @service intl!: Intl;
    // Required param
    optionBlocks!: SchemaBlock[];
    changeset!: ChangesetDef;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;
    onMetadataInput!: () => void;

    didReceiveAttrs() {
        assert(
            'SchemaBlockRenderer::Editable::ERadAwardFieldInput requires optionBlocks to render',
            Boolean(this.optionBlocks),
        );
    }

    @computed('optionBlocks.[]')
    get optionBlockValues() {
        return this.optionBlocks
            .map(item => this.getLocalizedItemText(item));
    }

    @action
    onChange(option: string) {
        const optionBlock = this.optionBlocks
            .filter(item => this.getLocalizedItemText(item) === option);
        if (optionBlock.length === 0) {
            throw new Error(`Unexpected option: ${option}`);
        }
        const value = optionBlock[0].displayText;
        this.changeset.set(this.valuePath, value);
        this.onInput();
    }

    getLocalizedItemText(item: SchemaBlock) {
        const text = item.helpText || item.displayText;
        if (text === undefined) {
            return item.displayText;
        }
        const label = this.getLocalizedText(text);
        return `${label} | ${item.displayText}`;
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
