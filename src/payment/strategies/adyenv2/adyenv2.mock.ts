import { RequestError } from '../../../common/error/errors';
import { getResponse } from '../../../common/http-request/responses.mock';
import { OrderPaymentRequestBody, OrderRequestBody } from '../../../order';
import Payment from '../../payment';
import { PaymentInitializeOptions } from '../../payment-request-options';
import { getCreditCardInstrument, getErrorPaymentResponseBody } from '../../payments.mock';

import { AdyenCardState,  AdyenCheckout, AdyenConfiguration, AdyenV2PaymentMethodType, ResultCode, ThreeDSRequiredErrorResponse } from './adyenv2';

export function getOrderRequestBody(paymentMethodType: AdyenV2PaymentMethodType = AdyenV2PaymentMethodType.Scheme): OrderRequestBody {
    return {
        useStoreCredit: false,
        payment: getPayment(paymentMethodType) as OrderPaymentRequestBody,
    };
}

function getPayment(paymentMethodType: AdyenV2PaymentMethodType): Payment {
    return {
        methodId: paymentMethodType,
        paymentData: getCreditCardInstrument(),
    };
}

export function getAdyenCheckout(): AdyenCheckout {
    return {
        create: jest.fn(() => {
            return {
                mount: jest.fn(),
                unmount: jest.fn(),
            };
        }),

        createFromAction: jest.fn(() => {
            return {
                mount: jest.fn(),
                unmount: jest.fn(),
            };
        }),
    };
}

export function getAdyenConfiguration(): AdyenConfiguration {
    return {
        environment: 'test',
        originKey: 'YOUR_ORIGIN_KEY',
    };
}

export function getAdyenInitializeOptions(): PaymentInitializeOptions {
    return {
        methodId: 'adyenv2',
        adyenv2: {
            containerId: 'adyen-component-field',
            threeDS2ContainerId: 'adyen-component-field-3ds',
            cardVerificationContainerId: 'adyen-custom-card-component-field',
            options: {
                hasHolderName: true,
                styles: {},
                placeholders: {},
            },
            threeDS2Options: {
                widgetSize: '05',
                onComplete: jest.fn(),
                onLoad: jest.fn(),
            },
        },
    };
}

function getCardState() {
    return {
        data: {
            paymentMethod: {
                encryptedCardNumber: 'CARD_NUMBER',
                encryptedExpiryMonth: 'EXPIRY_MONTH',
                encryptedExpiryYear: 'EXPIRY_YEAR',
                encryptedSecurityCode: 'CVV',
                type: AdyenV2PaymentMethodType.Scheme,
            },
        },
    };
}

export function getValidCardState(): AdyenCardState {
    return {
        ...getCardState(),
        isValid: true,
    };
}

export function getInvalidCardState(): AdyenCardState {
    return {
        ...getCardState(),
        isValid: false,
    };
}

export function getValidChallengeResponse(): any {
    return {
        threeDS2Token: 'token',
        paymentData: 'paymentData',
    };
}

function getChallengeShopperErrorResponse(): ThreeDSRequiredErrorResponse {
    return {
        errors: [
            { code: 'three_d_secure_required' },
        ],
        three_ds_result: {
            code: ResultCode.ChallengeShopper,
            token: 'token',
            payment_data: 'paymentData',
        },
        status: 'error',
    };
}

export function getChallengeShopperError(): RequestError {
    return new RequestError(getResponse({
        ...getErrorPaymentResponseBody(),
        ...getChallengeShopperErrorResponse(),
    }));
}

export function getIdentifyShopperErrorResponse(): ThreeDSRequiredErrorResponse {
    return {
        errors: [
            { code: 'three_d_secure_required' },
        ],
        three_ds_result: {
            code: ResultCode.IdentifyShopper,
            token: 'token',
            payment_data: 'paymentData',
        },
        status: 'error',
    };
}

export function getIdentifyShopperError(): RequestError {
    return new RequestError(getResponse({
        ...getErrorPaymentResponseBody(),
        ...getIdentifyShopperErrorResponse(),
    }));
}

function getRedirectShopperErrorResponse(): ThreeDSRequiredErrorResponse {
    return {
        errors: [
            { code: 'three_d_secure_required' },
        ],
        three_ds_result: {
            code: ResultCode.RedirectShopper,
            acs_url: 'https://acs/url',
            callback_url: 'https://callback/url',
            payer_auth_request: 'payer_auth_request',
            merchant_data: 'merchant_data',
        },
        status: 'error',
    };
}

export function getRedirectShopperError(): RequestError {
    return new RequestError(getResponse({
        ...getErrorPaymentResponseBody(),
        ...getRedirectShopperErrorResponse(),
    }));
}
