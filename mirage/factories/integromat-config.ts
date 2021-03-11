import { Factory } from 'ember-cli-mirage';

import IntegromatConfigModel from 'ember-osf-web/models/integromat-config';

export default Factory.extend<IntegromatConfigModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        integromatConfigs: IntegromatConfigModel;
    } // eslint-disable-line semi
}