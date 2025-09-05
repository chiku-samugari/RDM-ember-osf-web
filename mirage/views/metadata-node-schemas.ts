import { HandlerContext, Request } from 'ember-cli-mirage';

export function metadataNodeSchemas(this: HandlerContext, _: any, request: Request) {
    // Extract the node ID from the URL
    const nodeId = request.params.id;

    // Return a single metadata-node-schema object with formats and destinations
    // This endpoint expects a single object response for findRecord
    return {
        data: {
            id: nodeId,
            type: 'metadata-node-schema',
            attributes: {
                formats: [
                    {
                        id: 'format-1',
                        schema_id: '67408a3cf0d0a5000109c617',
                        name: 'メタデータ共通項目2024版CSV形式 (日本語)',
                    },
                    {
                        id: 'format-2',
                        schema_id: '67408a3cf0d0a5000109c617',
                        name: 'Common Metadata Elements 2024 edition CSV format (English)',
                    },
                ],
                destinations: [],
            },
        },
    };
}
