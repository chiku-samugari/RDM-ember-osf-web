import { HandlerContext, Model, Request, Schema } from 'ember-cli-mirage';

import ServerAnnotationModel from 'ember-osf-web/models/server-annotation';

const makeResourceObject = (annotModel: Model<ServerAnnotationModel>) => ({
    id: parseInt(annotModel.id, 10),
    type: 'server-annotation',
    attributes: {
        binderhubUrl: annotModel.binderhubUrl,
        jupyterhubUrl: annotModel.jupyterhubUrl,
        serverUrl: annotModel.serverUrl,
        name: annotModel.name,
        memotext: annotModel.memotext,
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

    return schema.serverAnnotations.create({
        binderhubUrl: attributes.binderhubUrl,
        jupyterhubUrl: attributes.jupyterhubUrl,
        serverUrl: attributes.serverUrl,
        name: attributes.name,
        memotext: '',
    });
}

export function read(this: HandlerContext, schema: Schema) {
    return {
        data: schema.serverAnnotations.all().models.map(makeResourceObject),
    };
}

export function del(this: HandlerContext, schema: Schema, req: Request) {
    return schema.serverAnnotations.find(req.params.aid).destroy();
}
