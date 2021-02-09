import { ScriptLoader, StylesheetLoader } from '@bigcommerce/script-loader';
import { PaymentMethodClientUnavailableError } from '../../errors';
import { DigitalRiverWindow } from './digital-river';

import DigitalRiverJS from './digital-river';

const publicApiKey = 'pk_test_8c539de00bf3492494c36b4673ab4bf5';
const locale = "en-US";

export default class ConvergeScriptLoader {
    constructor(
        private _scriptLoader: ScriptLoader,
        private _stylesheetLoader: StylesheetLoader,
        private _window: DigitalRiverWindow = window
    ) {}

    async load(): Promise<DigitalRiverJS> {
        await Promise.all([
            this._stylesheetLoader.loadStylesheet(`https://js.digitalriverws.com/v1/css/DigitalRiver.css`),
            this._scriptLoader.loadScript(`https://js.digitalriverws.com/v1/DigitalRiver.js`),
        ]);

        if (!this._window.DigitalRiver) {
            throw new PaymentMethodClientUnavailableError();
        }

        return this._window.DigitalRiver(publicApiKey,{ locale });
    }
}
