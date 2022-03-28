import { HandlerContext, Schema } from 'ember-cli-mirage';

export function metadataNodeErad(this: HandlerContext, schema: Schema) {
    const model = schema.metadataNodeErads.first();
    const json = this.serialize(model);
    return json;
}
