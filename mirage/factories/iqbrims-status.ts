import { Factory } from 'ember-cli-mirage';

import IQBRIMSStatusModel from 'ember-osf-web/models/iqbrims-status';

export default Factory.extend<IQBRIMSStatusModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        iqbrimsStatuses: IQBRIMSStatusModel;
    } // eslint-disable-line semi
}
