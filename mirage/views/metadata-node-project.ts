import { HandlerContext, Schema } from 'ember-cli-mirage';

export function metadataNodeProject(this: HandlerContext, schema: Schema) {
    const model = schema.metadataNodeProjects.first();
    const json = this.serialize(model);
    return json;
}
