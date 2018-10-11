import { Checkout } from '../../../checkout';
import {
    MissingDataError,
    MissingDataErrorType,
    StandardError
} from '../../../common/error/errors';
import PaymentMethod from '../../payment-method';
import { BraintreeSDKCreator } from '../braintree';

import {
    GooglePaymentData,
    GooglePayBraintreeDataRequest,
    GooglePayInitializer,
    GooglePayBraintreePaymentDataRequestV1,
    TokenizePayload, GooglePayPaymentDataRequestV2
} from './googlepay';
import { GooglePayBraintreeSDK } from './googlepay';

export default class GooglePayBraintreeInitializer implements GooglePayInitializer {
    private _googlePaymentInstance!: GooglePayBraintreeSDK;

    constructor(
        private _braintreeSDKCreator: BraintreeSDKCreator
    ) {}

    initialize(
               checkout: Checkout,
               paymentMethod: PaymentMethod,
               hasShippingAddress: boolean
    ): Promise<GooglePayPaymentDataRequestV2> {
        if (!paymentMethod.clientToken) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        this._braintreeSDKCreator.initialize(paymentMethod.clientToken);

        return this._braintreeSDKCreator.getGooglePaymentComponent()
            .then(googleBraintreePaymentInstance => {
                this._googlePaymentInstance = googleBraintreePaymentInstance;

                return this._createGooglePayPayload(
                    checkout,
                    paymentMethod.initializationData.platformToken,
                    hasShippingAddress);
            }).catch((error: Error) => {
                throw new StandardError(error.message);
            });
    }

    teardown(): Promise<void> {
        return this._braintreeSDKCreator.teardown();
    }

    parseResponse(paymentData: GooglePaymentData): Promise<TokenizePayload> {
        try {
            const payload = JSON.parse(paymentData.paymentMethodData.tokenizationData.token).androidPayCards[0];

            return Promise.resolve({
                nonce: payload.nonce,
                type: payload.type,
                description: payload.description,
                details: {
                    cardType: payload.details.cardType,
                    lastFour: payload.details.lastFour,
                    lastTwo: payload.details.lastTwo,
                },
                binData: payload.binData,
            });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    private _createGooglePayPayload(
                                    checkout: Checkout,
                                    platformToken: string,
                                    hasShippingAddress: boolean
    ): GooglePayPaymentDataRequestV2 {
        if (!platformToken) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const googlePayBraintreePaymentDataRequest: GooglePayBraintreeDataRequest = {
            merchantInfo: {
                authJwt: platformToken,
            },
            transactionInfo: {
                currencyCode: checkout.cart.currency.code,
                totalPriceStatus: 'FINAL',
                totalPrice: checkout.grandTotal.toString(),
            },
            cardRequirements: {
                billingAddressRequired: true,
                billingAddressFormat: 'FULL',
            },
            shippingAddressRequired: !hasShippingAddress,
            emailRequired: true,
            phoneNumberRequired: true,
        };

        return this._mapGooglePayBraintreeDataRequestToGooglePayDataRequestV2(
            this._googlePaymentInstance.createPaymentDataRequest(googlePayBraintreePaymentDataRequest)
        );
    }

    private _mapGooglePayBraintreeDataRequestToGooglePayDataRequestV2(googlePayBraintreeDataRequestV1: GooglePayBraintreePaymentDataRequestV1): GooglePayPaymentDataRequestV2 {
        return {
            apiVersion: 2,
            apiVersionMinor: 0,
            merchantInfo: {
                authJwt: googlePayBraintreeDataRequestV1.merchantInfo.authJwt,
                // merchantId: '0123456789',
                merchantName: 'BIGCOMMERCE',
            },
            allowedPaymentMethods: [{
                type: 'CARD',
                parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: googlePayBraintreeDataRequestV1.cardRequirements.allowedCardNetworks,
                    billingAddressRequired: true,
                    billingAddressParameters: {
                        format: 'FULL',
                        phoneNumberRequired: true,
                    },
                },
                tokenizationSpecification: {
                    type: 'PAYMENT_GATEWAY',
                    parameters: {
                        gateway: 'braintree',
                        'braintree:apiVersion': 'v1',
                        'braintree:authorizationFingerprint': googlePayBraintreeDataRequestV1.paymentMethodTokenizationParameters.parameters['braintree:authorizationFingerprint'],
                        'braintree:merchantId': googlePayBraintreeDataRequestV1.paymentMethodTokenizationParameters.parameters['braintree:merchantId'],
                        'braintree:sdkVersion': googlePayBraintreeDataRequestV1.paymentMethodTokenizationParameters.parameters['braintree:sdkVersion'],
                        // 'braintree:clientKey': 'sandbox_7yh377t8_6bz4zp559rpsb428',
                    },
                },
            }],
            transactionInfo: googlePayBraintreeDataRequestV1.transactionInfo,
            emailRequired: true,
            shippingAddressRequired: googlePayBraintreeDataRequestV1.shippingAddressRequired,
            shippingAddressParameters: {
                phoneNumberRequired: googlePayBraintreeDataRequestV1.phoneNumberRequired,
            },
        };
    }
}
