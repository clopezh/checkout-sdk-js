import { CardElementProps } from '.';

/**
 * A set of options that are required to initialize the Stripe payment method.
 *
 * Once Stripe payment is initialized, credit card form fields, provided by the
 * payment provider as iframes, will be inserted into the current page. These
 * options provide a location and styling for each of the form fields.
 */
export default interface StripePaymentInitializeOptions {
    /**
     * The location to insert the credit card number form field.
     */
    cardElement: string;

    /**
     * The set of CSS styles to apply to all form fields.
     */
    elementProps?: {
        /**
         * The base class applied to the container.
         * Defaults to StripeElement.
         */
        base?: CardElementProps,

        /**
         * The class name to apply when the Element is complete.
         * Defaults to StripeElement--complete.
         */
        complete?: CardElementProps;

        /**
         * The class name to apply when the Element is empty.
         * Defaults to StripeElement--empty.
         */
        empty?: CardElementProps;

        /**
         * The class name to apply when the Element is focused.
         * Defaults to StripeElement--focus.
         */
        focus?: CardElementProps;

        /**
         * The class name to apply when the Element is invalid.
         * Defaults to StripeElement--invalid.
         */
        invalid?: CardElementProps;

        /**
         * The class name to apply when the Element has its value
         * autofilled by the browser (only on Chrome and Safari).
         * Defaults to StripeElement--webkit-autofill.
         */
        webkitAutofill?: CardElementProps;
    };
}
