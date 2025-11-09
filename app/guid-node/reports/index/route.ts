import Route from '@ember/routing/route';

export default class GuidNodeReportsIndex extends Route {
    model() {
        this.replaceWith('registries.drafts.draft', this.modelFor('guid-node.reports'));
    }
}
