import { createClient as createPaymentClient } from '@bigcommerce/bigpay-client';
import { createAction, Action } from '@bigcommerce/data-store';
import { createRequestSender } from '@bigcommerce/request-sender';
import { createScriptLoader, createStylesheetLoader } from '@bigcommerce/script-loader';
import { merge } from 'lodash';
import { of, Observable } from 'rxjs';

import { getBillingAddress } from '../../../billing/billing-addresses.mock';
import { createCheckoutStore, Checkout, CheckoutRequestSender, CheckoutStore, CheckoutValidator } from '../../../checkout';
import { getCheckout, getCheckoutStoreState } from '../../../checkout/checkouts.mock';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType, NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { getCustomer } from '../../../customer/customers.mock';
import { OrderActionCreator, OrderActionType, OrderRequestBody, OrderRequestSender, SubmitOrderAction } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { getOrderRequestBody } from '../../../order/internal-orders.mock';
import { createSpamProtection, PaymentHumanVerificationHandler } from '../../../spam-protection';
import { StoreCreditActionCreator, StoreCreditActionType, StoreCreditRequestSender } from '../../../store-credit';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import { PaymentActionType, SubmitPaymentAction } from '../../payment-actions';
import PaymentMethod from '../../payment-method';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentMethodActionType } from '../../payment-method-actions';
import { PaymentInitializeOptions } from '../../payment-request-options';
import PaymentRequestSender from '../../payment-request-sender';
import PaymentRequestTransformer from '../../payment-request-transformer';
import { getClientMock, getDigitalRiverJSMock, getDigitalRiverPaymentMethodMock, getInitializeOptionsMock } from '../digitalriver/digitalriver.mock';

import { OnCancelOrErrorResponse, OnSuccessResponse } from './digitalriver';
import DigitalRiverPaymentStrategy from './digitalriver-payment-strategy';
import DigitalRiverScriptLoader from './digitalriver-script-loader';

