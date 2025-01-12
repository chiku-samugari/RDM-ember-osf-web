import { click, currentRouteName, fillIn } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { percySnapshot } from 'ember-percy';
import { module, test } from 'qunit';
import sinon from 'sinon';

import BinderHubConfigModel from 'ember-osf-web/models/binderhub-config';
import { Permission } from 'ember-osf-web/models/osf-model';
import { currentURL, setupOSFApplicationTest, visit } from 'ember-osf-web/tests/helpers';
import { AbstractFile, Metadata } from 'ember-osf-web/utils/waterbutler/base';

function createFileResponse(attrs: Metadata) {
    return {
        type: 'files',
        attributes: attrs,
        links: {
            delete: `http://localhost:7777/${attrs.provider}${attrs.path}`,
            upload: `http://localhost:7777/${attrs.provider}${attrs.path}`,
            download: `http://localhost:7777/${attrs.provider}${attrs.path}`,
        },
    };
}

function createFolderResponse(attrs: Metadata) {
    return {
        type: 'files',
        attributes: attrs,
        links: {
            delete: `http://localhost:7777/${attrs.provider}${attrs.path}`,
            upload: `http://localhost:7777/${attrs.provider}${attrs.path}`,
            download: `http://localhost:7777/${attrs.provider}${attrs.path}`,
        },
    };
}

function propertyWithValue(propertyName: string) {
    return (url: string | null = null) => `[${propertyName}${url ? `="${url}"` : ''}]`;
}

