import { createClient as createPaymentClient } from '@bigcommerce/bigpay-client';
import { createAction, Action } from '@bigcommerce/data-store';
import { createRequestSender } from '@bigcommerce/request-sender';
import { createScriptLoader } from '@bigcommerce/script-loader';
import { Observable } from 'rxjs';

import {
    createPaymentStrategyRegistry,
    PaymentActionCreator,
    PaymentInitializeOptions,
    PaymentMethod,
    PaymentMethodActionCreator,
    PaymentRequestSender,
    PaymentStrategyActionCreator,
} from '../..';
import {
    createCheckoutClient,
    createCheckoutStore,
    CheckoutActionCreator,
    CheckoutRequestSender,
    CheckoutStore,
    CheckoutValidator,
    InternalCheckoutSelectors
} from '../../../checkout';
import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
import { NotInitializedError, TimeoutError, UnsupportedBrowserError } from '../../../common/error/errors';
import { ConfigActionCreator, ConfigRequestSender } from '../../../config';
import { OrderActionCreator, OrderActionType, OrderRequestBody } from '../../../order';
import { getPaymentMethodsState, getSquare } from '../../../payment/payment-methods.mock';
import { PaymentActionType } from '../../payment-actions';

import {
    CardData,
    DigitalWalletType,
    SquareFormCallbacks,
    SquareFormOptions,
    SquarePaymentForm,
    SquarePaymentStrategy,
    SquareScriptLoader
} from './';

import {
    getCardData,
    getPayloadCreditCard,
    getPayloadNonce,
    getPayloadVaulted,
    getSquarePaymentInitializeOptions,
} from './square-payment-strategy-mock';

