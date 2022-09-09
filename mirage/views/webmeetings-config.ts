import { HandlerContext, Schema } from 'ember-cli-mirage';

export function webmeetingsConfig(this: HandlerContext, schema: Schema) {
    const model = schema.webmeetingsConfigs.first();
    const json = this.serialize(model);
    return json;
}
