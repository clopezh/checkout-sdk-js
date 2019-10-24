import { getCardInstrument } from './instrument.mock';
import mapToLegacyInstrument from './map-to-legacy-instrument';

describe('mapToLegacyInstrument', () => {
    it('returns a legacy instrument from a CardInstrument', () => {
        expect(mapToLegacyInstrument(getCardInstrument()))
            .toEqual(expect.not.objectContaining({
                method: expect.any(String),
                type: expect.any(String),
            }));
    });
});
