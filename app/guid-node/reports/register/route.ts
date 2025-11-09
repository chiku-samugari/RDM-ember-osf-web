import Route from '@ember/routing/route';

export default class GuidNodeReportsRegister extends Route {
    model() {
        this.replaceWith('registries.drafts.draft.review', this.modelFor('guid-node.reports'));
    }
}
