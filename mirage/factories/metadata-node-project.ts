import { Factory } from 'ember-cli-mirage';

import MetadataNodeProjectModel from 'ember-osf-web/models/metadata-node-project';

export default Factory.extend<MetadataNodeProjectModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        metadataNodeProjects: MetadataNodeProjectModel;
    } // eslint-disable-line semi
}
