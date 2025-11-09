import FileProviderModel from 'ember-osf-web/models/file-provider';
import CurrentUser from 'ember-osf-web/services/current-user';
import { WaterButlerFile } from './base';
import WaterButlerFileProvider from './provider';

/**
 * Wrapper to access WaterButler's file service using osf.io FileProviderModel.
 *
 * @param currentUser Current User service.
 * @param provider FileProviderModel
 * @returns WaterButlerFile
 */
export async function wrap(currentUser: CurrentUser, provider: FileProviderModel): Promise<WaterButlerFile> {
    const { links } = provider;
    const metadata = {
        kind: provider.kind !== undefined ? provider.kind.toString() : undefined,
        name: provider.name,
        path: provider.path,
        provider: provider.provider,
    };
    return new WaterButlerFileProvider(currentUser, metadata, links);
}
