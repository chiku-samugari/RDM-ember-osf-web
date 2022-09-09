import { Factory } from 'ember-cli-mirage';

import WebmeetingsConfigModel from 'ember-osf-web/models/webmeetings-config';

export default Factory.extend<WebmeetingsConfigModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        webmeetingsConfigs: WebmeetingsConfigModel;
    } // eslint-disable-line semi
}
