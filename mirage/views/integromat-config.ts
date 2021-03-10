import { HandlerContext, Schema } from 'ember-cli-mirage';

export function integromatConfig(this: HandlerContext, schema: Schema) {
    const model = schema.integromatConfigs.first();
    const json = this.serialize(model);
    return json;
}
