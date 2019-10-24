import PaymentInstrument from './instrument';

export interface InstrumentError {
    code: number;
    message: string;
}

export type InternalInstrument = CardInternalInstrument | AccountInternalInstrument;

export interface BaseInternalInstrument {
    bigpay_token: string;
    default_instrument: boolean;
    provider: string;
    trusted_shipping_address: boolean;
}

export interface CardInternalInstrument extends BaseInternalInstrument {
    brand: string;
    expiry_month: string;
    expiry_year: string;
    iin: string;
    last_4: string;
    method_type: 'card';
}

export interface AccountInternalInstrument extends BaseInternalInstrument {
    external_id: string;
    method_type: 'paypal';
}

export interface InstrumentsResponseBody {
    vaultedInstruments: PaymentInstrument[];
}

export interface InstrumentErrorResponseBody {
    errors?: InstrumentError[];
}

export interface InternalInstrumentsResponseBody {
    vaulted_instruments: InternalInstrument[];
}

export interface InternalInstrumentErrorResponseBody {
    errors?: InstrumentError[];
}

export interface InternalVaultAccessTokenResponseBody {
    data: {
        token: string;
        expires_at: number;
        errors?: InstrumentError[];
    };
}
