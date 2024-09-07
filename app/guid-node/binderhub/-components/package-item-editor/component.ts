import Component from '@ember/component';
import { action } from '@ember/object';
import { requiredAction } from 'ember-osf-web/decorators/component';
import $ from 'jquery';

export default class PackageItemEditor extends Component {
    name: string = '';

    version: string = '';

    @requiredAction onConfirm!: (name: string, version: string) => void;

    @requiredAction onCancel!: () => void;

    didRender() {
        $('.input-package-name').focus();
    }

    @action
    confirm(this: PackageItemEditor) {
        this.set('name', $('.input-package-name').val());
        this.set('version', $('.input-package-version').val());
        if (!this.onConfirm) {
            return;
        }
        this.onConfirm(this.get('name'), this.get('version'));
    }

    @action
    cancel(this: PackageItemEditor) {
        if (!this.onCancel) {
            return;
        }
        this.onCancel();
    }

    @action
    nameKeyDown(this: PackageItemEditor, event: KeyboardEvent) {
        const { key } = event;
        if (key === 'Escape') {
            this.cancel();
            return;
        }
        if (key !== 'Enter') {
            return;
        }
        $('.input-package-version').focus();
    }

    @action
    versionKeyDown(this: PackageItemEditor, event: KeyboardEvent) {
        const { key } = event;
        if (key === 'Escape') {
            this.cancel();
            return;
        }
        if (key !== 'Enter') {
            return;
        }
        this.confirm();
    }
}
