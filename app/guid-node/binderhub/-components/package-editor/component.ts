import Component from '@ember/component';
import { action } from '@ember/object';
// import DS from 'ember-data';
import { requiredAction } from 'ember-osf-web/decorators/component';
// import BinderHubConfigModel from 'ember-osf-web/models/binderhub-config';

export default class PackageEditor extends Component {
    node?: Node | null = null;

    label: string = this.label;

    packages: Array<[string, string]> = this.packages;

    editing: string = '';

    editingIndex: number = -1;

    editingName: string = '';

    editingVersion: string = '';

    @requiredAction onUpdate!: (newPackages: Array<[string, string]>) => void;

    @requiredAction onEditingStart!: () => void;

    @requiredAction onEditingEnd!: () => void;

    @action
    addPackage(this: PackageEditor) {
        this.set('editingIndex', -1);
        this.set('editingName', '');
        this.set('editingVersion', '');
        if (!this.onEditingStart) {
            return;
        }
        this.onEditingStart();
    }

    @action
    confirmAdd(this: PackageEditor, name: string, version: string) {
        this.set('editingIndex', -1);
        if (this.onEditingEnd) {
            this.onEditingEnd();
        }
        if (!this.onUpdate) {
            return;
        }
        const newPackages = this.packages.map(elem => elem);
        newPackages.push([name, version]);
        this.onUpdate(newPackages);
    }

    @action
    cancelAdd(this: PackageEditor) {
        this.set('editingIndex', -1);
        if (!this.onEditingEnd) {
            return;
        }
        this.onEditingEnd();
    }

    @action
    removePackage(this: PackageEditor, index: number) {
        if (!this.onUpdate) {
            return;
        }
        const newPackages = this.packages.map(elem => elem);
        newPackages.splice(index, 1);
        this.onUpdate(newPackages);
    }

    @action
    editPackage(this: PackageEditor, index: number) {
        this.set('editingIndex', index);
        const allPackages = this.get('packages');
        const editingPackage = allPackages[index];
        this.set('editingName', editingPackage[0]);
        this.set('editingVersion', editingPackage[1]);
        if (!this.onEditingStart) {
            return;
        }
        this.onEditingStart();
    }

    @action
    confirmEdit(this: PackageEditor, name: string, version: string) {
        const index = this.get('editingIndex');
        this.set('editingIndex', -1);
        if (this.onEditingEnd) {
            this.onEditingEnd();
        }
        if (!this.onUpdate) {
            return;
        }
        const newPackages = this.packages.map(elem => elem);
        newPackages.splice(index, 1, [name, version]);
        this.onUpdate(newPackages);
    }

    @action
    cancelEdit(this: PackageEditor) {
        this.set('editingIndex', -1);
        if (!this.onEditingEnd) {
            return;
        }
        this.onEditingEnd();
    }
}
