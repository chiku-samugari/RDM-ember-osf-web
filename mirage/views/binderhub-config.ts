import { HandlerContext, Schema } from 'ember-cli-mirage';

export function binderhubConfig(this: HandlerContext, schema: Schema) {
    const model = schema.binderhubConfigs.first();
    const json = this.serialize(model);
    return json;
}
