import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';

import DigitalRiverJS, { DigitalRiverDropIn } from './digital-river';
import DigitalRiverPaymentInitializeOptions from './digital-river-payment-initialize-options';
import DigitalRiverScriptLoader from './digital-river-script-loader';

export default class DigitalRiverPaymentStrategy implements PaymentStrategy {
    private _digitalRiverJS?: DigitalRiverJS;
    private _digitalRiverDropComponent?: DigitalRiverDropIn;
    private _initializeOptions?: PaymentInitializeOptions;

    constructor(
        private _store: CheckoutStore,
        private _digitalRiverScriptLoader: DigitalRiverScriptLoader
    ) {}

    async initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        this._initializeOptions = options;

        this._digitalRiverJS = await this._digitalRiverScriptLoader.load();
        this._digitalRiverDropComponent = await this._getDigitalRiverJs().createDropIn(this._getDigitalRiverInitializeOptions().configuration );

        await this._digitalRiverDropComponent.mount(this._getDigitalRiverInitializeOptions().container);

        return this._store.getState();
    }

    deinitialize(): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        if (!payload.payment || options) {
            throw new InvalidArgumentError('Unable to proceed because "payload.payment" argument is not provided.');
        }

        // TODO.....
       // const { payment: { paymentData, ...paymentPayload } } = payload;
        return Promise.resolve(this._store.getState());
    }

    finalize(): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    private _getDigitalRiverJs(): DigitalRiverJS {
        if (!this._digitalRiverJS){
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._digitalRiverJS;
    }

    private _getInitializeOptions(): PaymentInitializeOptions {
        if (!this._initializeOptions) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._initializeOptions;
    }

    private _getDigitalRiverInitializeOptions(): DigitalRiverPaymentInitializeOptions {
        const { digitalriver } = this._getInitializeOptions();

        if (!digitalriver) {
            throw new InvalidArgumentError('Unable to initialize payment because "options.stripev3" argument is not provided.');
        }

        return digitalriver;
    }

}
