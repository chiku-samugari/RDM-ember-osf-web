import { HandlerContext, Model, Request, Schema } from 'ember-cli-mirage';

import CustomBaseImageModel from 'ember-osf-web/models/custom-base-image';

const makeResourceObject = (model: Model<CustomBaseImageModel>) => ({
    id: model.id,
    type: 'custom-base-image',
    attributes: {
        name: model.name,
        imageReference: model.imageReference,
        descriptionJa: model.descriptionJa,
        descriptionEn: model.descriptionEn,
        deprecated: model.deprecated,
        guid: model.guid,
        level: model.level,
        nodeTitle: model.nodeTitle,
    },
});

export function create(this: HandlerContext, schema: Schema, req: Request) {
    const { data } = JSON.parse(req.requestBody);
    if (!data) {
        throw new Error('Malformed create request. No "data" property.');
    }
    const { attributes } = data;
    if (!attributes) {
        throw new Error('Malformed create request. No "attributes" property.');
    }

    return schema.customBaseImages.create({
        name: attributes.name,
        imageReference: attributes.imageReference,
        descriptionJa: attributes.descriptionJa,
        descriptionEn: attributes.descriptionEn,
        deprecated: attributes.deprecated,
        guid: attributes.guid,
        level: 0,
        nodeTitle: `Node ID: ${attributes.guid}`,
    });
}

export function read(this: HandlerContext, schema: Schema, req: Request) {
    return {
        data: schema.customBaseImages.all().models.filter(
            image => image.guid === req.params.pid,
        ).map(makeResourceObject),
    };
}

export function del(this: HandlerContext, schema: Schema, req: Request) {
    return schema.customBaseImages.find(req.params.image_id).destroy();
}
