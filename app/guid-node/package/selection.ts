import { WaterButlerFile } from 'ember-osf-web/utils/waterbutler/base';

interface Checked {
    [path: string]: boolean;
}

export class SelectionManager {
    // .weko folder is not selected by default
    checked: Checked = {
        '/.weko/': false,
    };

    isChecked(item: WaterButlerFile) {
        const { materializedPath } = item;
        const v = this.checked[materializedPath];
        if (v === undefined) {
            return true;
        }
        return v;
    }

    setChecked(item: WaterButlerFile, value: boolean) {
        if (this.isChecked(item) === value) {
            return;
        }
        this.checked[item.materializedPath] = value;
    }
}
