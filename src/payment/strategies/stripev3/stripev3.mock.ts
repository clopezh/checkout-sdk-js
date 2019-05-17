import {
    StripeV3Js
} from './stripev3';

export function getStripeV3JsMock(): StripeV3Js {
    return {
        elements: jest.fn(),
        handleCardPayment: jest.fn(),
    };
}
