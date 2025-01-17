import { Factory } from 'ember-cli-mirage';

import ServerAnnotationModel from 'ember-osf-web/models/server-annotation';

export default Factory.extend<ServerAnnotationModel>({
});

declare module 'ember-cli-mirage/types/registries/schema' {
    export default interface MirageSchemaRegistry {
        serverAnnotations: ServerAnnotationModel;
    } // eslint-disable-line semi
}
