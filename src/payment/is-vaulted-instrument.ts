import { AdyenV2Instrument, FormattedPayload, PaymentInstrument, VaultedInstrument } from './payment';

export default function isVaultedInstrument(instrument: PaymentInstrument): instrument is VaultedInstrument {
    const formattedPayload = (instrument as FormattedPayload<AdyenV2Instrument>).formattedPayload;

    if (formattedPayload && formattedPayload.bigpay_token) {
        return Boolean(formattedPayload.bigpay_token.token);
    }

    return Boolean((instrument as VaultedInstrument).instrumentId);
}
