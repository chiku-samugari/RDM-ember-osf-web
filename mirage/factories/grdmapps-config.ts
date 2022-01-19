import { Factory } from 'ember-cli-mirage';

import GrdmappsConfigModel from 'ember-osf-web/models/grdmapps-config';

export default Factory.extend<GrdmappsConfigModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        grdmappsConfigs: GrdmappsConfigModel;
    } // eslint-disable-line semi
}
