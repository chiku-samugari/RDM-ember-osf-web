import Component from '@ember/component';
import { assert } from '@ember/debug';
import { not } from '@ember/object/computed';
import fade from 'ember-animated/transitions/fade';
import { toLeft, toRight } from 'ember-animated/transitions/move-over';

import { layout } from 'ember-osf-web/decorators/component';
import { SelectionManager } from 'ember-osf-web/guid-node/package/selection';
import { WaterButlerFile } from 'ember-osf-web/utils/waterbutler/base';
import { WaterButlerFilesManager } from '../manager/component';

import styles from './styles';
import template from './template';

@layout(template, styles)
export default class FileBrowser extends Component {
    filesManager!: WaterButlerFilesManager;
    selectionManager?: SelectionManager;
    transition = fade;

    @not('filesManager.inRootFolder') notInRootFolder!: boolean;

    didReceiveAttrs() {
        assert('Files::Browse requires @filesManager!', Boolean(this.filesManager));
    }

    rules(context: { newItems: [WaterButlerFile], oldItems: [WaterButlerFile] }) {
        const { newItems: [newFolder], oldItems: [oldFolder] } = context;
        if (oldFolder) {
            if (!newFolder || oldFolder.materializedPath.includes(newFolder.materializedPath)) {
                return toRight;
            }
        }

        return toLeft;
    }
}
