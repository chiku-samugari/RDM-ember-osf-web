import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { assert } from '@ember/debug';

import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { ChangesetDef } from 'ember-changeset/types';
import config from 'ember-get-config';
import { layout } from 'ember-osf-web/decorators/component';
import NodeModel from 'ember-osf-web/models/node';
import pathJoin from 'ember-osf-web/utils/path-join';

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
    metadata: {
        [key: string]: FileMetadataEntity,
    };
}

interface FileEntry {
    path: string;
    folder: boolean;
    title: string | null;
    url: string | null;
}

@layout(template, styles)
@tagName('')
export default class FileMetadataInput extends Component {
    // Required param
    changeset!: ChangesetDef;
    metadataChangeset!: ChangesetDef;

    node!: NodeModel;

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
        return this.get('fileMetadatas').map(metadata => ({
            path: metadata.path,
            folder: metadata.path.match(/.+\/$/) !== null,
            title: this.extractTitleFromMetadata(metadata),
            url: this.extractUrlFromMetadata(metadata),
        }) as FileEntry);
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
        if (titleJa.value && !titleEn.value) {
            return `${titleJa.value}`;
        }
        if (!titleJa.value && titleEn.value) {
            return `${titleEn.value}`;
        }
        return `${titleJa.value} / ${titleEn.value}`;
    }

    extractUrlFromMetadata(metadata: FileMetadata): string | null {
        const url = metadata.metadata['grdm-file:repo-url-doi-link'];
        if (!url) {
            return null;
        }
        return `${url.value}`;
    }
}
