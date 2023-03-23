import File from 'ember-osf-web/models/file';

interface Checked {
    [path: string]: boolean;
}

export class SelectionManager {
    checked: Checked = {};

    isChecked(item: File) {
        const v = this.checked[item.get('materializedPath')];
        if (v === undefined) {
            return true;
        }
        return v;
    }

    setChecked(item: File, value: boolean) {
        if (this.isChecked(item) === value) {
            return;
        }
        this.checked[item.get('materializedPath')] = value;
    }
}
