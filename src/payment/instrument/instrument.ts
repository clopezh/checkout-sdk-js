type PaymentInstrument = CardInstrument | AccountInstrument;

export default PaymentInstrument;

interface BaseInstrument {
    bigpayToken: string;
    defaultInstrument: boolean;
    provider: string;
    trustedShippingAddress: boolean;
    method: string;
    type: string;
}

/**
 * @deprecated This is the old instrument type. Please us CardInstrument,
 * AccountInstrument and PaymentInstrument.
 */
export interface Instrument {
    bigpayToken: string;
    defaultInstrument: boolean;
    provider: string;
    trustedShippingAddress: boolean;
    brand: string;
    expiryMonth: string;
    expiryYear: string;
    iin: string;
    last4: string;
}

export interface CardInstrument extends BaseInstrument {
    brand: string;
    expiryMonth: string;
    expiryYear: string;
    iin: string;
    last4: string;
    method: 'card';
    type: 'card';
}

export interface AccountInstrument extends BaseInstrument {
    externalId: string;
    method: 'paypal';
    type: 'account';
}

export interface VaultAccessToken {
    vaultAccessToken: string;
    vaultAccessExpiry: number;
}

export interface SessionContext {
    customerId: number;
    storeId: string;
    currencyCode?: string;
}

export interface InstrumentRequestContext extends SessionContext {
    authToken: string;
}
