import { Factory } from 'ember-cli-mirage';

import MatlabProductNameList from 'ember-osf-web/models/matlab-product-name-list';

export default Factory.extend<MatlabProductNameList>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        matlabProductNameLists: MatlabProductNameList;
    } // eslint-disable-line semi
}
