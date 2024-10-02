import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
    title: string;
    content: string;
    enable: boolean;
    onSave: () => void;
    onChange: (event: { target: HTMLInputElement }) => void;
}

export default class TextfileEditor extends Component<Args> {
    @tracked editorOpenBit: boolean = true;

    @action
    flipEditorOpenBit() {
        this.editorOpenBit = !this.editorOpenBit;
    }
}
