import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';

import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { ChangesetDef } from 'ember-changeset/types';
import config from 'ember-get-config';
import Intl from 'ember-intl/services/intl';
import { layout } from 'ember-osf-web/decorators/component';
import NodeModel from 'ember-osf-web/models/node';
import pathJoin from 'ember-osf-web/utils/path-join';

import DraftRegistrationManager from 'registries/drafts/draft/draft-registration-manager';
import styles from './styles';
import template from './template';

const { OSF: { url: baseURL } } = config;

interface FileMetadataEntity {
    comments?: any[];
    extra?: any[];
    value: any;
}

interface FileMetadata {
    path: string;
    urlpath: string;
    metadata: {
        [key: string]: FileMetadataEntity,
    };
}

interface FileEntry {
    path: string;
    folder: boolean;
    title: string | null;
    url: string | null;
    fileUrl: string | null;
    manager: string | null;
    canMoveLower: boolean;
    canMoveUpper: boolean;
}

@layout(template, styles)
@tagName('')
export default class FileMetadataInput extends Component {
    @service intl!: Intl;

    // Required param
    changeset!: ChangesetDef;
    node!: NodeModel;
    draftManager!: DraftRegistrationManager;

    @alias('schemaBlock.registrationResponseKey')
    valuePath!: string;
    onInput!: () => void;

    didReceiveAttrs() {
        assert(
            'Registries::SchemaBlockRenderer::Editable::Rdm::FileMetadataInput requires a changeset to render',
            Boolean(this.changeset),
        );
        assert(
            'Registries::SchemaBlockRenderer::Editable::Rdm::FileMetadataInput requires a node to render',
            Boolean(this.node),
        );
        assert(
            'Registries::SchemaBlockRenderer::Editable::Rdm::FileMetadataInput requires a valuePath to render',
            Boolean(this.valuePath),
        );
    }

    @computed('node')
    get nodeUrl() {
        return this.node && pathJoin(baseURL, this.node.id);
    }

    @computed('changeset', 'valuePath')
    get fileMetadatas(): FileMetadata[] {
        const value = this.changeset.get(this.valuePath);
        if (!value) {
            return [];
        }
        return JSON.parse(value) as FileMetadata[];
    }

    @computed('fileMetadatas')
    get fileEntries(): FileEntry[] {
        const metadatas = this.get('fileMetadatas');
        return metadatas.map((metadata, index) => ({
            path: metadata.path,
            folder: metadata.path.match(/.+\/$/) !== null,
            title: this.extractTitleFromMetadata(metadata),
            manager: this.extractManagerFromMetadata(metadata),
            url: this.extractUrlFromMetadata(metadata),
            fileUrl: `${pathJoin(baseURL, metadata.urlpath)}#edit-metadata`,
            canMoveLower: index < metadatas.length - 1,
            canMoveUpper: index > 0,
        }) as FileEntry);
    }

    changeIndex(path: string, move: number) {
        const value = this.changeset.get(this.valuePath);
        if (!value) {
            throw new Error('Invalid state');
        }
        const metadatas = JSON.parse(value) as FileMetadata[];
        const oldMetadatas = metadatas
            .map((metadata, index) => ({ path: metadata.path, index }))
            .filter(metadata => metadata.path === path);
        if (oldMetadatas.length === 0) {
            throw new Error(`No item for ${path}`);
        }
        const oldIndex = oldMetadatas[0].index;
        const newIndex = oldIndex + move;
        metadatas.splice(newIndex, 0, metadatas.splice(oldIndex, 1)[0]);
        this.changeset.set(this.valuePath, JSON.stringify(metadatas));
        this.onInput();
        this.notifyPropertyChange('fileMetadatas');
    }

    @action
    moveUpper(this: FileMetadataInput, entry: FileEntry) {
        this.changeIndex(entry.path, -1);
    }

    @action
    moveLower(this: FileMetadataInput, entry: FileEntry) {
        this.changeIndex(entry.path, 1);
    }

    @action
    async reloadFileEntries() {
        const draftRegistration = await this.draftManager.draftRegistration.reload();
        const { registrationResponses } = draftRegistration;
        this.draftManager.setChangesetValue(this.valuePath, registrationResponses[this.valuePath]);
        this.notifyPropertyChange('changeset');
    }

    extractTitleFromMetadata(metadata: FileMetadata): string | null {
        const titleJa = metadata.metadata['grdm-file:title-ja'];
        const titleEn = metadata.metadata['grdm-file:title-en'];
        if (!titleJa && !titleEn) {
            return null;
        }
        if (titleJa && !titleEn) {
            return `${titleJa.value}`;
        }
        if (!titleJa && titleEn) {
            return `${titleEn.value}`;
        }
        if (!titleJa.value && !titleEn.value) {
            return null;
        }
        if (this.intl.locale.includes('ja')) {
            return `${titleJa.value}`;
        }
        return `${titleEn.value}`;
    }

    extractManagerFromMetadata(metadata: FileMetadata): string | null {
        const managerJa = metadata.metadata['grdm-file:data-man-name-ja'];
        const managerEn = metadata.metadata['grdm-file:data-man-name-en'];
        if (!managerJa && !managerEn) {
            return null;
        }
        if (managerJa && !managerEn) {
            return `${managerJa.value}`;
        }
        if (!managerJa && managerEn) {
            return `${managerEn.value}`;
        }
        if (!managerJa.value && !managerEn.value) {
            return null;
        }
        if (this.intl.locale.includes('ja')) {
            return `${managerJa.value}`;
        }
        return `${managerEn.value}`;
    }

    extractUrlFromMetadata(metadata: FileMetadata): string | null {
        const url = metadata.metadata['grdm-file:repo-url-doi-link'];
        if (!url) {
            return null;
        }
        return `${url.value}`;
    }
}
