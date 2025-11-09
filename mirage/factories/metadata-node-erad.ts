import { Factory } from 'ember-cli-mirage';

import MetadataNodeEradModel from 'ember-osf-web/models/metadata-node-erad';

export default Factory.extend<MetadataNodeEradModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        metadataNodeErads: MetadataNodeEradModel;
    } // eslint-disable-line semi
}
