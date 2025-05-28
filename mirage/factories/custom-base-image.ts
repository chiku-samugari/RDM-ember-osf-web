import { Factory } from 'ember-cli-mirage';

import CustomBaseImageModel from 'ember-osf-web/models/custom-base-image';

export default Factory.extend<CustomBaseImageModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        customBaseImages: CustomBaseImageModel;
    } // eslint-disable-line semi
}