module('Acceptance | guid-node/binderhub', hooks => {
    const guid = 'i9bri';
    const MATLAB_RELEASES = ['R2024b', 'R2024a', 'R2023b', 'R2023a', 'R2022b', 'R2022a'];
    const MATLAB_PRODUCT_NAME_LIST = [
        'arc', 'buchanan', 'common', 'depth', 'eel', 'fledgeling',
        'guitar', 'hendrix', 'inch', 'jiim', 'king', 'lisp', 'mirror',
        'next', 'omni', 'purple', 'queue', 'roy', 'stevie', 'telecaster',
        'testpackage', 'util', 'vaughan', 'xtra', 'you', 'zz', '5GHz',
    ];
    // HS stands for HostSelector.
    const HS = {
        top: '[data-test-binderhub-host-selector]',
        curHost: 'data-test-host-selector-current-host',
        open: '[data-test-open-host-selector-dialogue]',
        dialogue: '[data-test-binderhub-host-selector-dialogue]',
        option: '[data-test-host-selection-option]',
        ok: '[data-test-host-selector-dialogue-ok]',
        cancel: '[data-test-host-selector-dialogue-cancel]',
        checked: 'input[type="radio"]:checked',
        notChecked: 'input[type="radio"]:not(:checked)',
    };

    // JSL stands for JupyterServersList
    const JSL = {
        top: '[data-test-binderhub-jupyter-servers-list]',
        launch: '[data-test-lab-launch-button]',
        memo: propertyWithValue('data-test-memo-editor'),
        delete: '[data-test-delete-icon]',
        ready: '.fa-play-circle',
        building: '.fa-spinner',
    };

    // PE stands for ProjectEditor
    const PE = {
        top: '[data-test-binderhub-project-editor]',
        // Be aware that this `url` is not an actual URL. It is called
        // URL in the project, anyway.
        selection: propertyWithValue('data-test-image-selection'),
        change: propertyWithValue('data-test-image-change'),
        selected: propertyWithValue('data-test-image-selected'),
        custom: {
            top: '[data-test-custom-base-image]',
            moreMenu: '[data-test-more-menu]',
            delete: '[data-test-delete-custom-base-image]',
            edit: '[data-test-edit-custom-base-image]',
        },
        deleteConfirmation: '[data-test-custom-base-image-delete-confirmation]',
        doDelete: '[data-test-do-delete-custom-base-image]',
        cancelDelete: '[data-test-cancel-delete]',
        separator: '[data-test-deprecated-image-separator]',
        closed: '.fa-chevron-right',
        open: '.fa-chevron-down',
        pkgEditor: propertyWithValue('data-test-package-editor'),
    };

    // MPD stands for Matlab Product Editor
    const MPE = {
        top: '[data-test-matlab-product-editor]',
        product: (v: string) => `input${propertyWithValue('value')(v)}`,
    };

    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('logged in', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: 'jupyter/test-image',
                        name: 'Test Image',
                        description: 'dummy description',
                        packages: ['conda'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('custom-base-image', {
            id: '1',
            name: 'Ubuntu Base',
            imageReference: 'docker.io/library/ubuntu:latest',
            descriptionJa: '標準的な Ubuntu イメージ',
            descriptionEn: 'Standard Ubuntu image',
            deprecated: false,
            guid,
            level: 0,
            nodeTitle: 'A great Project',
        });
        server.create('custom-base-image', {
            id: '2',
            name: 'Python Base',
            imageReference: 'docker.io/library/python:3.9',
            descriptionJa: 'Python 3.9 環境を含むイメージ',
            descriptionEn: 'Image with Python 3.9 environment',
            deprecated: false,
            guid,
            level: 0,
            nodeTitle: 'A great Project',
        });
        server.create('custom-base-image', {
            id: '3',
            name: 'Steel Bank Common Lisp',
            imageReference: 'docker.io/library/sbcl',
            descriptionJa: 'Steel Bank Common Lisp試験用',
            descriptionEn: 'Try out SBCL',
            deprecated: false,
            guid: 'dummy',
            level: 0,
            nodeTitle: 'A dummy Project',
        });
        server.create('file-provider', { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        wbFileAjaxStub
            .onFirstCall()
            .resolves({
                data: [
                    createFileResponse({
                        kind: 'file',
                        provider: 'osfstorage',
                        name: 'a',
                        path: '/a',
                    }),
                    createFileResponse({
                        kind: 'file',
                        provider: 'osfstorage',
                        name: 'b',
                        path: '/b',
                    }),
                    createFolderResponse({
                        kind: 'folder',
                        provider: 'osfstorage',
                        name: '.binder',
                        path: '/.binder',
                    }),
                ],
            });
        wbFileAjaxStub.resolves({
            data: [],
        });
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 1 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-jupyterhub-user]').hasText('testuser');
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('jupyter/test-image')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('jupyter/test-image')}`).exists();
        assert.dom(`${PE.top} ${PE.custom.top}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).doesNotExist();

        assert.equal(
            wbFileAjaxStub.callCount,
            5,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        await click(`${PE.top} ${PE.change('jupyter/test-image')}`);
        assert.dom(`${PE.top} ${PE.custom.top}`).exists({ count: 2 });
        assert.dom(`${PE.top} ${PE.custom.top} ${PE.custom.moreMenu}`).exists({ count: 2 });
        await click(`${PE.top} ${PE.custom.top} ${PE.custom.moreMenu}`);
        await click(`${PE.top} ${PE.custom.top} ${PE.custom.delete}`);
        assert.dom(`${PE.deleteConfirmation}`).exists();
        await click(`${PE.deleteConfirmation} ${PE.cancelDelete}`);
        assert.dom(`${PE.deleteConfirmation}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.custom.top}`).exists({ count: 2 });

        sandbox.restore();
    });

    test('We can change the host.', async function(assert) {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create(
            'server-annotation',
            {
                binderhubUrl: 'http://localhost:8585/',
                jupyterhubUrl: 'http://localhost:30123',
                serverUrl: `/user/testuser/${guid}-osfstorage-abcdefgh/`,
                name: `${guid}-osfstorage-abcdefgh`,
                memotext: 'I am abcdefgh.',
            },
        );
        server.create(
            'server-annotation',
            {
                binderhubUrl: 'http://localhost:8585/',
                jupyterhubUrl: 'http://localhost:30123',
                serverUrl: `/user/testuser/${guid}-osfstorage-ijklmnop/`,
                name: `${guid}-osfstorage-ijklmnop`,
                memotext: 'My name is ijklmnop.',
            },
        );
        server.create(
            'server-annotation',
            {
                binderhubUrl: 'http://localhost:31415/',
                jupyterhubUrl: 'http://localhost:27182',
                serverUrl: `/user/testuser/${guid}-osfstorage-1/`,
                name: `${guid}-osfstorage-1`,
                memotext: 'I am No.1',
            },
        );
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }, {
                default: false,
                url: 'http://localhost:31415/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN31415',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:27182/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }, {
                url: 'http://localhost:27182/',
                api_url: 'http://localhost:27182/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN27182',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
                {
                    binderhub_url: 'http://localhost:31415/',
                    jupyterhub_url: 'http://localhost:27182/',
                },
            ],
            user_binderhubs: [{
                binderhub_url: 'http://example.com:8585/',
                jupyterhub_url: 'http://example.com:30123/',
            }],
            deployment: {
                images: [
                    {
                        url: 'jupyter/test-image',
                        name: 'Test Image',
                        description: 'dummy description',
                        packages: ['conda'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('file-provider', { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {
                '': {
                    name: '',
                },
                'server-1': {
                    name: 'server-1',
                },
                [`${guid}-osfstorage-abcdefgh`]: {
                    name: `${guid}-osfstorage-abcdefgh`,
                    last_activity: '2024-11-05T18:00:00.120774Z',
                    started: null,
                    pending: 'spawn',
                    ready: false,
                    stopped: true,
                    url: `/user/testuser/${guid}-osfstorage-abcdefgh/`,
                    user_options: null,
                    progress_url: `/hub/api/users/testuser/servers/${guid}-osfstorage-abcdefgh/progress`,
                },
                [`${guid}-osfstorage-ijklmnop`]: {
                    name: `${guid}-osfstorage-ijklmnop`,
                    last_activity: '2024-11-05T18:00:00.120774Z',
                    started: null,
                    pending: null,
                    ready: true,
                    stopped: false,
                    url: `/user/testuser/${guid}-osfstorage-ijklmnop/`,
                    user_options: null,
                    progress_url: `/hub/api/users/testuser/servers/${guid}-osfstorage-ijklmnop/progress`,
                },
            },
            named_server_limit: 10,
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        wbFileAjaxStub
            .onFirstCall()
            .resolves({
                data: [
                    createFileResponse({
                        kind: 'file',
                        provider: 'osfstorage',
                        name: 'a',
                        path: '/a',
                    }),
                    createFileResponse({
                        kind: 'file',
                        provider: 'osfstorage',
                        name: 'b',
                        path: '/b',
                    }),
                    createFolderResponse({
                        kind: 'folder',
                        provider: 'osfstorage',
                        name: '.binder',
                        path: '/.binder',
                    }),
                ],
            });
        wbFileAjaxStub.resolves({
            data: [],
        });
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).exists({ count: 2 });
        assert.dom(`${JSL.top} ${JSL.launch} ${JSL.ready}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.launch} ${JSL.building}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.memo('preparing')}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo('ready')}`).exists({ count: 2 });
        assert.dom(`${JSL.top} ${JSL.delete}`).exists({ count: 2 });
        assert.dom('[data-test-jupyterhub-user]').hasText('testuser');
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('jupyter/test-image')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('jupyter/test-image')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).doesNotExist();

        assert.equal(
            wbFileAjaxStub.callCount,
            5,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );

        assert.dom(HS.top).exists({ count: 1 });
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();

        assert.dom(`${HS.dialogue} ${HS.option}`).exists({ count: 2 });
        assert.dom(`${HS.dialogue} ${HS.option} ${HS.checked}`).exists({ count: 1 });
        assert.dom(`${HS.dialogue} ${HS.option} ${HS.notChecked}`).exists({ count: 1 });

        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        await click(`${HS.dialogue} ${HS.option} ${HS.notChecked}`);
        await click(`${HS.dialogue} ${HS.cancel}`);
        await click(`${HS.top} ${HS.open}`);
        await click(`${HS.dialogue} ${HS.option} ${HS.checked}`);
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.ok(
            ajaxStub.calledOnceWithExactly(
                'http://localhost:30123/',
                'users/testuser?include_stopped_servers=1',
                null,
            ),
            'BinderHub calls JupyterHub REST API',
        );
        ajaxStub.resetHistory();
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {
                '': {
                    name: '',
                },
                'server-1': {
                    name: 'server-1',
                },

                [`${guid}-osfstorage-xyzuvabc`]: {
                    name: `${guid}-osfstorage-xyzuvabc`,
                    last_activity: '2024-11-05T18:00:00.120774Z',
                    started: null,
                    pending: null,
                    ready: true,
                    stopped: false,
                    url: `/user/testuser/${guid}-osfstorage-xyzuvabc/`,
                    user_options: null,
                    progress_url: `/hub/api/users/testuser/servers/${guid}-osfstorage-xyzuvabc/progress`,
                },
            },
            named_server_limit: 10,
        });

        await click(`${HS.top} ${HS.open}`);
        await click(`${HS.dialogue} ${HS.option} ${HS.notChecked}`);
        await click(`${HS.dialogue} ${HS.ok}`);
        const hostSelectorNode = this.element.querySelector(`${HS.top} ${HS.curHost}`);
        assert.notEqual(hostSelectorNode, 'null', 'HostSelector exists.');
        if (hostSelectorNode !== null) {
            // Although non-nullity of this object is already asserted
            // above, the compiler complains if we do not check it
            // explicitly.
            assert.equal(
                hostSelectorNode.getAttribute(HS.curHost),
                'http://localhost:31415/',
            );
        }
        assert.dom(`${JSL.top} ${JSL.launch}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.launch} ${JSL.ready}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.launch} ${JSL.building}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo('preparing')}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo('ready')}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.delete}`).exists({ count: 1 });
        sandbox.restore();
    });

    test('already configured, Dockerfile', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
                {
                    binderhub_url: 'http://192.168.168.167:8585/',
                    jupyterhub_url: 'http://192.168.168.167:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: 'jupyter/scipy-notebook',
                        name: 'Test Image',
                        description: 'dummy description',
                        packages: ['conda'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('file-provider',
            { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'Dockerfile',
                    path: '/.binder/Dockerfile',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders)
            .onThirdCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves({
            data: [],
        });
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const toStringStub = sinon.stub();
        toStringStub.returns('# rdm-binderhub:hash:7c5b3a3d0a63ffd19147fd8c5e52d9a0\nFROM jupyter/scipy-notebook\n');
        getContentsStub.resolves({ toString: toStringStub });
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 2 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('jupyter/scipy-notebook')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('jupyter/scipy-notebook')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).doesNotExist();

        assert.equal(
            wbFileAjaxStub.callCount,
            4,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves Dockerfile data',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        sandbox.restore();
    });

    test('already configured, repo2docker', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: '#repo2docker#r-base',
                        name: 'Test Repo2Docker',
                        description: 'dummy description',
                        packages: ['conda', 'rmran', 'mpm'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('file-provider',
            { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'a',
                    path: '/.binder/a',
                }),
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'environment.yml',
                    path: '/.binder/environment.yml',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves({
            data: [],
        });
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const toStringStub = sinon.stub();
        toStringStub.returns('# rdm-binderhub:hash:bb2a9dd68272d5f92e93acfbcfbbd267\n'
            + 'name: "#repo2docker#r-base"\ndependencies:\n- r-base\n');
        getContentsStub.resolves({ toString: toStringStub });
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 1 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).exists();

        assert.equal(
            wbFileAjaxStub.callCount,
            2,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves Dockerfile data',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        sandbox.restore();
    });

    test('already configured, pip on Dockerfile', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: 'jupyter/scipy-notebook',
                        name: 'Test Image',
                        description: 'dummy description',
                        packages: ['conda', 'pip'],
                        recommended: true,
                        deprecated: false,
                    },
                    {
                        url: '#repo2docker#r-base',
                        name: 'Test Repo2Docker',
                        description: 'dummy description',
                        packages: ['conda', 'pip', 'rmran'],
                        recommended: false,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('file-provider',
            { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'Dockerfile',
                    path: '/.binder/Dockerfile',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders)
            .onThirdCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves({
            data: [],
        });
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const toStringStub = sinon.stub();
        toStringStub.returns('# rdm-binderhub:hash:8a89cc5c3fed08d4da5a7b7396733b53\n'
            + 'FROM jupyter/scipy-notebook\n\nCOPY --chown=$NB_UID:$NB_GID . .\n');
        getContentsStub.resolves({ toString: toStringStub });
        const updateContentsStub = sandbox.stub(AbstractFile.prototype, 'updateContents');
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 1 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('jupyter/scipy-notebook')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('jupyter/scipy-notebook')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).doesNotExist();

        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves Dockerfile data',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );
        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').doesNotExist();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item]').doesNotExist();

        await click('[data-test-package-editor="pip"] [data-test-package-add]');

        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_name"]', 'testpackage');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.equal(
            wbFileAjaxStub.callCount,
            3,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.equal(
            wbFileAjaxStub.thirdCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves Dockerfile data',
        );
        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:b5593825f5c1fca1627623cc5870ba0a\nFROM jupyter/scipy-notebook\n\nUSER root\n'
                    + 'RUN pip install -U --no-cache-dir \\\n\t\ttestpackage \n\nUSER $NB_USER\n\n'
                    + 'COPY --chown=$NB_UID:$NB_GID . .\n',
            ),
            'BinderHub updates Dockerfile data(testpackage added)',
        );

        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').doesNotExist();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item]').exists();

        getContentsStub.reset();
        toStringStub.returns(
            '# rdm-binderhub:hash:b5593825f5c1fca1627623cc5870ba0a\nFROM jupyter/scipy-notebook\n\nUSER root\n'
                + 'RUN pip install -U --no-cache-dir \\\n\t\ttestpackage \n\nUSER $NB_USER\n\n'
                + 'COPY --chown=$NB_UID:$NB_GID . .\n',
        );
        getContentsStub.resolves({ toString: toStringStub });
        updateContentsStub.reset();
        wbFileAjaxStub.reset();
        wbFileAjaxStub.resolves(binderFolders);

        await click('[data-test-package-editor="pip"] [data-test-package-add]');

        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_name"]', 'testpackage2');
        await fillIn('[data-test-package-editor="pip"] input[name="package_version"]', '2.0.0');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.equal(
            wbFileAjaxStub.callCount,
            1,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:a45a5cbb263fad90f6a564cd978b7256\nFROM jupyter/scipy-notebook\n\n'
                    + 'USER root\nRUN pip install -U --no-cache-dir \\\n\t\ttestpackage  \\\n\t\t'
                    + 'testpackage2==2.0.0 \n\nUSER $NB_USER\n\nCOPY --chown=$NB_UID:$NB_GID . .\n',
            ),
            'BinderHub updates Dockerfile data(testpackage2 added)',
        );

        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').exists();

        getContentsStub.resetHistory();
        updateContentsStub.resetHistory();

        await click('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]');
        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_version"]', '1.0.0');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:d0a42ba50b7cd64445ea6f40ab5e5a40\nFROM jupyter/scipy-notebook\n\nUSER root\n'
                    + 'RUN pip install -U --no-cache-dir \\\n\t\ttestpackage==1.0.0  \\\n\t\ttestpackage2==2.0.0 \n\n'
                    + 'USER $NB_USER\n\nCOPY --chown=$NB_UID:$NB_GID . .\n',
            ),
            'BinderHub updates Dockerfile data(testpackage updated)',
        );

        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').exists();

        getContentsStub.resetHistory();
        updateContentsStub.resetHistory();

        await click('[data-test-package-editor="pip"] button[data-test-package-delete-item="0"]');

        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:42326367829418c69a54417da69946ad\nFROM jupyter/scipy-notebook\n\nUSER root\n'
                    + 'RUN pip install -U --no-cache-dir \\\n\t\ttestpackage2==2.0.0 \n\nUSER $NB_USER\n\n'
                    + 'COPY --chown=$NB_UID:$NB_GID . .\n',
            ),
            'BinderHub updates Dockerfile data(testpackage removed)',
        );

        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').doesNotExist();

        sandbox.restore();
    });

    test('already configured, pip on repo2docker', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: '#repo2docker#r-base',
                        name: 'Test Repo2Docker',
                        description: 'dummy description',
                        packages: ['conda', 'pip', 'rmran'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        const osfstorage = server.create('file-provider',
            { node, name: 'osfstorage' });
        const binderFolder = server.create('file', { target: node }, 'asFolder');
        binderFolder.update({
            name: '.binder',
        });
        server.create('file',
            {
                target: node,
                name: 'a',
                dateModified: new Date(2019, 3, 3),
                parentFolder: binderFolder,
            });
        server.create('file',
            {
                target: node,
                name: 'environment.yml',
                dateModified: new Date(2019, 2, 2),
                parentFolder: binderFolder,
            });
        osfstorage.rootFolder.update({
            files: [binderFolder],
        });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'a',
                    path: '/.binder/a',
                }),
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'environment.yml',
                    path: '/.binder/environment.yml',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves(binderFolders);
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const toStringStub = sinon.stub();
        toStringStub.returns('# rdm-binderhub:hash:bb2a9dd68272d5f92e93acfbcfbbd267\n'
            + 'name: "#repo2docker#r-base"\ndependencies:\n- r-base\n');
        getContentsStub.resolves({ toString: toStringStub });
        const updateContentsStub = sandbox.stub(AbstractFile.prototype, 'updateContents');
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 1 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).doesNotExist();

        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves environment.yml data',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );
        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').doesNotExist();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item]').doesNotExist();

        await click('[data-test-package-editor="pip"] [data-test-package-add]');

        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_name"]', 'testpackage');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.equal(
            wbFileAjaxStub.callCount,
            3,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.equal(
            wbFileAjaxStub.thirdCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            getContentsStub.calledOnceWithExactly(),
            'BinderHub retrieves Dockerfile data',
        );
        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:b093e8ad8a6f8545bffc2d2d2b0ea511\nname: "#repo2docker#r-base"\ndependencies:\n'
                    + '- r-base\n- pip\n- pip:\n  - testpackage\n',
            ),
            'BinderHub updates Dockerfile data(testpackage added)',
        );

        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item]').exists();

        getContentsStub.resetHistory();
        updateContentsStub.resetHistory();

        await click('[data-test-package-editor="pip"] [data-test-package-add]');

        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_name"]', 'testpackage2');
        await fillIn('[data-test-package-editor="pip"] input[name="package_version"]', '2.0.0');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:8945f069096ac7de0f2fc2b520c03c7e\nname: "#repo2docker#r-base"\ndependencies:\n'
                    + '- pip\n- r-base\n- pip:\n  - testpackage\n  - testpackage2==2.0.0\n',
            ),
            'BinderHub updates Dockerfile data(testpackage2 added)',
        );

        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').exists();

        getContentsStub.resetHistory();
        updateContentsStub.resetHistory();

        await click('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]');
        assert.dom('[data-test-package-editor="pip"] input[name="package_name"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-item-confirm]').exists();
        await fillIn('[data-test-package-editor="pip"] input[name="package_version"]', '1.0.0');
        await click('[data-test-package-editor="pip"] button[data-test-package-item-confirm]');

        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:0373e4c7c00ca8ca191fa56b757fd1c0\nname: "#repo2docker#r-base"\ndependencies:\n'
                    + '- pip\n- r-base\n- pip:\n  - testpackage==1.0.0\n  - testpackage2==2.0.0\n',
            ),
            'BinderHub updates Dockerfile data(testpackage updated)',
        );

        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').exists();

        getContentsStub.resetHistory();
        updateContentsStub.resetHistory();

        await click('[data-test-package-editor="pip"] button[data-test-package-delete-item="0"]');

        assert.ok(
            updateContentsStub.calledOnceWithExactly(
                '# rdm-binderhub:hash:1195309e970cd09c0353cc3bb8f3f532\nname: "#repo2docker#r-base"\ndependencies:\n'
                    + '- pip\n- r-base\n- pip:\n  - testpackage2==2.0.0\n',
            ),
            'BinderHub updates Dockerfile data(testpackage removed)',
        );

        assert.dom('[data-test-package-editor="conda"] button[data-test-package-edit-item]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="pip"] button[data-test-package-edit-item="1"]').doesNotExist();

        sandbox.restore();
    });

    test('already configured, mpm on repo2docker', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: '#repo2docker#r-base',
                        name: 'Test Repo2Docker',
                        description: 'dummy description',
                        packages: ['conda', 'pip', 'rmran', 'mpm'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        for (const release of MATLAB_RELEASES) {
            server.create(
                'matlab-product-name-list',
                {
                    release,
                    names: MATLAB_PRODUCT_NAME_LIST,
                },
            );
        }
        const osfstorage = server.create('file-provider',
            { node, name: 'osfstorage' });
        const binderFolder = server.create('file', { target: node }, 'asFolder');
        binderFolder.update({
            name: '.binder',
        });
        server.create('file',
            {
                target: node,
                name: 'a',
                dateModified: new Date(2019, 3, 3),
                parentFolder: binderFolder,
            });
        server.create('file',
            {
                target: node,
                name: 'environment.yml',
                dateModified: new Date(2019, 2, 2),
                parentFolder: binderFolder,
            });
        server.create('file',
            {
                target: node,
                name: 'mpm.yml',
                dateModified: new Date(2023, 3, 6),
                parentFolder: binderFolder,
            });
        osfstorage.rootFolder.update({
            files: [binderFolder],
        });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {},
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'a',
                    path: '/.binder/a',
                }),
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'environment.yml',
                    path: '/.binder/environment.yml',
                }),
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'mpm.yml',
                    path: '/.binder/mpm.yml',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves(binderFolders);
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const environmentToStringStub = sinon.stub();
        environmentToStringStub.returns('# rdm-binderhub:hash:bb2a9dd68272d5f92e93acfbcfbbd267\n'
            + 'name: "#repo2docker#r-base"\ndependencies:\n- r-base\n');
        const mpmToStringStub = sinon.stub();
        mpmToStringStub.returns('# rdm-binderhub:hash:34225c26e8a8c8c720f5c580e4a3d7f5\nrelease: R2023b\n'
            + 'products:\n- Simulink\n');
        getContentsStub
            .onFirstCall()
            .resolves({ toString: environmentToStringStub })
            .onSecondCall()
            .resolves({ toString: mpmToStringStub });
        const updateContentsStub = sandbox.stub(AbstractFile.prototype, 'updateContents');
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 1 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.memo()}`).doesNotExist();
        assert.dom(`${JSL.top} ${JSL.delete}`).doesNotExist();
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom(`${PE.top} ${PE.selection()}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.change('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.selected('#repo2docker#r-base')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('apt')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('conda')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('pip')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('rcran')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rgithub')}`).doesNotExist();
        assert.dom(`${PE.top} ${PE.pkgEditor('rmran')}`).exists();
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')}`).exists();

        assert.ok(
            getContentsStub.calledTwice,
            'BinderHub retrieves environment.yml and mpm.yml data',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-current-release]`).exists();

        await click(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-current-release]`);

        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-pick-release="R2023b"]`).exists();
        await click(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-pick-release="R2023b"]`);
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-mpm-product-add]`).exists();
        await click(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-mpm-product-add]`);
        assert.dom(`${MPE.top}`).exists();
        await click(`${MPE.top} ${MPE.product('testpackage')}`);
        await click(`${MPE.top} .close`);
        assert.dom(`${MPE.top}`).doesNotExist();

        assert.equal(
            getContentsStub.callCount,
            2,
            'BinderHub retrieves environment.yml and mpm.yml data',
        );
        assert.equal(
            wbFileAjaxStub.callCount,
            4,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            `http://localhost:8000/v2/nodes/${guid}/files/osfstorage/upload`,
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.equal(
            wbFileAjaxStub.thirdCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.equal(
            wbFileAjaxStub.getCall(3).args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.equal(
            updateContentsStub.callCount,
            4,
            'BinderHub updates environment.yml and mpm.yml data',
        );
        assert.equal(
            updateContentsStub.getCall(2).args[0],
            '# rdm-binderhub:hash:bb2a9dd68272d5f92e93acfbcfbbd267\n'
                + 'name: "#repo2docker#r-base"\ndependencies:\n- r-base\n',
            'BinderHub updates environment.yml data',
        );
        assert.equal(
            updateContentsStub.getCall(3).args[0],
            '# rdm-binderhub:hash:f9880f2fae49f7e942eaeb8e1d2a350c\nrelease: R2023b\n'
                + 'products:\n- Simulink\n- testpackage',
            'BinderHub updates mpm.yml data',
        );

        assert.dom('[data-test-package-editor="mpm"] button[data-test-mpm-product-edit-item]').exists();

        await click('[data-test-package-editor="mpm"] button[data-test-mpm-product-delete-item="0"]');

        assert.equal(
            updateContentsStub.callCount,
            6,
            'BinderHub updates environment.yml and mpm.yml data',
        );
        assert.equal(
            updateContentsStub.getCall(4).args[0],
            '# rdm-binderhub:hash:bb2a9dd68272d5f92e93acfbcfbbd267\n'
                + 'name: "#repo2docker#r-base"\ndependencies:\n- r-base\n',
            'BinderHub updates environment.yml data',
        );
        assert.equal(
            updateContentsStub.getCall(5).args[0],
            '# rdm-binderhub:hash:9ca1426351536ebf8bec446e98f9daf3\nrelease: R2023b\n'
                + 'products:\n- testpackage',
            'BinderHub updates mpm.yml data',
        );

        assert.dom('[data-test-package-editor="mpm"] button[data-test-mpm-product-edit-item="0"]').exists();
        assert.dom('[data-test-package-editor="mpm"] button[data-test-mpm-product-edit-item="1"]').doesNotExist();

        await click(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-current-release]`);
        await click(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-clear-release]`);
        assert.dom(`${PE.top} ${PE.pkgEditor('mpm')} button[data-test-mpm-product-add]`).doesNotExist();

        sandbox.restore();
    });

    test('reached server limit', async assert => {
        const node = server.create('node', {
            id: guid,
            currentUserPermissions: [Permission.Write],
        });
        server.create(
            'server-annotation',
            {
                binderhubUrl: 'http://localhost:8585/',
                jupyterhubUrl: 'http://localhost:30123',
                serverUrl: `/user/testuser/${guid}-osfstorage-1/`,
                name: `${guid}-osfstorage-1`,
                memotext: 'I am No.1',
            },
        );
        server.create('binderhub-config', {
            id: node.id,
            binderhubs: [{
                default: true,
                url: 'http://localhost:8585/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    access_token: 'TESTBHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
                jupyterhub_url: 'http://localhost:30123/',
            }],
            jupyterhubs: [{
                url: 'http://localhost:30123/',
                api_url: 'http://localhost:30123/hub/api/',
                authorize_url: 'http://localhost/authorize',
                token: {
                    user: 'testuser',
                    access_token: 'TESTJHTOKEN',
                    token_type: 'Bearer',
                    expires_at: null,
                },
            }],
            node_binderhubs: [
                {
                    binderhub_url: 'http://localhost:8585/',
                    jupyterhub_url: 'http://localhost:30123/',
                },
                {
                    binderhub_url: 'http://192.168.168.167:8585/',
                    jupyterhub_url: 'http://192.168.168.167:30123/',
                },
            ],
            user_binderhubs: [],
            deployment: {
                images: [
                    {
                        url: 'jupyter/scipy-notebook',
                        name: 'Test Image',
                        description: 'dummy description',
                        packages: ['conda'],
                        recommended: true,
                        deprecated: false,
                    },
                ],
            },
            mpm_releases: MATLAB_RELEASES,
        });
        server.create('file-provider',
            { node, name: 'osfstorage' });
        const sandbox = sinon.createSandbox();
        const ajaxStub = sandbox.stub(BinderHubConfigModel.prototype, 'jupyterhubAPIAJAX');
        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {
                '': {
                    name: '',
                },
                'server-1': {
                    name: 'server-1',
                },
                [`${guid}-osfstorage-1`]: {
                    name: `${guid}-osfstorage-1`,
                    url: `/user/testuser/${guid}-osfstorage-1/`,
                },
            },
        });
        const wbFileAjaxStub = sandbox.stub(AbstractFile.prototype, 'wbAuthenticatedAJAX');
        const rootFolders = {
            data: [
                createFolderResponse({
                    kind: 'folder',
                    provider: 'osfstorage',
                    name: '.binder',
                    path: '/.binder',
                }),
            ],
        };
        const binderFolders = {
            data: [
                createFileResponse({
                    kind: 'file',
                    provider: 'osfstorage',
                    name: 'Dockerfile',
                    path: '/.binder/Dockerfile',
                }),
            ],
        };
        wbFileAjaxStub
            .onFirstCall()
            .resolves(rootFolders)
            .onSecondCall()
            .resolves(binderFolders)
            .onThirdCall()
            .resolves(binderFolders);
        wbFileAjaxStub.resolves({
            data: [],
        });
        const getContentsStub = sandbox.stub(AbstractFile.prototype, 'getContents');
        const toStringStub = sinon.stub();
        toStringStub.returns('# rdm-binderhub:hash:7c5b3a3d0a63ffd19147fd8c5e52d9a0\nFROM jupyter/scipy-notebook\n');
        getContentsStub.resolves({ toString: toStringStub });
        const url = `/${node.id}/binderhub`;

        await visit(url);
        assert.equal(currentURL(), url, `We are on ${url}`);
        assert.equal(currentRouteName(), 'guid-node.binderhub', 'We are at guid-node.binderhub');
        await percySnapshot(assert);
        assert.dom('[data-test-servers-header]').exists();
        assert.dom('[data-test-binderhub-header]').exists();
        assert.dom(`${HS.top}`).exists();
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${HS.top} ${HS.open}`).exists();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        assert.dom(`${HS.option}`).exists({ count: 2 });
        await click(`${HS.dialogue} ${HS.ok}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        await click(`${HS.top} ${HS.open}`);
        assert.dom(`${HS.dialogue}`).exists();
        await click(`${HS.dialogue} ${HS.cancel}`);
        assert.dom(`${HS.dialogue}`).doesNotExist();
        assert.dom(`${JSL.top}`).exists();
        assert.dom(`${JSL.top} ${JSL.launch}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.memo('ready')}`).exists({ count: 1 });
        assert.dom(`${JSL.top} ${JSL.delete}`).exists({ count: 1 });
        assert.dom('[data-test-binderhub-launch]').exists();

        assert.dom('[data-test-server-list-item]').exists();
        assert.dom('[data-test-max-servers-exceeded]').doesNotExist();

        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        ajaxStub.resetHistory();

        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {
                '': {
                    name: '',
                },
                'server-1': {
                    name: 'server-1',
                },
                [`${guid}-osfstorage-1`]: {
                    name: `${guid}-osfstorage-1`,
                    url: `/user/testuser/${guid}-osfstorage-1/`,
                },
            },
            named_server_limit: 3,
        });

        await click('[data-test-server-refresh-button]');

        assert.dom('[data-test-server-list-item]').exists();
        assert.dom('[data-test-max-servers-exceeded]').doesNotExist();

        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        ajaxStub.resetHistory();

        ajaxStub.resolves({
            kind: 'user',
            name: 'testuser',
            servers: {
                '': {
                    name: '',
                },
                'server-1': {
                    name: 'server-1',
                },
                [`${guid}-osfstorage-1`]: {
                    name: `${guid}-osfstorage-1`,
                    url: `/user/testuser/${guid}-osfstorage-1/`,
                },
                [`${guid}-osfstorage-2`]: {
                    name: `${guid}-osfstorage-2`,
                    url: `/user/testuser/${guid}-osfstorage-2/`,
                },
            },
            named_server_limit: 3,
        });

        await click('[data-test-server-refresh-button]');

        assert.dom('[data-test-server-list-item]').exists();
        assert.dom('[data-test-max-servers-exceeded]').exists();

        sandbox.restore();
    });
});