describe('DigitalRiverPaymentStrategy', () => {
    let paymentMethodActionCreator: PaymentMethodActionCreator;
    let payload: OrderRequestBody;
    let store: CheckoutStore;
    let checkoutMock: Checkout;
    let loadPaymentMethodAction: Observable<Action>;
    let strategy: DigitalRiverPaymentStrategy;
    let digitalRiverScriptLoader: DigitalRiverScriptLoader;
    let paymentMethodMock: PaymentMethod;
    let orderActionCreator: OrderActionCreator;
    let orderRequestSender: OrderRequestSender;
    let paymentActionCreator: PaymentActionCreator;
    let submitOrderAction: Observable<SubmitOrderAction>;
    let submitPaymentAction: Observable<SubmitPaymentAction>;
    let storeCreditActionCreator: StoreCreditActionCreator;
    let applyStoreCreditAction: Observable<Action>;

    beforeEach(() => {
        const scriptLoader = createScriptLoader();
        const stylesheetLoader = createStylesheetLoader();
        submitOrderAction = of(createAction(OrderActionType.SubmitOrderRequested));
        submitPaymentAction = of(createAction(PaymentActionType.SubmitPaymentRequested));
        paymentActionCreator = new PaymentActionCreator(
            new PaymentRequestSender(createPaymentClient()),
            orderActionCreator,
            new PaymentRequestTransformer(),
            new PaymentHumanVerificationHandler(createSpamProtection(createScriptLoader()))
        );
        orderActionCreator = new OrderActionCreator(
            orderRequestSender,
            new CheckoutValidator(new CheckoutRequestSender(createRequestSender()))
        );
        orderRequestSender = new OrderRequestSender(createRequestSender());
        orderActionCreator = new OrderActionCreator(
            orderRequestSender,
            new CheckoutValidator(new CheckoutRequestSender(createRequestSender()))
        );
        storeCreditActionCreator = new StoreCreditActionCreator(
            new StoreCreditRequestSender(createRequestSender())
        );

        paymentMethodMock = {...getDigitalRiverPaymentMethodMock(), clientToken: JSON.stringify(getClientMock())};
        digitalRiverScriptLoader = new DigitalRiverScriptLoader(scriptLoader, stylesheetLoader);
        store = createCheckoutStore(getCheckoutStoreState());
        checkoutMock = getCheckout();
        applyStoreCreditAction = of(createAction(StoreCreditActionType.ApplyStoreCreditRequested));
        loadPaymentMethodAction = of(createAction(PaymentMethodActionType.LoadPaymentMethodSucceeded, paymentMethodMock, {methodId: paymentMethodMock.id}));
        paymentMethodActionCreator = {} as PaymentMethodActionCreator;
        paymentMethodActionCreator.loadPaymentMethod = jest.fn(() => loadPaymentMethodAction);
        jest.spyOn(store, 'dispatch');

        jest.spyOn(store.getState().checkout, 'getCheckoutOrThrow')
            .mockReturnValue(checkoutMock);

        jest.spyOn(orderActionCreator, 'submitOrder')
            .mockReturnValue(submitOrderAction);

        jest.spyOn(paymentActionCreator, 'submitPayment')
            .mockReturnValue(submitPaymentAction);

        jest.spyOn(storeCreditActionCreator, 'applyStoreCredit')
            .mockReturnValue(applyStoreCreditAction);
        jest.spyOn(store.getState().paymentMethods, 'getPaymentMethodOrThrow')
            .mockReturnValue(paymentMethodMock);

        orderActionCreator = new OrderActionCreator(
            new OrderRequestSender(createRequestSender()),
            new CheckoutValidator(new CheckoutRequestSender(createRequestSender()))
        );

        strategy = new DigitalRiverPaymentStrategy(
            store,
            paymentMethodActionCreator,
            orderActionCreator,
            paymentActionCreator,
            storeCreditActionCreator,
            digitalRiverScriptLoader
        );

    });

    describe('#initialize()', () => {
        const digitalRiverLoadResponse = getDigitalRiverJSMock();
        const digitalRiverComponent = digitalRiverLoadResponse.createDropin(expect.any(Object));
        const customer = getCustomer();
        let options: PaymentInitializeOptions;
        let onErrorCallback: (error: OnCancelOrErrorResponse) => {};
        let onSuccessCallback: (data?: OnSuccessResponse) => {};

        beforeEach(() => {
            jest.spyOn(store.getState().billingAddress, 'getBillingAddressOrThrow').mockReturnValue(getBillingAddress());
            jest.spyOn(store.getState().customer, 'getCustomer').mockReturnValue(customer);
            jest.spyOn(digitalRiverScriptLoader, 'load').mockReturnValue(Promise.resolve(digitalRiverLoadResponse));
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockReturnValue(digitalRiverComponent);
            options = getInitializeOptionsMock();
        });

        it('loads DigitalRiver script', async () => {
            await strategy.initialize(options);

            expect(digitalRiverScriptLoader.load).toHaveBeenCalled();
            expect(digitalRiverLoadResponse.createDropin).toHaveBeenCalled();
        });

        it('loads DigitalRiver when widget was updated ', async () => {
            jest.spyOn(store.getState().paymentStrategies, 'isInitialized').mockReturnValue(true);
            jest.spyOn(document, 'getElementById').mockReturnValue('mock');

            await strategy.initialize(options);

            expect(digitalRiverScriptLoader.load).toHaveBeenCalled();
            expect(digitalRiverLoadResponse.createDropin).toHaveBeenCalled();
        });

        it('calls onSuccess callback from DigitalRiver', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(configuration => {
                onSuccessCallback = configuration.onSuccess;

                return digitalRiverComponent;
            });

            await strategy.initialize(options);
            onSuccessCallback({
                source: {
                    id: '1',
                    reusable: false,
                },
                readyForStorage: true,
            });

            expect(digitalRiverLoadResponse.createDropin).toBeCalled();
        });

        it('calls onReady callback from DigitalRiver', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(({onReady}) => {
                onReady({
                    paymentMethodTypes: ['creditCard', 'paypal'],
                });

                return digitalRiverComponent;
            });

            await strategy.initialize(options);

            expect(digitalRiverLoadResponse.createDropin).toBeCalled();
        });

        it('calls onError callback from DigitalRiver', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(({onError}) => {
                onErrorCallback = onError;

                return digitalRiverComponent;
            });

            await strategy.initialize(options);
            onErrorCallback({
                errors: [{
                    code: 'code',
                    message: 'message',
                }],
            });

            expect(options.digitalriver?.onError).toBeCalled();
            expect(digitalRiverLoadResponse.createDropin).toBeCalled();
        });

        it('throws an error when load response is empty or not provided', () => {
            const error = 'Unable to proceed because the payment step of checkout has not been initialized.';

            jest.spyOn(digitalRiverScriptLoader, 'load').mockReturnValue(Promise.resolve(undefined));

            const promise = strategy.initialize(options);

            return expect(promise).rejects.toThrow(error);
        });

        it('throws an error when DigitalRiver options is not provided', () => {
            const error = new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
            options.digitalriver = undefined;

            const promise = strategy.initialize(options);

            return expect(promise).rejects.toThrow(error);
        });

        it('throws an error when DigitalRiver clientToken is not provided', () => {
            const error = new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
            paymentMethodMock = {...getDigitalRiverPaymentMethodMock(), clientToken: ''};
            loadPaymentMethodAction = of(createAction(PaymentMethodActionType.LoadPaymentMethodSucceeded, paymentMethodMock, {methodId: paymentMethodMock.id}));

            const promise = strategy.initialize(options);

            return expect(promise).rejects.toThrow(error);
        });

        it('throws an error when DigitalRiver clientToken is not receiving correct data ', () => {
            const error = new Error('Unexpected token o in JSON at position 0');
            paymentMethodMock = {...getDigitalRiverPaymentMethodMock(), clientToken: 'ok'};
            loadPaymentMethodAction = of(createAction(PaymentMethodActionType.LoadPaymentMethodSucceeded, paymentMethodMock, {methodId: paymentMethodMock.id}));

            const promise = strategy.initialize(options);

            return expect(promise).rejects.toThrow(error);
        });

        it('throws an error when data on onSuccess event is not provided', async () => {
            const expectedError = new InvalidArgumentError('Unable to initialize payment because success argument is not provided.');
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(({onSuccess}) => {
                try {
                    onSuccessCallback = onSuccess;
                } catch (error) {
                    expect(error).toEqual(expectedError);
                }

                return digitalRiverComponent;
            });

            await strategy.initialize(options);
            onSuccessCallback(undefined);

            expect(options.digitalriver?.onError).toBeCalled();
            expect(digitalRiverLoadResponse.createDropin).toBeCalled();
        });
    });

    describe('#execute()', () => {
        let submitOrderAction: Observable<SubmitOrderAction>;
        let options: PaymentInitializeOptions;
        let onSuccessCallback: (data: OnSuccessResponse) => {};
        const digitalRiverLoadResponse = getDigitalRiverJSMock();
        const digitalRiverComponent = digitalRiverLoadResponse.createDropin(expect.any(Object));
        const readyForStorage = true;

        beforeEach(() => {
            jest.spyOn(digitalRiverScriptLoader, 'load').mockReturnValue(Promise.resolve(digitalRiverLoadResponse));
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockReturnValue(digitalRiverComponent);
            submitOrderAction = of(createAction(OrderActionType.SubmitOrderRequested));
            jest.spyOn(orderActionCreator, 'submitOrder')
                .mockReturnValue(submitOrderAction);
            options = getInitializeOptionsMock();
            payload = merge({}, getOrderRequestBody(), {
                useStoreCredit: false,
                payment: {
                    methodId: 'digitalriver',
                },
            });
        });

        it('creates the order and submit payment with credit card', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(configuration => {
                onSuccessCallback = configuration.onSuccess;

                return digitalRiverComponent;
            });

            await strategy.initialize(options);
            onSuccessCallback({
                source: {
                    id: '1',
                    reusable: false,
                },
                readyForStorage,
            });

            expect(await strategy.execute(payload)).toEqual(store.getState());
            expect(orderActionCreator.submitOrder).toHaveBeenCalled();
            expect(paymentMethodActionCreator.loadPaymentMethod).toHaveBeenCalled();
            expect(await paymentActionCreator.submitPayment).toHaveBeenCalledWith(
                {
                    methodId: 'digitalriver',
                    paymentData: {
                        formattedPayload: {
                            credit_card_token: {
                                token: JSON.stringify({
                                    checkoutId: '12345676543',
                                    source: {
                                        source: {
                                            id: '1',
                                            reusable: false,
                                        },
                                        readyForStorage: true,
                                    },
                                    sessionId: '1234',
                                }),
                            },
                            vault_payment_instrument: readyForStorage,
                            set_as_default_stored_instrument: false,
                        },
                    },
                }
            );
        });

        it('executes the strategy successfully and applies the store credit', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(({onSuccess}) => {
                onSuccessCallback = onSuccess;

                return digitalRiverComponent;
            });

            await strategy.initialize(options);
            onSuccessCallback({
                source: {
                    id: '1',
                    reusable: false,
                },
                readyForStorage,
            });

            checkoutMock.isStoreCreditApplied = true;

            expect(await strategy.execute(payload)).toEqual(store.getState());
            expect(orderActionCreator.submitOrder).toHaveBeenCalled();
            expect(paymentMethodActionCreator.loadPaymentMethod).toHaveBeenCalled();
            expect(storeCreditActionCreator.applyStoreCredit).toHaveBeenCalledWith(true);
            expect(await paymentActionCreator.submitPayment).toHaveBeenCalledWith(
                {
                    methodId: 'digitalriver',
                    paymentData: {
                        formattedPayload: {
                            credit_card_token: {
                                token: JSON.stringify({
                                    checkoutId: '12345676543',
                                    source: {
                                        source: {
                                            id: '1',
                                            reusable: false,
                                        },
                                        readyForStorage: true,
                                    },
                                    sessionId: '1234',
                                }),
                            },
                            vault_payment_instrument: readyForStorage,
                            set_as_default_stored_instrument: false,
                        },
                    },
                }
            );
        });

        it('throws an error when payment is not provided', async () => {
            const error = new PaymentArgumentInvalidError(['payment.paymentData']);
            payload.payment = undefined;

            const promise = strategy.execute(payload, undefined);

            return expect(promise).rejects.toThrow(error);
        });

        it('throws an error when digitalRiverCheckoutData is not available', () => {
            const error = new InvalidArgumentError('Unable to proceed because payload payment argument is not provided.');

            const promise = strategy.execute(payload);

            return expect(promise).rejects.toThrow(error);
        });

        it('creates the order and submit payment with vaulted instrument', async () => {
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockImplementation(configuration => {
                onSuccessCallback = configuration.onSuccess;

                return digitalRiverComponent;
            });

            payload.payment = {
                methodId: 'digitalriver',
                paymentData: {
                    instrumentId: 'token',
                    shouldSetAsDefaultInstrument: true,
                },
            };

            await strategy.initialize(options);
            onSuccessCallback({
                source: {
                    id: '1',
                    reusable: false,
                },
                readyForStorage,
            });
            await strategy.execute(payload);

            expect(await strategy.execute(payload)).toEqual(store.getState());
            expect(orderActionCreator.submitOrder).toHaveBeenCalled();
            expect(paymentMethodActionCreator.loadPaymentMethod).toHaveBeenCalled();
            expect(await paymentActionCreator.submitPayment).toHaveBeenCalledWith(
                {
                    methodId: 'digitalriver',
                    paymentData: {
                        formattedPayload: {
                            bigpay_token: {
                                token: 'token',
                            },
                            credit_card_token: {
                                token: JSON.stringify({
                                    checkoutId: '12345676543',
                                }),
                            },
                        },
                        set_as_default_stored_instrument: true,
                    },
                }
            );
        });
    });

    describe('#finalize()', () => {
        it('throws an error to inform that order finalization is not required', async () => {
            const promise = strategy.finalize();

            return expect(promise).rejects.toBeInstanceOf(OrderFinalizationNotRequiredError);
        });
    });

    describe('#deinitialize()', () => {
        const digitalRiverLoadResponse = getDigitalRiverJSMock();
        const digitalRiverComponent = digitalRiverLoadResponse.createDropin(expect.any(Object));
        const customer = getCustomer();
        let options: PaymentInitializeOptions;

        beforeEach(() => {
            jest.spyOn(store.getState().billingAddress, 'getBillingAddressOrThrow').mockReturnValue(getBillingAddress());
            jest.spyOn(store.getState().customer, 'getCustomer').mockReturnValue(customer);
            jest.spyOn(digitalRiverScriptLoader, 'load').mockReturnValue(Promise.resolve(digitalRiverLoadResponse));
            jest.spyOn(digitalRiverLoadResponse, 'createDropin').mockReturnValue(digitalRiverComponent);
            jest.spyOn(store.getState().paymentStrategies, 'isInitialized').mockReturnValue(true);
            options = getInitializeOptionsMock();
        });

        it('returns Not Initialized Error when intialize options are not available', () => {
            try {
                strategy.deinitialize();
            } catch (error) {
                expect(error).toStrictEqual(new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized));
            }
        });

        it('returns the state', async () => {
            jest.spyOn(document, 'getElementById').mockReturnValue({
                innerHtml: '',
            });

            await strategy.initialize(options);

            expect(await strategy.deinitialize()).toEqual(store.getState());
        });

        it('does not find the container', async () => {
            jest.spyOn(document, 'getElementById').mockReturnValue(undefined);

            await strategy.initialize(options);

            expect(await strategy.deinitialize()).toEqual(store.getState());
        });
    });
});