describe('SquarePaymentStrategy', () => {
    let callbacks: SquareFormCallbacks;
    let checkoutActionCreator: CheckoutActionCreator;
    let orderActionCreator: OrderActionCreator;
    let paymentActionCreator: PaymentActionCreator;
    let paymentMethod: PaymentMethod;
    let initOptions: PaymentInitializeOptions;
    let paymentMethodActionCreator: PaymentMethodActionCreator;
    let paymentStrategyActionCreator: PaymentStrategyActionCreator;
    let scriptLoader: SquareScriptLoader;
    let store: CheckoutStore;
    let strategy: SquarePaymentStrategy;
    let submitOrderAction: Observable<Action>;
    let submitPaymentAction: Observable<Action>;

    const formFactory = (options: SquareFormOptions) => {
        if (options.callbacks) {
            callbacks = options.callbacks;
        }

        return squareForm;
    };

    const squareForm = {
        build: () => {
            if (callbacks.paymentFormLoaded) {
                callbacks.paymentFormLoaded({} as SquarePaymentForm);
            }
        },
        requestCardNonce: () => {},
    };

    beforeEach(() => {
        store = createCheckoutStore({
            paymentMethods: getPaymentMethodsState(),
        });

        const client = createCheckoutClient();
        const requestSender = createRequestSender();
        const paymentClient = createPaymentClient(store);
        const registry = createPaymentStrategyRegistry(store, client, paymentClient);
        const checkoutRequestSender = new CheckoutRequestSender(requestSender);
        const configRequestSender = new ConfigRequestSender(requestSender);
        const configActionCreator = new ConfigActionCreator(configRequestSender);

        paymentMethod = getSquare();

        orderActionCreator = new OrderActionCreator(
            client,
            new CheckoutValidator(checkoutRequestSender)
        );
        paymentActionCreator = new PaymentActionCreator(
            new PaymentRequestSender(createPaymentClient()),
            orderActionCreator
        );

        scriptLoader = new SquareScriptLoader(createScriptLoader());

        checkoutActionCreator = new CheckoutActionCreator(checkoutRequestSender, configActionCreator);
        initOptions = getSquarePaymentInitializeOptions();
        paymentMethodActionCreator = new PaymentMethodActionCreator(client);
        submitOrderAction = Observable.of(createAction(OrderActionType.SubmitOrderRequested));
        submitPaymentAction = Observable.of(createAction(PaymentActionType.SubmitPaymentRequested));
        paymentStrategyActionCreator = new PaymentStrategyActionCreator(registry, orderActionCreator);
        store = createCheckoutStore(getCheckoutStoreState());

        strategy = new SquarePaymentStrategy(
            store,
            checkoutActionCreator,
            orderActionCreator,
            paymentActionCreator,
            paymentMethodActionCreator,
            paymentStrategyActionCreator,
            requestSender,
            scriptLoader
        );

        jest.spyOn(store, 'dispatch').mockReturnValue(Promise.resolve(store.getState()));
        jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(paymentMethod);

        jest.spyOn(orderActionCreator, 'submitOrder')
            .mockReturnValue(submitOrderAction);

        jest.spyOn(paymentActionCreator, 'submitPayment')
            .mockReturnValue(submitPaymentAction);

        jest.spyOn(requestSender, 'post')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(store, 'dispatch');

        jest.spyOn(scriptLoader, 'load')
            .mockReturnValue(Promise.resolve(formFactory));

        jest.spyOn(squareForm, 'build');
        jest.spyOn(squareForm, 'requestCardNonce')
            .mockReturnValue(Promise.resolve());

        (scriptLoader.load as jest.Mock).mockClear();
        (squareForm.build as jest.Mock).mockClear();
        (squareForm.requestCardNonce as jest.Mock).mockClear();
    });

    describe('#initialize()', () => {
        describe('when form loads successfully', () => {
            it('loads script when initializing strategy with required params', async () => {
                await strategy.initialize(initOptions);

                expect(scriptLoader.load).toHaveBeenCalledTimes(1);
            });

            it('fails to initialize when widget config is missing', async () => {
                try {
                    await strategy.initialize({ methodId: paymentMethod.id });
                } catch (error) {
                    expect(error.type).toEqual('invalid_argument');
                }
            });
        });

        describe('when form fails to load', () => {
            beforeEach(() => {
                jest.spyOn(squareForm, 'build').mockImplementation(() => {
                    if (callbacks.unsupportedBrowserDetected) {
                        callbacks.unsupportedBrowserDetected();
                    }
                });
            });

            afterEach(() => (squareForm.build as any).mockRestore());

            it('rejects the promise', () => {
                strategy.initialize(initOptions)
                    .catch(e => expect(e).toBeInstanceOf(UnsupportedBrowserError));

                expect(scriptLoader.load).toHaveBeenCalledTimes(1);
                expect(squareForm.build).not.toBeCalled();
            });
        });
    });

    describe('#execute()', () => {
        let cardData: CardData;
        let payloadCreditCard: OrderRequestBody;
        let payloadNonce: OrderRequestBody;
        let payloadVaulted: OrderRequestBody;

        beforeEach(() => {
            cardData = getCardData();
            payloadCreditCard = getPayloadCreditCard();
            payloadNonce = getPayloadNonce();
            payloadVaulted = getPayloadVaulted();
        });

        describe('when form has not been initialized', () => {
            it('rejects the promise', async () => {
                await strategy.execute(payloadCreditCard)
                    .catch(e => expect(e).toBeInstanceOf(NotInitializedError));

                expect(squareForm.requestCardNonce).not.toBeCalled();
            });
        });

        describe('when the form has been initialized', () => {

            it('fails if payment name is not passed', async () => {
                await strategy.execute(payloadVaulted).catch(e => expect(e).toBeInstanceOf(NotInitializedError));
                expect(orderActionCreator.submitOrder).not.toBeCalled();
                expect(paymentActionCreator.submitPayment).not.toBeCalled();
            });

            it('cancels the first request when a newer is made', async () => {
                await strategy.initialize(initOptions);
                strategy.execute(payloadCreditCard).catch(e => expect(e).toBeInstanceOf(TimeoutError));

                setTimeout(() => {
                    if (callbacks.cardNonceResponseReceived) {
                        callbacks.cardNonceResponseReceived(undefined, 'nonce', cardData, undefined, undefined);
                    }
                }, 0);

                strategy.execute(payloadVaulted);
            });

            it('resolves to what is returned by submitPayment', async () => {
                const value: InternalCheckoutSelectors = await strategy.initialize(initOptions);
                expect(value).toEqual(store.getState());
            });

            it('submits the payment  with the right arguments', async () => {
                await strategy.execute(payloadNonce, initOptions);
                expect(paymentActionCreator.submitPayment).toHaveBeenCalledWith({
                    methodId: 'square',
                    paymentData: {
                        nonce: 'nonce',
                    },
                });
            });
        });

        describe('when a failure happens receiving the nonce', () => {
            let promise: Promise<InternalCheckoutSelectors>;

            beforeEach( async () => {
                promise = strategy.execute(payloadVaulted);
            });

            it('does not place the order', () => {
                expect(orderActionCreator.submitOrder).not.toBeCalled();
                expect(store.dispatch).not.toHaveBeenCalledWith(submitOrderAction);
            });

            it('does not submit payment', () => {
                expect(paymentActionCreator.submitPayment).not.toBeCalled();
            });

            it('rejects the promise', async () => {
                try {
                    await promise;
                } catch (e) {
                    expect(e).toBeTruthy();
                }
            });
        });

        describe('#execute()', async () => {

            describe('when the nonce is received', async () => {

                beforeEach(async () => {
                    await strategy.initialize(initOptions);
                    if (callbacks.cardNonceResponseReceived) {
                        callbacks.cardNonceResponseReceived(undefined, 'nonce', cardData, undefined, undefined);
                    }
                });

                it('places the order with the right arguments', async () => {
                    await strategy.execute(payloadNonce, initOptions);
                    expect(orderActionCreator.submitOrder).toHaveBeenCalledWith(payloadNonce, initOptions);
                    expect(store.dispatch).toHaveBeenCalledWith(submitOrderAction);
                });

                it('calls submit order with the order request information', async () => {
                    await strategy.execute(payloadNonce, initOptions);

                    expect(orderActionCreator.submitOrder).toHaveBeenCalledWith(payloadNonce, initOptions);
                    expect(store.dispatch).toHaveBeenCalledWith(submitOrderAction);
                    expect(paymentActionCreator.submitPayment).toHaveBeenCalledWith({paymentData: { nonce: 'nonce' },  methodId: 'square'});
                });

                it('calls submit order with the order request information for credit card', async () => {
                    cardData.digital_wallet_type = DigitalWalletType.none;

                    const promise: Promise<InternalCheckoutSelectors> = strategy.execute(payloadVaulted, initOptions);
                    if (callbacks.cardNonceResponseReceived) {
                        callbacks.cardNonceResponseReceived(undefined, 'nonce', cardData, undefined, undefined);
                    }
                    await promise.then(() => {
                        expect(orderActionCreator.submitOrder).toHaveBeenCalledTimes(1);
                        expect(store.dispatch).toHaveBeenCalledTimes(3);
                        expect(orderActionCreator.submitOrder).toHaveBeenCalledWith(payloadVaulted, initOptions);
                        expect(store.dispatch).toHaveBeenCalledWith(submitOrderAction);
                        expect(squareForm.requestCardNonce).toHaveBeenCalledTimes(1);
                        expect(paymentActionCreator.submitPayment).toHaveBeenCalledWith({ methodId: 'square', paymentData: { nonce: 'nonce' }});
                    });
                });
            });
        });
    });
});
