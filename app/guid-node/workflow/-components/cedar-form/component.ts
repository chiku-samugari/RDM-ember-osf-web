import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import {
    WorkflowTaskForm,
    WorkflowVariable,
} from '../../types';

interface CedarFormArgs {
    form: WorkflowTaskForm;
    onChange: (variables: WorkflowVariable[], isValid: boolean) => void;
}

type CedarEditorElement = HTMLElement & {
    templateObject?: unknown;
    config?: unknown;
    currentMetadata?: Record<string, unknown>;
};

const CEDAR_SCRIPT_URL = '/static/cedar-embeddable-editor.js';
let cedarLoader: Promise<void> | null = null;

function ensureCedarEditorScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }
    if (window.customElements && window.customElements.get('cedar-embeddable-editor')) {
        return Promise.resolve();
    }
    if (cedarLoader) {
        return cedarLoader;
    }
    cedarLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = CEDAR_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load CEDAR editor script.'));
        document.head.appendChild(script);
    });
    return cedarLoader;
}

export default class CedarForm extends Component<CedarFormArgs> {
    @tracked cedarError: string | null = null;

    private cedarEditor: CedarEditorElement | null = null;

    get cedarTemplate(): unknown {
        const { data } = this.args.form;
        return data !== undefined ? data : null;
    }

    get cedarTemplateObject(): Record<string, unknown> | null {
        const template = this.cedarTemplate;
        if (!template) {
            return null;
        }
        if (typeof template === 'string') {
            try {
                return JSON.parse(template) as Record<string, unknown>;
            } catch (error) {
                const err = error as Error;
                this.cedarError = (err && err.message) || String(error);
                return null;
            }
        }
        if (typeof template === 'object') {
            return template as Record<string, unknown>;
        }
        return null;
    }

    @action
    async setupCedarHost(element: HTMLElement): Promise<void> {
        if (!element) {
            return;
        }
        element.innerHTML = ''; // eslint-disable-line no-param-reassign
        this.cedarEditor = null;
        this.cedarError = null;
        if (!this.cedarTemplateObject) {
            this.notifyChange();
            return;
        }
        try {
            await ensureCedarEditorScript();
            const editor = document.createElement('cedar-embeddable-editor') as CedarEditorElement;
            editor.templateObject = this.cedarTemplateObject;
            editor.config = JSON.stringify({
                showSampleTemplateLinks: false,
                terminologyIntegratedSearchUrl: 'https://terminology.metadatacenter.org/bioportal/integrated-search',
                showTemplateSourceData: false,
                showInstanceDataCore: false,
            });
            element.appendChild(editor);
            this.cedarEditor = editor;
            this.notifyChange();
        } catch (error) {
            const err = error as Error;
            this.cedarError = (err && err.message) || String(error);
        }
    }

    @action
    refreshCedarTemplate(element: HTMLElement, template: Record<string, unknown> | null): void {
        if (template && this.cedarEditor) {
            this.cedarEditor.templateObject = template;
            this.notifyChange();
        } else if (template && !this.cedarEditor) {
            this.setupCedarHost(element);
        }
    }

    getCurrentVariables(): WorkflowVariable[] {
        if (!this.cedarEditor || !this.cedarEditor.currentMetadata) {
            return [];
        }
        const metadata = this.cedarEditor.currentMetadata;
        const variables: WorkflowVariable[] = [];
        for (const key of Object.keys(metadata)) {
            if (key === '@context') {
                continue;
            }
            const entry = metadata[key];
            if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry as object, '@value')) {
                variables.push({
                    name: key,
                    value: (entry as Record<string, unknown>)['@value'],
                    type: 'string',
                });
                continue;
            }
            variables.push({ name: key, value: entry, type: 'json' });
        }
        return variables;
    }

    private notifyChange(): void {
        const variables = this.getCurrentVariables();
        this.args.onChange(variables, true);
    }
}
