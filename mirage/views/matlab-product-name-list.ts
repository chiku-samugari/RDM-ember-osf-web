import { HandlerContext, Model, Request, Schema } from 'ember-cli-mirage';

import MatlabProductNameList from 'ember-osf-web/models/matlab-product-name-list';

const makeResourceObject = (model: Model<MatlabProductNameList>) => ({
    id: model.id,
    type: 'matlab-product-name-list',
    attributes: {
        release: model.release,
        names: model.names,
    },
});

export function read(this: HandlerContext, schema: Schema, req: Request) {
    const model = schema.matlabProductNameLists.all().models.find(({ release }) => release === req.params.release);
    if (typeof model === 'undefined') {
        return {
            data: {
                id: 0,
                type: 'matlab-product-name-list',
                attributes: {
                    release: 'INVALID',
                    names: [],
                },
            },
        };
    }
    return {
        data: makeResourceObject(model),
    };
}
