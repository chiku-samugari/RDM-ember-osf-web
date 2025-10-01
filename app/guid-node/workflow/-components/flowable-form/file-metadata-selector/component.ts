import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';
import config from 'ember-get-config';

import MetadataNodeProject, {
    FileEntry, MetadataItem, MetadataValue,
} from 'ember-osf-web/models/metadata-node-project';
import MetadataNodeSchema from 'ember-osf-web/models/metadata-node-schema';
import Node from 'ember-osf-web/models/node';
import RegistrationSchema from 'ember-osf-web/models/registration-schema';
import pathJoin from 'ember-osf-web/utils/path-join';

import { toStringValue } from '../field/component';
import { FieldValueWithType } from '../types';

const { OSF: { url: baseURL } } = config;

interface SchemaInfo {
    id: string;
    name: string;
}

interface FileMetadataValue {
    id: string;
    data: {
        [key: string]: MetadataValue;
    };
    schema: SchemaInfo;
}

interface FileMetadataEntry {
    path: string;
    parts: string[];
    lastPart: string;
    lastPartDepth: number;
    folder: boolean;
    title: string | null;
    manager: string | null;
    url: string;
    style: string;
    visible: boolean;
    folderExpanded: boolean;
    isSelected: boolean;
}

interface FileMetadataSelectorArgs {
    node: Node;
    schemaName: string;
    multiSelect: boolean;
    value: FieldValueWithType | undefined;
    onChange: (valueWithType: FieldValueWithType) => void;
    disabled: boolean;
}

export default class FileMetadataSelector extends Component<FileMetadataSelectorArgs> {
    @service store!: DS.Store;

    @tracked metadataNodeProject: MetadataNodeProject | null = null;
    @tracked metadataNodeSchema: MetadataNodeSchema | null = null;
    @tracked registrationSchema: RegistrationSchema | null = null;
    @tracked selectedPath: string | null = null;
    @tracked selectedPaths: string[] = [];
    @tracked folderExpands: {[key: string]: boolean} = {};
    @tracked isInitialized: boolean = false;

    @task
    loadFileMetadata = task(function *(this: FileMetadataSelector) {
        const { node } = this.args;
        this.metadataNodeProject = yield this.store.findRecord('metadata-node-project', node.id);
        this.metadataNodeSchema = yield this.store.findRecord('metadata-node-schema', node.id);

        // Load all registration schemas with pagination
        const allSchemas: RegistrationSchema[] = [];
        let page = 1;
        while (true) {
            const result = yield this.store.query('registration-schema', { page });
            Array.prototype.push.apply(allSchemas, result.toArray());
            if (!result.links.next) { break; }
            page += 1;
        }
        this.registrationSchema = allSchemas.find(s => s.name === this.args.schemaName) || null;
    });

    get isMultiSelect(): boolean {
        return this.args.multiSelect;
    }

    get projectUrl(): string {
        return pathJoin(baseURL, this.args.node.id);
    }

    get schemaId(): string | null {
        if (!this.registrationSchema) {
            return null;
        }
        return this.registrationSchema.id;
    }

    get projectFilePaths(): string[] {
        if (!this.metadataNodeProject || !this.schemaId) {
            return [];
        }

        const pathSet = new Set<string>();
        this.metadataNodeProject.files.forEach((entry: FileEntry) => {
            const item = entry.items.find(it => it.schema === this.schemaId);
            if (item) {
                let path = '';
                const parts = entry.path.split('/');
                parts.forEach((part, i) => {
                    if (!part.length) {
                        return;
                    }
                    path += part;
                    if (i + 1 < parts.length) {
                        path += '/';
                    }
                    pathSet.add(path);
                });
            }
        });
        return Array.from(pathSet).sort((a: string, b: string) => a.localeCompare(b));
    }

