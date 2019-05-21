import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import {
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    StandardError
} from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';

import {
    StripeCardElement,
    StripeResponse,
    StripeScriptLoader,
    StripeV3Js
} from './index';

export default class StripeV3PaymentStrategy implements PaymentStrategy {
    private stripeJs?: StripeV3Js;
    private cardElement?: StripeCardElement;

    constructor(
        private _store: CheckoutStore,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _stripeScriptLoader: StripeScriptLoader
    ) {}

    initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        const DOMElement = options.stripev3;

        if (!DOMElement) {
            throw new InvalidArgumentError('Unable to initialize payment because "options.stripe" argument is not provided.');
        }

        const paymentMethod = this._store.getState().paymentMethods.getPaymentMethod(options.methodId);

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        return this._stripeScriptLoader.load(paymentMethod.initializationData.stripePublishableKey)
            .then((stripeJs: StripeV3Js) => {
                this.stripeJs = stripeJs;
                const elements = this.stripeJs.elements();
                this.cardElement = elements.create('card', {
                    style: DOMElement.elementProps,
                });

                if (!this.cardElement) {
                    throw new InvalidArgumentError('Unable to initialize payment because "StripeCardElement" argument is not provided.');
                }

                this.cardElement.mount('#' + DOMElement.containerId);

                return Promise.resolve(this._store.getState());
            });
    }

    execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = payload;

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment.paymentData']);
        }

        return this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(payment.methodId))
            .then(state => {
                const paymentMethod = state.paymentMethods.getPaymentMethod(payment.methodId);

                if (!paymentMethod || !paymentMethod.clientToken) {
                    throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
                }

                return this._getStripeJs().handleCardPayment(
                    paymentMethod.clientToken, this._getCardElement(), {}
                ).then((stripeResponse: StripeResponse) => {
                    if (stripeResponse.error) {
                        throw new StandardError(stripeResponse.error.message);
                    } else {
                        if (!stripeResponse.paymentIntent.id) {
                            throw new PaymentArgumentInvalidError(['paymentIntent.id']);
                        }

                        const paymentPayload = {
                            methodId: payment.methodId,
                            paymentData: { nonce: stripeResponse.paymentIntent.id },
                        };

                        return this._store.dispatch(this._orderActionCreator.submitOrder(order, options))
                            .then(() =>
                                this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload))
                            );
                    }
                });
            })
            .catch((error: Error) => { throw new StandardError(error.message); });
    }

    finalize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    deinitialize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    private _getStripeJs() {
        if (!this.stripeJs) {
            throw new InvalidArgumentError('Unable to initialize payment because "stripeJs" argument is not provided.');
        }

        return this.stripeJs;
    }

    private _getCardElement() {
        if (!this.cardElement) {
            throw new InvalidArgumentError('Unable to initialize payment because "StripeCardElement" argument is not provided.');
        }

        return this.cardElement;
    }
}
