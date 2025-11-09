import { HandlerContext, Schema } from 'ember-cli-mirage';

export function iqbrimsStatus(this: HandlerContext, schema: Schema) {
    const model = schema.iqbrimsStatuses.first();
    const json = this.serialize(model);
    return json;
}
