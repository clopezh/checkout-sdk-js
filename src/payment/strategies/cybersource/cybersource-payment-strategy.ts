import {CheckoutStore, InternalCheckoutSelectors} from '../../../checkout';
import {OrderActionCreator, OrderRequestBody} from '../../../order';
import {OrderFinalizationNotRequiredError} from '../../../order/errors';
import {PaymentInitializeOptions, PaymentRequestOptions} from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';
import PaymentActionCreator from '../../payment-action-creator';

export default class CybersourcePaymentStrategy implements PaymentStrategy {
    constructor(
        private _store: CheckoutStore,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator
    ) {}

    initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    deinitialize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return this._store.dispatch(this._orderActionCreator.submitOrder({ useStoreCredit: payload.useStoreCredit }, options))
            .then(() => this._store.dispatch(this._paymentActionCreator.submitPayment({
                methodId: 'cybersource',
                paymentData: {
                    nonce: '12354',
                },
            })));
    }

    finalize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }
}