    get fileEntries(): FileMetadataEntry[] {
        if (!this.metadataNodeProject || !this.schemaId) {
            return [];
        }

        // Create a map of file metadata by path
        const metadataMap: {[key: string]: { title: string | null; manager: string | null; urlpath: string }} = {};
        this.metadataNodeProject.files.forEach((entry: FileEntry) => {
            const item = entry.items.find(it => it.schema === this.schemaId);
            if (item) {
                const titleJa = item.data['grdm-file:title-ja'];
                const titleEn = item.data['grdm-file:title-en'];
                const managerJa = item.data['grdm-file:data-man-name-ja'];
                const managerEn = item.data['grdm-file:data-man-name-en'];

                let title = null;
                if (titleJa && titleJa.value) {
                    title = titleJa.value;
                } else if (titleEn && titleEn.value) {
                    title = titleEn.value;
                }

                let manager = null;
                if (managerJa && managerJa.value) {
                    manager = managerJa.value;
                } else if (managerEn && managerEn.value) {
                    manager = managerEn.value;
                }

                metadataMap[entry.path] = { title, manager, urlpath: entry.urlpath };
            }
        });

        // Build tree structure
        const paths = this.projectFilePaths;
        return paths.map(path => {
            const metadata = metadataMap[path];
            const parts = path.split('/');
            if (!parts[parts.length - 1].length) {
                parts.pop();
            }
            const folder = path.match(/.+\/$/) !== null;

            // Initialize folder expansion for top-level folders
            if (folder && parts.length === 1 && this.folderExpands[path] === undefined) {
                this.folderExpands[path] = true;
            }

            const entry: FileMetadataEntry = {
                path,
                parts,
                lastPart: parts[parts.length - 1],
                lastPartDepth: parts.length,
                folder,
                title: metadata ? metadata.title : null,
                manager: metadata ? metadata.manager : null,
                url: metadata ? `${pathJoin(baseURL, metadata.urlpath)}#edit-metadata` : '',
                style: `margin: 0 0 0 ${parts.length * 20 + (folder ? 0 : 24)}px`,
                visible: [...parts.slice(0, parts.length - 1).keys()]
                    .every(i => this.folderExpands[`${parts.slice(0, i + 1).join('/')}/`]),
                folderExpanded: this.folderExpands[path] || false,
                isSelected: false,
            };

            entry.isSelected = this.isMultiSelect
                ? this.selectedPaths.includes(path)
                : this.selectedPath === path;
            return entry;
        });
    }

    @action
    initialize() {
        if (!this.isInitialized) {
            this.isInitialized = true;
            this.loadFileMetadata.perform();
        }
    }

    @action
    updateValue() {
        if (!this.args.value) {
            return;
        }
        if (this.isMultiSelect) {
            if (this.selectedPaths.length > 0) {
                return;
            }
            const paths = this.extractPathsFromValue(this.args.value);
            if (paths.length > 0) {
                this.selectedPaths = paths;
                this.notifyFilesSelected(paths);
            }
        } else if (!this.selectedPath) {
            const path = this.extractPathsFromValue(this.args.value)[0];
            if (path) {
                this.selectedPath = path;
                this.notifyFileSelected(path);
            }
        }
    }

    @action
    selectFile(path: string): void {
        if (this.args.disabled) {
            return;
        }
        if (this.isMultiSelect) {
            const hasPath = this.selectedPaths.includes(path);
            this.selectedPaths = hasPath
                ? this.selectedPaths.filter(existing => existing !== path)
                : [...this.selectedPaths, path];
            this.notifyFilesSelected(this.selectedPaths);
        } else {
            this.selectedPath = path;
            this.notifyFileSelected(path);
        }
    }

    @action
    refresh(): void {
        this.loadFileMetadata.perform();
    }

    @action
    preventPropagation(event: Event): void {
        event.stopPropagation();
    }

    @action
    expandFolder(entry: FileMetadataEntry, expand: boolean): void {
        this.folderExpands[entry.path] = expand;
        this.folderExpands = { ...this.folderExpands };
    }

    private notifyFileSelected(path: string): void {
        const value = this.buildValueForPath(path);
        this.args.onChange({
            value,
            type: 'json',
        });
    }

    private notifyFilesSelected(paths: string[]): void {
        if (paths.length === 0) {
            this.args.onChange({
                value: null,
                type: 'json',
            });
            return;
        }
        const values = paths.map(path => this.buildValueForPath(path));
        this.args.onChange({
            value: values,
            type: 'json',
        });
    }

    private buildValueForPath(path: string): FileMetadataValue {
        const project = this.metadataNodeProject;
        const entry = project && project.files.find((f: FileEntry) => f.path === path);
        const item = entry && entry.items.find((it: MetadataItem) => it.schema === this.schemaId);

        return {
            id: path,
            data: item ? item.data : {},
            schema: this.schemaInfo,
        };
    }

    private extractPathsFromValue(valueWithType: FieldValueWithType): string[] {
        if (valueWithType.type === 'json') {
            const raw = valueWithType.value;
            if (Array.isArray(raw)) {
                return raw
                    .map((item: FileMetadataValue) => item && item.id)
                    .filter((id): id is string => Boolean(id));
            }
            if (raw && typeof raw === 'object') {
                const single = raw as FileMetadataValue;
                return single.id ? [single.id] : [];
            }
            return [];
        }
        const path = toStringValue(valueWithType);
        return path ? [path] : [];
    }

    private get schemaInfo(): SchemaInfo {
        const schema = this.registrationSchema;
        if (!schema) {
            throw new Error('Registration schema is not loaded for the selected file metadata');
        }
        const schemaId = schema.get('id');
        if (!schemaId) {
            throw new Error('Registration schema id is missing for the selected file metadata');
        }
        const schemaName = schema.get('name');
        if (!schemaName) {
            throw new Error('Registration schema name is missing for the selected file metadata');
        }
        return {
            id: schemaId,
            name: schemaName,
        };
    }
}
