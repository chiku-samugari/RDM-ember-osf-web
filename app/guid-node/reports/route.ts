import Route from '@ember/routing/route';

export default class GuidNodeReports extends Route {
    model(params: { draftId: string }) {
        return params.draftId;
    }
}
