import Component from '@ember/component';
import EmberError from '@ember/error';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import DS from 'ember-data';
import { requiredAction } from 'ember-osf-web/decorators/component';

import { MpmPackageEditorError } from 'ember-osf-web/guid-node/binderhub/errors';
import Node from 'ember-osf-web/models/node';

function productNameCategory(name: string): string {
    const initial = name.charAt(0);
    if (initial.charCodeAt(0) >= 65 && initial.charCodeAt(0) <= 90) {
        return initial;
    }
    return '_';
}

function generateSegmentHighlightMap(text: string, highlightSequence: string[]) {
    const loweredText = text.toLowerCase();
    let start = 0;
    const segmentHlMap = [];
    for (const hl of highlightSequence) {
        const pos = loweredText.indexOf(hl, start);
        if (pos < 0) {
            return [];
        }
        segmentHlMap.push(
            { segment: text.substring(start, pos), highlight: false },
            { segment: text.substring(pos, pos + hl.length), highlight: true },
        );
        start = pos + hl.length;
    }
    segmentHlMap.push({ segment: text.substring(start), highlight: false });
    return segmentHlMap;
}

interface MpmConfig {
    release: string | null;
    products: string[] | null;
}

enum ManualAddState {
    NONE = 'NONE',
    SUCCESSED = 'SUCCESSED',
    CONFLICT = 'CONFLICT',
    INVALID = 'INVALID',
}

export default class MpmPackageEditor extends Component {
    @service store!: DS.Store;

    node?: Node | null = null;

    label: string = this.label;

    url: string | null = this.url;

    config: MpmConfig | null = this.config;

    availableReleases: string[] = [];

    productNames: string[] = [];

    productNamesFindingBit: boolean = false;

    productPicking: boolean = false;

    filterQuery: string = '';

    @requiredAction onUpdate!: (config: MpmConfig) => void;

    manualProductName: string = '';

    latestManualProductName: string = '';

    manualAddState: ManualAddState = ManualAddState.NONE;

    @computed('config')
    get release() {
        if (!this.config) {
            return null;
        }
        return this.config.release;
    }

    @computed('config')
    get products() {
        if (!this.config) {
            return null;
        }
        return this.config.products;
    }

    @action
    startProductPicking() {
        this.set('productPicking', true);
        this.set('filterQuery', '');
    }

    @action
    initProductNames() {
        if (this.get('release')) {
            this.updateProductNames(this.get('release'));
        }
    }

    @action
    closeProductsAddDialogue() {
        this.set('productPicking', false);
        this.set('filterQuery', '');
        this.set('manualProductName', '');
        this.set('latestManualProductName', '');
        this.set('manualAddState', ManualAddState.NONE);
    }

    @computed('release', 'productNames')
    get productNamesCategorizedHash() {
        const release = this.get('release') as string;
        if (!release) {
            return {};
        }

        return this.get('productNames').reduce(
            (acc: {[key: string]: string[]}, name: string) => {
                const category = productNameCategory(name);
                const ar = acc[category] || [];
                acc[category] = [...ar, name].sort();
                return acc;
            }, {},
        );
    }

    @computed('release', 'filterQuery', 'productNames')
    get annotatedProductNameArray() {
        const release = this.get('release') as string;
        if (!release) {
            return [];
        }
        const highlightSequence = this.get('filterQuery').toLowerCase().split(' ');
        const result = [];
        for (const name of this.get('productNames')) {
            const segmentHlMap = generateSegmentHighlightMap(name, highlightSequence);
            if (segmentHlMap.length > 0) {
                result.push({ name, segmentHlMap });
            }
        }
        return result;
    }

    @computed('filterQuery')
    get isFiltering() {
        return this.get('filterQuery').length > 0;
    }

    @computed('productNamesCategorizedHash')
    get productNameCategories() {
        return Object.keys(this.get('productNamesCategorizedHash')).sort();
    }

    @computed('products')
    get pickedProductsHash() {
        return (this.products || []).reduce((acc, name) => {
            acc[name] = true;
            return acc;
        }, {} as {[key: string]: boolean});
    }

    @action
    addProduct(name: string) {
        if (!this.release) {
            throw new EmberError('Invalid State. An MPM release must be selected beforehand.');
        }
        if (!this.onUpdate) {
            return;
        }
        if (name.length === 0) {
            throw new MpmPackageEditorError('Invalid Operation. Product name must not be zero-length.');
        }
        if ((this.products || []).includes(name)) {
            throw new MpmPackageEditorError(`Malformed Operation. Product ${name} is already picked.`);
        }
        this.onUpdate({
            release: this.release,
            products: [name, ...(this.products || [])].sort(),
        });
    }

    @action
    removeProduct(name: string) {
        if (!this.onUpdate) {
            return;
        }
        this.onUpdate({
            release: this.release,
            products: (this.products || []).map(x => x).filter(picked => picked !== name),
        });
    }

    @action
    pickRelease(release: string | null) {
        const { config } = this;
        if (!this.onUpdate || (config !== null && config.release === release)) {
            return;
        }
        this.updateProductNames(release);
        this.onUpdate({ release, products: null });
    }

    updateProductNames(release: string | null) {
        const { node } = this;
        if (!node) {
            throw new EmberError('Illegal state. The node object is not set.');
        }
        this.set('productNamesFindingBit', true);
        later(async () => {
            if (release !== null) {
                const productNameList = await this.store.findRecord(
                    'matlab-product-name-list',
                    release,
                    { adapterOptions: { guid: node.id } },
                );
                this.set('productNames', productNameList.names);
            }
            this.set('productNamesFindingBit', false);
        }, 0);
    }

    @action
    updateFilter(event: { target: HTMLInputElement }) {
        this.set('filterQuery', event.target.value);
    }

    @action
    onProductNameChanged(event: { target: HTMLInputElement }) {
        this.set('manualProductName', event.target.value);
        this.set('manualAddState', ManualAddState.NONE);
    }

    @action
    addManualProductName(name: string) {
        try {
            const actualName = name.trim();
            if (actualName === '' || actualName.match(/\s/)) {
                this.set('manualAddState', ManualAddState.INVALID);
                return;
            }
            this.addProduct(actualName);
            this.set('manualProductName', '');
            this.set('latestManualProductName', name);
            this.set('manualAddState', ManualAddState.SUCCESSED);
        } catch (e) {
            if (e instanceof MpmPackageEditorError) {
                this.set('latestManualProductName', name);
                this.set('manualAddState', ManualAddState.CONFLICT);
            } else {
                throw e;
            }
        }
    }
}
