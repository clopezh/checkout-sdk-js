import { RequestSender, Response } from '@bigcommerce/request-sender';

import { isNonceLike } from '../..';
import {
    NonceInstrument,
    Payment,
    PaymentActionCreator,
    PaymentInitializeOptions,
    PaymentMethodActionCreator,
    PaymentRequestOptions,
    PaymentStrategyActionCreator
} from '../../';
import {
    CheckoutActionCreator,
    CheckoutStore,
    InternalCheckoutSelectors
} from '../../../checkout';
import {
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    NotInitializedError,
    NotInitializedErrorType,
    StandardError,
    TimeoutError,
    UnsupportedBrowserError,
} from '../../../common/error/errors';
import { toFormUrlEncoded } from '../../../common/http-request';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import PaymentStrategy from '../payment-strategy';

import SquarePaymentForm, {
    CardData,
    DigitalWalletType,
    NonceGenerationError,
    SquareFormElement,
    SquareFormOptions,
    SquareValidationErrors
} from './square-form';
import SquareScriptLoader from './square-script-loader';

export default class SquarePaymentStrategy extends PaymentStrategy {
    private _paymentForm?: SquarePaymentForm;
    private _deferredRequestNonce?: DeferredPromise;

    constructor(
        store: CheckoutStore,
        private _checkoutActionCreator: CheckoutActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentStrategyActionCreator: PaymentStrategyActionCreator,
        private _requestSender: RequestSender,
        private _scriptLoader: SquareScriptLoader
    ) {
        super(store);
    }

    initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        return this._scriptLoader.load()
            .then(createSquareForm =>
                new Promise((resolve, reject) => {
                    this._paymentForm = createSquareForm(
                        this._getFormOptions(options, { resolve, reject })
                    );

                    this._paymentForm.build();
                }))
            .then(() => super.initialize(options));
    }

    execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = payload;

        if (!payment || !payment.methodId) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        if (payment.paymentData && isNonceLike(payment.paymentData)) {
            const paymentPayload: Payment = {
                methodId: payment.methodId,
                paymentData: payment.paymentData,
            };

            return this._store.dispatch(this._orderActionCreator.submitOrder(order, options))
                .then(() =>
                    this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload))
                );
        } else {
            return new Promise<NonceInstrument>((resolve, reject) => {
                if (!this._paymentForm) {
                    throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
                }

                if (this._deferredRequestNonce) {
                    this._deferredRequestNonce.reject(new TimeoutError());
                }

                this._deferredRequestNonce = { resolve, reject };
                this._paymentForm.requestCardNonce();
            })
            .then(paymentData => {
                const paymentPayload: Payment = {
                    methodId: payment.methodId,
                    paymentData,
                };
                return this._store.dispatch(this._orderActionCreator.submitOrder(order, options))
                    .then(() =>
                        this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload))
                    );
            });
        }
    }

    private _getFormOptions(options: PaymentInitializeOptions, deferred: DeferredPromise): SquareFormOptions {
        const { square: squareOptions, methodId } = options;
        const state = this._store.getState();
        const paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!squareOptions || !paymentMethod) {
            throw new InvalidArgumentError('Unable to proceed because "options.square" argument is not provided.');
        }

        return {
            ...squareOptions,
            ...paymentMethod.initializationData,
            callbacks: {
                paymentFormLoaded: () => {
                    deferred.resolve();
                    const state = this._store.getState();
                    const billingAddress = state.billingAddress.getBillingAddress();

                    if (!this._paymentForm) {
                        throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
                    }

                    if (billingAddress && billingAddress.postalCode) {
                        this._paymentForm.setPostalCode(billingAddress.postalCode);
                    }
                },
                unsupportedBrowserDetected: () => {
                    deferred.reject(new UnsupportedBrowserError());
                },
                cardNonceResponseReceived: (errors?, nonce?, cardData?, billingContact?, shippingContact?) => {

                    if (cardData && cardData.digital_wallet_type !== DigitalWalletType.none) {
                        this._setExternalCheckoutData(cardData, nonce)
                            .then(() => this._paymentInstrumentSelected(methodId))
                            .then(() => squareOptions.onPaymentSelect && squareOptions.onPaymentSelect());
                    } else {
                        this._cardNonceResponseReceived(nonce, errors);
                    }
                },
                methodsSupported: () => {},

                /*
                 * callback function: createPaymentRequest
                 * Triggered when: a digital wallet payment button is clicked.
                */
                createPaymentRequest: () => {
                    const state = this._store.getState();
                    const checkout = state.checkout.getCheckout();
                    const storeConfig = state.config.getStoreConfig();

                    if (!checkout) {
                        throw new MissingDataError(MissingDataErrorType.MissingCheckout);
                    }

                    if (!storeConfig) {
                        throw new MissingDataError(MissingDataErrorType.MissingCheckoutConfig);
                    }

                    return {
                        requestShippingAddress: true,
                        requestBillingInfo: true,
                        currencyCode: storeConfig.currency.code,
                        countryCode: 'US',
                        total: {
                            label: storeConfig.storeProfile.storeName,
                            amount: checkout.subtotal.toString(),
                            pending: false,
                        },
                    };
                },

                validateShippingContact: (errors: SquareValidationErrors) => {
                    if (errors) {
                        this._handleSquareValidationErrors(errors);
                    }
                },
            },
        };
    }

    private _paymentInstrumentSelected(methodId: string) {
        return this._store.dispatch(this._paymentStrategyActionCreator.widgetInteraction(() => {
                return Promise.all([
                    this._store.dispatch(this._checkoutActionCreator.loadCurrentCheckout()),
                    this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId)),
                ]);
        }, { methodId }), { queueId: 'widgetInteraction' });
    }

    private _handleSquareValidationErrors(error: SquareValidationErrors) {
        if (error.country) {
            throw new StandardError(error.country.join(','));
        }

        if (error.region) {
            throw new StandardError(error.region.join(','));
        }

        if (error.city) {
            throw new StandardError(error.city.join(','));
        }

        if (error.addressLines) {
            throw new StandardError(error.addressLines.join(','));
        }

        if (error.postalCode) {
            throw new StandardError(error.postalCode.join(','));
        }

        throw new StandardError('Unknown error');
    }

    private _cardNonceResponseReceived(nonce?: string, errors?: NonceGenerationError[]): void {
        if (!this._deferredRequestNonce) {
            throw new StandardError('Unknown Error');
        }

        if (errors) {
            this._deferredRequestNonce.reject(this._handleErrors(errors));
        }
        if (nonce) {
            this._deferredRequestNonce.resolve({ nonce });
        }
    }

    private _setExternalCheckoutData(cardData: CardData, nonce?: string): Promise<Response> {
        return this._requestSender.post('/checkout.php', {
            headers: {
                Accept: 'text/html',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: toFormUrlEncoded({
                nonce,
                provider: 'squarev2',
                action: 'set_external_checkout',
                cardData: JSON.stringify(cardData),
            }),
        });
    }

    private _handleErrors(errors: NonceGenerationError[]) {
        let messages: string[];
        messages = [];
        errors.map(e => messages.push(e.message));

        return messages.join(', ');
    }
}

export interface DeferredPromise {
    resolve(resolution?: NonceInstrument): void;
    reject(reason?: any): void;
}

/**
 * A set of options that are required to initialize the Square payment method.
 *
 * Once Square payment is initialized, credit card form fields, provided by the
 * payment provider as iframes, will be inserted into the current page. These
 * options provide a location and styling for each of the form fields.
 */
export interface SquarePaymentInitializeOptions {
    /**
     * The location to insert the credit card number form field.
     */
    cardNumber: SquareFormElement;

    /**
     * The location to insert the CVV form field.
     */
    cvv: SquareFormElement;

    /**
     * The location to insert the expiration date form field.
     */
    expirationDate: SquareFormElement;

    /**
     * The location to insert the postal code form field.
     */
    postalCode: SquareFormElement;

    /**
     * The CSS class to apply to all form fields.
     */
    inputClass?: string;

    /**
     * The set of CSS styles to apply to all form fields.
     */
    inputStyles?: Array<{ [key: string]: string }>;

    /**
     * Initialize Masterpass placeholder ID
     */
    masterpass?: SquareFormElement;

    /**
     * A callback that gets called when the customer selects a payment option.
     */
    onPaymentSelect?(): void;
}
