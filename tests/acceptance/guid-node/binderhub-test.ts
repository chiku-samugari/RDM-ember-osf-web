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

module('Acceptance | guid-node/binderhub', hooks => {
    setupOSFApplicationTest(hooks);
    setupMirage(hooks);

    test('logged in', async assert => {
        const node = server.create('node', {
            id: 'i9bri',
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
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 1 });
        assert.dom('[data-test-jupyterhub-user]').hasText('testuser');
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom('[data-test-image-selection="jupyter/test-image"]').exists();
        assert.dom('[data-test-image-selected]').doesNotExist();
        assert.dom('[data-test-package-editor="apt"]').doesNotExist();
        assert.dom('[data-test-package-editor="conda"]').doesNotExist();
        assert.dom('[data-test-package-editor="pip"]').doesNotExist();

        assert.equal(
            wbFileAjaxStub.callCount,
            2,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            'http://localhost:8000/v2/nodes/i9bri/files/osfstorage/upload',
        );
        assert.equal(
            wbFileAjaxStub.secondCall.args[0].url,
            'http://localhost:7777/osfstorage/.binder',
        );
        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        sandbox.restore();
    });

    test('already configured, Dockerfile', async assert => {
        const node = server.create('node', {
            id: 'i9bri',
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
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 2 });
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom('[data-test-image-change="jupyter/scipy-notebook"]').exists();
        assert.dom('[data-test-image-selected="jupyter/scipy-notebook"]').exists();
        assert.dom('[data-test-image-selection]').doesNotExist();
        assert.dom('[data-test-package-editor="apt"]').exists();
        assert.dom('[data-test-package-editor="conda"]').exists();
        assert.dom('[data-test-package-editor="pip"]').doesNotExist();
        assert.dom('[data-test-package-editor="rmran"]').doesNotExist();

        assert.equal(
            wbFileAjaxStub.callCount,
            4,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            'http://localhost:8000/v2/nodes/i9bri/files/osfstorage/upload',
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
            id: 'i9bri',
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
                        packages: ['conda', 'rmran'],
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 1 });
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom('[data-test-image-change="#repo2docker#r-base"]').exists();
        assert.dom('[data-test-image-selected="#repo2docker#r-base"]').exists();
        assert.dom('[data-test-image-selection]').doesNotExist();
        assert.dom('[data-test-package-editor="apt"]').exists();
        assert.dom('[data-test-package-editor="conda"]').exists();
        assert.dom('[data-test-package-editor="pip"]').doesNotExist();
        assert.dom('[data-test-package-editor="rmran"]').exists();

        assert.equal(
            wbFileAjaxStub.callCount,
            2,
            'WaterButler API has been called a specified number of times',
        );
        assert.equal(
            wbFileAjaxStub.firstCall.args[0].url,
            'http://localhost:8000/v2/nodes/i9bri/files/osfstorage/upload',
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
            id: 'i9bri',
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
                    },
                    {
                        url: '#repo2docker#r-base',
                        name: 'Test Repo2Docker',
                        description: 'dummy description',
                        packages: ['conda', 'pip', 'rmran'],
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 1 });
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom('[data-test-image-change="jupyter/scipy-notebook"]').exists();
        assert.dom('[data-test-image-selected="jupyter/scipy-notebook"]').exists();
        assert.dom('[data-test-image-selection]').doesNotExist();
        assert.dom('[data-test-package-editor="apt"]').exists();
        assert.dom('[data-test-package-editor="conda"]').exists();
        assert.dom('[data-test-package-editor="pip"]').exists();
        assert.dom('[data-test-package-editor="rmran"]').doesNotExist();

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
            'http://localhost:8000/v2/nodes/i9bri/files/osfstorage/upload',
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
            id: 'i9bri',
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
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 1 });
        assert.dom('[data-test-binderhub-launch]').exists();
        assert.dom('[data-test-image-change="#repo2docker#r-base"]').exists();
        assert.dom('[data-test-image-selected="#repo2docker#r-base"]').exists();
        assert.dom('[data-test-image-selection]').doesNotExist();
        assert.dom('[data-test-package-editor="apt"]').exists();
        assert.dom('[data-test-package-editor="conda"]').exists();
        assert.dom('[data-test-package-editor="pip"]').exists();
        assert.dom('[data-test-package-editor="rmran"]').exists();

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
            'http://localhost:8000/v2/nodes/i9bri/files/osfstorage/upload',
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

    test('reached server limit', async assert => {
        const node = server.create('node', {
            id: 'i9bri',
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
                    },
                ],
            },
            launcher: {
                endpoints: [
                    {
                        id: 'fake',
                        name: 'Fake',
                        path: 'Fake',
                    },
                ],
            },
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
                'i9bri-osfstorage-1': {
                    name: 'i9bri-osfstorage-1',
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
        assert.dom('[data-test-jupyterhub-selection-option]').exists({ count: 2 });
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
                'i9bri-osfstorage-1': {
                    name: 'i9bri-osfstorage-1',
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
                'i9bri-osfstorage-1': {
                    name: 'i9bri-osfstorage-1',
                },
                'i9bri-osfstorage-2': {
                    name: 'i9bri-osfstorage-2',
                },
            },
            named_server_limit: 3,
        });

        await click('[data-test-server-refresh-button]');

        assert.dom('[data-test-server-list-item]').exists();
        assert.dom('[data-test-max-servers-exceeded]').exists();

        assert.ok(
            ajaxStub.calledOnceWithExactly('http://localhost:30123/', 'users/testuser?include_stopped_servers=1', null),
            'BinderHub calls JupyterHub REST API',
        );

        sandbox.restore();
    });
});
