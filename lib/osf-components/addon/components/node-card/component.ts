import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import config from 'ember-get-config';

import { layout } from 'ember-osf-web/decorators/component';
import MetadataNodeSchemaModel from 'ember-osf-web/models/metadata-node-schema';
import Node, { NodeType } from 'ember-osf-web/models/node';
import Registration from 'ember-osf-web/models/registration';
import { Question } from 'ember-osf-web/models/registration-schema';
import Analytics from 'ember-osf-web/services/analytics';
import defaultTo from 'ember-osf-web/utils/default-to';
import { METADATA_TITLE_FIELD_PRIORITY } from 'ember-osf-web/utils/metadata-title-field-priority';
import pathJoin from 'ember-osf-web/utils/path-join';

import styles from './styles';
import template from './template';

const { OSF: { url: baseURL } } = config;

@layout(template, styles)
@tagName('')
export default class NodeCard extends Component {
    @service analytics!: Analytics;

    // Optional parameters
    node?: Node | Registration;
    delete?: (node: Node) => void;
    showTags: boolean = defaultTo(this.showTags, false);
    readOnly: boolean = defaultTo(this.readOnly, false);
    showExportCsvLink: boolean = defaultTo(this.showExportCsvLink, false);
    showStatus: boolean = defaultTo(this.showStatus, true);
    disableNodeLink: boolean = defaultTo(this.disableNodeLink, false);

    // Optional arguments
    metadataSchema?: MetadataNodeSchemaModel;

    // Private properties
    searchUrl = pathJoin(baseURL, 'search');

    @computed('node')
    get exportCsvUrl() {
        const node = this.get('node');
        return node ? pathJoin(
            baseURL,
            node.get('id'),
            `metadata/registrations/${node.get('id')}/csv`,
        ) : null;
    }

    @computed('node')
    get registrationSchemaId(): string | null {
        if (!this.node || !this.node.isRegistration) {
            return null;
        }
        const registration = this.node as Registration;
        return registration.registrationSchema.get('id');
    }

    @computed('node', 'node.{isRegistration,registrationSchema,registeredMeta.@each}')
    get registrationTitle(): string | undefined {
        if (this.node && this.node.isRegistration) {
            const registration = this.node as Registration;
            const titleQuestion = registration.registrationSchema.get('schema')
                && registration.registrationSchema.get('schema').pages.reduce(
                    (acc: Question, page) => (acc || page.questions.filter(
                        question => question.title === 'Title',
                    ).firstObject),
                    undefined,
                );

            if (titleQuestion && typeof registration.registeredMeta === 'object'
                && titleQuestion.qid in registration.registeredMeta) {
                const answer = registration.registeredMeta[titleQuestion.qid];
                if ('value' in answer) {
                    return answer.value as string;
                }
            }
        }
        return undefined;
    }

    @computed('node', 'node.{isRegistration,registrationSchema}')
    get schemaUrl(): string | undefined {
        if (this.node && this.node.isRegistration) {
            const registration = this.node as Registration;
            const registrationId = registration.get('id');
            const schemaId = registration.registrationSchema.get('id');
            if (registrationId && schemaId) {
                return `/${registrationId}/register/${schemaId}`;
            }
        }
        return undefined;
    }

    @computed('readOnly', 'node', 'node.{nodeType,userHasWritePermission}')
    get showDropdown() {
        return !this.readOnly && this.node && this.node.nodeType === NodeType.Fork && this.node.userHasWritePermission;
    }

    @computed('node.{registrationResponses,title}')
    get displayTitle(): string {
        const node = this.get('node');
        if (!node) {
            return '';
        }
        // Registrationの場合、registrationResponsesをチェック
        if (node.isRegistration) {
            const registration = node as Registration;
            const responses = registration.registrationResponses;
            if (responses) {
                for (const field of METADATA_TITLE_FIELD_PRIORITY) {
                    // __responseKey_ プレフィックス付きと無し両方を試す
                    const responseKeyField = `__responseKey_${field}`;
                    const value = responses[responseKeyField] || responses[field];
                    if (typeof value === 'string' && value.trim()) {
                        return value.trim();
                    }
                }
            }
        }
        // フォールバック: title属性を使用
        return node.title || '';
    }
}
