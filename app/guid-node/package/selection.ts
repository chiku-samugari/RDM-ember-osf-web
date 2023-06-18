import File from 'ember-osf-web/models/file';

interface Checked {
    [path: string]: boolean;
}

export class SelectionManager {
    checked: Checked = {};

    isChecked(item: File) {
        const materializedPath = item.get('materializedPath');
        const v = this.checked[materializedPath];
        if (v === undefined) {
            if (materializedPath === '/.weko/') {
                // .weko folder is not selected by default
                return false;
            }
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
