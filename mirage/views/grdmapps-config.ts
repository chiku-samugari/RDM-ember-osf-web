import { HandlerContext, Schema } from 'ember-cli-mirage';

export function grdmappsConfig(this: HandlerContext, schema: Schema) {
    const model = schema.grdmappsConfigs.first();
    const json = this.serialize(model);
    return json;
}
