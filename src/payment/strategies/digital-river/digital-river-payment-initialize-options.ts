import { DigitalRiverDropInConfiguration } from './digital-river';

export default interface DigitalRiverPaymentInitializeOptions {
    /**
     * The ID of a container which the payment widget should insert into.
     */
    container: string;
    configuration: DigitalRiverDropInConfiguration;
    onRenderButton?(): void;
}
