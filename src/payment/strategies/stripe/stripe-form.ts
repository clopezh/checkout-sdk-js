
export interface PaymentIntent {
    /*
     * Unique identifier for the object.
     *
     * RETRIEVABLE WITH PUBLISHABLE KEY
     */
    id?: string;
}

export enum ErrorType {
    API_CONNECTION_ERROR = 'api_connection_error',
    API_ERROR = 'api_error',
    AUTHENTICATION_ERROR = 'authentication_error',
    CARD_ERROR = 'card_error',
    IDEMPOTENCY_ERROR = 'idempotency_error',
    INVALID_REQUEST_ERROR = 'invalid_request_error',
    RATE_LIMIT_ERROR = 'rate_limit_error',
}

export interface Error {
    type: ErrorType;
    code: string;
    decline_code: string;
    doc_url: string;
    message: string;
    param: string;
    payment_intent: any;
    payment_method: any;
    source: any;

}

export interface StripeFormElement {
    /**
     * The ID of the container which the form element should insert into.
     */
    elementId: string;
}

export interface Properties {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontSmoothing?: string;
    fontStyle?: string;
    fontVariant?: string;
    fontWeight?: string | number;
    iconColor?: string;
    lineHeight?: string | number;
    letterSpacing?: string;
    textAlign?: string;
    padding?: string;
    textDecoration?: string;
    textShadow?: string;
    textTransform?: string;
}

export interface StripeResponse {
    paymentIntent: PaymentIntent;
    error: Error;
}

export interface MsClearProperties extends Properties {
    display?: string;
}

export interface BaseProps extends Properties {
    ':hover'?: Properties;
    ':focus'?: Properties;
    '::placeholder'?: Properties;
    '::selection'?: Properties;
    ':-webkit-autofill'?: Properties;
    ':disabled'?: Properties;
    '::ms-clear'?: MsClearProperties;
}

export default interface CardElementProps extends BaseProps {
    /*
     * A pre-filled set of values to include in the input (e.g., {postalCode: '94110'}).
     * Note that sensitive card information (card number, CVC, and expiration date) cannot
     * be pre-filled.
     */
    value?: string;

    /*
     * Hide the postal code field. Default is false. If you are already collecting a full billing
     * address or postal code elsewhere, set this to true.
     */
    hidePostalCode?: boolean;

    /*
     * Appearance of the icon in the Element. Either 'solid' or 'default'.
     */
    iconStyle?: string;

    /*
     * Hides the icon in the Element. Default is false.
     */
    hideIcon?: boolean;

    /*
     * Applies a disabled state to the Element such that user input is not accepted. Default is
     * false.
     */
    disabled?: boolean;
}
