import Component from '@ember/component';
import { action } from '@ember/object';
import { requiredAction } from 'ember-osf-web/decorators/component';
import $ from 'jquery';

export default class NamedItemEditor extends Component {
    name: string = '';

    @requiredAction onConfirm!: (name: string) => void;

    @requiredAction onCancel!: () => void;

    didRender() {
        $('.input-package-name').focus();
    }

    @action
    confirm(this: NamedItemEditor) {
        this.set('name', $('.input-package-name').val());
        if (!this.onConfirm) {
            return;
        }
        this.onConfirm(this.get('name'));
    }

    @action
    cancel(this: NamedItemEditor) {
        if (!this.onCancel) {
            return;
        }
        this.onCancel();
    }

    @action
    nameKeyDown(this: NamedItemEditor, event: KeyboardEvent) {
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
