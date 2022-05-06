import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { underscore } from '@ember/string';

import Intl from 'ember-intl/services/intl';
import { layout } from 'ember-osf-web/decorators/component';
import { DraftMetadataProperties } from 'ember-osf-web/models/draft-registration';
import { PageManager, SchemaBlock } from 'ember-osf-web/packages/registration-schema';

import styles from './styles';
import template from './template';

@layout(template, styles)
@tagName('')
export default class RegistrationFormNavigationDropdown extends Component {
    @service intl!: Intl;
    // Required parameters
    schemaBlocks!: SchemaBlock[];

    // Optional paramaters
    showMetadata: boolean = false;
    pageManagers: PageManager[] = [];

    // Private properties
    metadataFields: string[] = Object.values(DraftMetadataProperties)
        .filter(prop => prop !== DraftMetadataProperties.NodeLicenseProperty)
        .map(underscore);

    @computed('schemaBlocks', 'pageManagers')
    get blocksWithAnchor() {
        const grdmFilePage = this.getGRDMFilePage();
        const ignoreGroupKeys = grdmFilePage && grdmFilePage.schemaBlockGroups
            ? grdmFilePage.schemaBlockGroups
                .filter(group => group.registrationResponseKey
                    && group.registrationResponseKey.startsWith('__responseKey_grdm-file:'))
                .map(group => group.schemaBlockGroupKey)
            : [];
        return this.schemaBlocks.filter(({ blockType, displayText, schemaBlockGroupKey }) => (
            blockType === 'page-heading'
                || blockType === 'section-heading'
                || blockType === 'subsection-heading'
                || blockType === 'question-label'
        ) && displayText && !ignoreGroupKeys.includes(schemaBlockGroupKey));
    }

    getGRDMFilePage() {
        return this.pageManagers.find(page => this.hasGRDMFiles(page));
    }

    hasGRDMFiles(pageManager: PageManager) {
        if (!pageManager.schemaBlockGroups) {
            return false;
        }
        return pageManager.schemaBlockGroups
            .some(group => group.registrationResponseKey === '__responseKey_grdm-files');
    }

    @computed('blocksWithAnchor')
    get localizedBlocksWithAnchor() {
        return this.blocksWithAnchor.map(block => ({
            model: block,
            localizedDisplayText:
                block.displayText === undefined ? undefined : this.getLocalizedText(block.displayText),
        }));
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
