import Component from '@ember/component';
import { action, computed } from '@ember/object';
import { requiredAction } from 'ember-osf-web/decorators/component';
import $ from 'jquery';

export interface MpmConfig {
    release: string | null;
    products: string[] | null;
}

export default class MpmPackageEditor extends Component {
    node?: Node | null = null;

    label: string = this.label;

    config: MpmConfig | null = this.config;

    editing: string = '';

    editingIndex: number = -1;

    editingName: string = '';

    releaseEditing: boolean = false;

    @requiredAction onUpdate!: (config: MpmConfig) => void;

    @requiredAction onEditingStart!: () => void;

    @requiredAction onEditingEnd!: () => void;

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
    addProduct(this: MpmPackageEditor) {
        this.set('editingIndex', -1);
        this.set('editingName', '');
        if (!this.onEditingStart) {
            return;
        }
        this.onEditingStart();
    }

    @action
    confirmAdd(this: MpmPackageEditor, name: string) {
        this.set('editingIndex', -1);
        if (this.onEditingEnd) {
            this.onEditingEnd();
        }
        if (!this.onUpdate) {
            return;
        }
        const newProducts = (this.products || []).map(elem => elem);
        newProducts.push(name);
        this.onUpdate({
            release: this.release,
            products: newProducts,
        });
    }

    @action
    cancelAdd(this: MpmPackageEditor) {
        this.set('editingIndex', -1);
        if (!this.onEditingEnd) {
            return;
        }
        this.onEditingEnd();
    }

    @action
    removeProduct(this: MpmPackageEditor, index: number) {
        if (!this.onUpdate) {
            return;
        }
        const newProducts = (this.products || []).map(elem => elem);
        newProducts.splice(index, 1);
        this.onUpdate({
            release: this.release,
            products: newProducts,
        });
    }

    @action
    editProduct(this: MpmPackageEditor, index: number) {
        this.set('editingIndex', index);
        const allProducts = this.get('products') || [];
        const editingProduct = allProducts[index];
        this.set('editingName', editingProduct);
        if (!this.onEditingStart) {
            return;
        }
        this.onEditingStart();
    }

    @action
    confirmEdit(this: MpmPackageEditor, name: string) {
        const index = this.get('editingIndex');
        this.set('editingIndex', -1);
        if (this.onEditingEnd) {
            this.onEditingEnd();
        }
        if (!this.onUpdate) {
            return;
        }
        const newProducts = (this.products || []).map(elem => elem);
        newProducts.splice(index, 1, name);
        this.onUpdate({
            release: this.release,
            products: newProducts,
        });
    }

    @action
    cancelEdit(this: MpmPackageEditor) {
        this.set('editingIndex', -1);
        if (!this.onEditingEnd) {
            return;
        }
        this.onEditingEnd();
    }

    @action
    confirmReleaseEdit(this: MpmPackageEditor) {
        const value = $('.input-release-name').val();
        this.set('releaseEditing', false);
        const { config } = this;
        if (!this.onUpdate) {
            return;
        }
        this.onUpdate({
            release: value ? value.toString() : null,
            products: config ? config.products : null,
        });
    }

    @action
    releaseKeyDown(this: MpmPackageEditor, event: KeyboardEvent) {
        const { key } = event;
        if (key !== 'Enter') {
            return;
        }
        const input = event.target as HTMLInputElement;
        this.set('releaseEditing', false);
        const { config } = this;
        if (!this.onUpdate) {
            return;
        }
        this.onUpdate({
            release: input.value,
            products: config ? config.products : null,
        });
    }
}
