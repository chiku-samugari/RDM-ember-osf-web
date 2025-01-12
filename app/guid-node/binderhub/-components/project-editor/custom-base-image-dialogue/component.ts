import EmberError from '@ember/error';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import DS from 'ember-data';
import { ConflictError, InvalidError } from 'ember-data/adapters/errors';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { Image } from 'ember-osf-web/models/binderhub-config';
import CustomBaseImageModel from 'ember-osf-web/models/custom-base-image';

import { REPO2DOCKER_IMAGE_ID } from 'ember-osf-web/guid-node/binderhub/-components/project-editor/component';

type StringFiledName = 'name' | 'imageReference' | 'descriptionJa' | 'descriptionEn';

interface Args {
    guid: string;
    ownedImageRefs: string[];
    requestCustomBaseImageReloading: (peek: boolean) => void;
    customBaseImageModels: CustomBaseImageModel[];
    modelConverter: (model: CustomBaseImageModel) => Image;
}

// Although Crypto does offers `randomUUID` function, the TypeScript
// compiler does not allow us to use it. The type definition might lack
// the entry for that function. This is a workaround to utilize the
// function. Moreover, the linter raises a parsing error for the
// optional chaining operator (?.)  even though the TypeScript compiler
// never complains about it.
function generateUUID(fallback: string) {
    if (typeof self.crypto !== 'undefined') {
        const c = self.crypto as { randomUUID?(): string; };
        if (c.randomUUID) {
            return c.randomUUID() || fallback;
        }
    }
    return fallback;
}

// Base Images and Custom Base Images are simply called `Image` and the
// former ones are handled via Image class, while the latter ones are
// handled via CustomBaseImageModel.
export default class CustomBaseImageDialogue extends Component<Args> {
    @service store!: DS.Store;

    @tracked name: string = '';

    @tracked imageReference: string = '';

    @tracked descriptionJa: string = '';

    @tracked descriptionEn: string = '';

    @tracked deprecated: boolean = false;

    @tracked dialogueOpenBit: boolean = false;

    @tracked referenceInUseBit: boolean = false;

    @tracked mandatoryFieldEmptyBit: boolean = false;

    @tracked repo2dockerSubmittedBit: boolean = false;

    @tracked showSuccessMsgBit: boolean = false;

    @tracked lastImageName: string = '';

    @tracked lastImageReference: string = '';

    timeoutID: ReturnType<typeof setTimeout> | null = null;

    createNewCustomBaseImageTabEelementID: string = generateUUID('create_new_custom_base_image_tab');

    @action
    updateOpenBit(openBit: boolean) {
        this.dialogueOpenBit = openBit;
    }

    @action
    updateStringField(fieldName: StringFiledName, event: { target: HTMLInputElement }) {
        this[fieldName] = event.target.value;
    }

    @action
    registerCustomBaseImage() {
        const imgRef = this.imageReference.trim();
        if (this.name.length === 0 || imgRef.length === 0) {
            this.mandatoryFieldEmptyBit = true;
            this.referenceInUseBit = false;
            this.repo2dockerSubmittedBit = false;
            this.lastImageName = '';
            this.showSuccessMsgBit = false;
            return;
        }
        if (this.args.ownedImageRefs.includes(imgRef)) {
            this.referenceInUseBit = true;
            this.lastImageReference = imgRef;
            this.mandatoryFieldEmptyBit = false;
            this.repo2dockerSubmittedBit = false;
            this.lastImageName = '';
            this.showSuccessMsgBit = false;
            return;
        }
        if (imgRef.startsWith(REPO2DOCKER_IMAGE_ID)) {
            this.repo2dockerSubmittedBit = true;
            this.referenceInUseBit = false;
            this.lastImageReference = '';
            this.mandatoryFieldEmptyBit = false;
            this.lastImageName = '';
            this.showSuccessMsgBit = false;
        }
        if (this.timeoutID !== null) {
            clearTimeout(this.timeoutID);
        }
        later(async () => {
            try {
                await this.createCustomBaseImage(
                    this.name, imgRef, this.descriptionJa, this.descriptionEn,
                );
                this.showSuccessMsgBit = true;
                this.lastImageName = this.name;
                await this.args.requestCustomBaseImageReloading(true);
                this.clearFields();
                this.timeoutID = setTimeout(() => {
                    this.showSuccessMsgBit = false;
                    this.lastImageName = '';
                    this.timeoutID = null;
                }, 5000);
            } catch (e) {
                this.showSuccessMsgBit = false;
                await this.args.requestCustomBaseImageReloading(false);
                // Just rethrow `e` here since it already has the
                // detailed message. `createCustomBaseImage` method did
                // the job.
                throw e;
            }
        }, 0);
    }

    @action
    inheritCustomBaseImage(model: CustomBaseImageModel, changeTab: () => void) {
        this.name = model.name;
        this.imageReference = model.imageReference;
        this.descriptionJa = model.descriptionJa;
        this.descriptionEn = model.descriptionEn;
        changeTab();
    }

    isInheritable(model: CustomBaseImageModel) {
        return !this.args.ownedImageRefs.includes(model.imageReference);
    }

    async createCustomBaseImage(name: string, imageReference: string, descriptionJa: string, descriptionEn: string) {
        try {
            await this.store.createRecord(
                'custom-base-image',
                {
                    name,
                    imageReference,
                    descriptionJa,
                    descriptionEn,
                    deprecated: false,
                },
            ).save({ adapterOptions: { guid: this.args.guid } });
        } catch (e) {
            if (e instanceof ConflictError) {
                throw new EmberError(
                    'Failed to create a new Custom Base Image since the requested entry already exists.',
                );
            }
            if (e instanceof InvalidError) {
                throw new EmberError(
                    'Failed to create a new Custom Base Image since one or more non-empty fields was empty.',
                );
            }
            throw new EmberError('Failed to create a custom base image for an unknown reason.');
        }
    }

    get ancestorImageModelHashSeq() {
        const modelHash = this.args.customBaseImageModels.filter(
            ({ guid }) => guid !== this.args.guid,
        ).reduce((acc, model) => {
            if (typeof acc[model.guid] === 'undefined') {
                acc[model.guid] = {
                    guid: model.guid,
                    level: model.level,
                    title: model.nodeTitle,
                    modelInfos: [],
                };
            }
            acc[model.guid].modelInfos.push({
                model,
                inheritable: this.isInheritable(model),
            });
            return acc;
        }, {} as {
            [key: string]: {
                guid: string,
                level: number,
                title: string,
                modelInfos: Array<{ model: CustomBaseImageModel, inheritable: boolean }>,
            },
        });
        return Object.values(modelHash).sort((x, y) => x.level - y.level);
    }

    clearFields() {
        // TODO: use StringFiledName type effectively.
        this.name = '';
        this.imageReference = '';
        this.descriptionJa = '';
        this.descriptionEn = '';
        this.referenceInUseBit = false;
        this.lastImageReference = '';
        this.mandatoryFieldEmptyBit = false;
    }

    @action
    onClose() {
        this.updateOpenBit(false);
        this.showSuccessMsgBit = false;
        if (this.timeoutID !== null) {
            clearTimeout(this.timeoutID);
        }
        this.lastImageReference = '';
        this.referenceInUseBit = false;
        this.mandatoryFieldEmptyBit = false;
    }
}
