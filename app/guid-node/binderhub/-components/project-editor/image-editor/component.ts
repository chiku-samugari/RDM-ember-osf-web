import EmberError from '@ember/error';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

import DS from 'ember-data';
import { InvalidError, NotFoundError } from 'ember-data/adapters/errors';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import CustomBaseImageModel from 'ember-osf-web/models/custom-base-image';

type StringFiledName = 'name' | 'descriptionJa' | 'descriptionEn';

interface Args {
    openBit: boolean;
    guid: string;
    target: CustomBaseImageModel;
    closeCallback: () => void;
    requestCustomBaseImageReloading: (peek: boolean) => void;
    onFatalFailure: () => void;
}

export default class ImageEditor extends Component<Args> {
    @service store!: DS.Store;

    @tracked name: string = '';

    @tracked descriptionJa: string = '';

    @tracked descriptionEn: string = '';

    @tracked mandatoryFieldEmptyBit: boolean = false;

    @tracked showSuccessMsgBit: boolean = false;

    timeoutID: ReturnType<typeof setTimeout> | null = null;

    @action
    init() {
        this.name = this.args.target.name;
        this.descriptionJa = this.args.target.descriptionJa;
        this.descriptionEn = this.args.target.descriptionEn;
    }

    @action
    updateStringField(fieldName: StringFiledName, event: { target: HTMLInputElement }) {
        this[fieldName] = event.target.value;
    }

    @action
    updateCustomBaseImage() {
        if (this.name.length === 0) {
            this.mandatoryFieldEmptyBit = true;
            this.showSuccessMsgBit = false;
            return;
        }
        if (this.timeoutID !== null) {
            clearTimeout(this.timeoutID);
        }
        later(async () => {
            try {
                const { target, guid } = this.args;
                target.name = this.name;
                target.descriptionJa = this.descriptionJa;
                target.descriptionEn = this.descriptionEn;
                await target.save({ adapterOptions: { guid } });
            } catch (e) {
                this.showSuccessMsgBit = false;
                if (e instanceof InvalidError) {
                    await this.args.requestCustomBaseImageReloading(false);
                    throw new EmberError(
                        'Failed to update the custom base image since one or more non-empty filed is empty.',

                    );
                }
                if (e instanceof NotFoundError) {
                    this.onClose();
                    this.args.onFatalFailure();
                    throw new EmberError(
                        'Failed to update. The specified custom base image does not exist.',

                    );
                }
            }

            this.showSuccessMsgBit = true;
            await this.args.requestCustomBaseImageReloading(true);
            this.mandatoryFieldEmptyBit = false;
            this.timeoutID = setTimeout(() => {
                this.showSuccessMsgBit = false;
                this.timeoutID = null;
            }, 5000);
        }, 0);
    }

    @action
    onClose() {
        this.args.closeCallback();
        this.showSuccessMsgBit = false;
        if (this.timeoutID !== null) {
            clearTimeout(this.timeoutID);
        }
        this.mandatoryFieldEmptyBit = false;
    }
}
