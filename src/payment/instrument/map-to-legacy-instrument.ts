import { CardInstrument, Instrument } from './instrument';

export default function mapToLegacyInstrument(cardInstrument: CardInstrument): Instrument {
    const { type, method, ...rest } = cardInstrument;

    return rest;
}
