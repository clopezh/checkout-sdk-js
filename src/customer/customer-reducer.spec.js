import { CustomerStrategyActionType } from './customer-strategy-actions';
import { getCustomerResponseBody } from './internal-customers.mock';
import { getCompleteOrderResponseBody } from '../order/internal-orders.mock';
import { getErrorResponse } from '../common/http-request/responses.mock';
import { getQuoteResponseBody } from '../quote/internal-quotes.mock';
import * as customerActionTypes from '../customer/customer-action-types';
import * as orderActionTypes from '../order/order-action-types';
import * as quoteActionTypes from '../quote/quote-action-types';
import customerReducer from './customer-reducer';

describe('customerReducer()', () => {
    let initialState;

    beforeEach(() => {
        initialState = {};
    });

    it('returns new state with customer data if quote is fetched successfully', () => {
        const response = getQuoteResponseBody();
        const action = {
            type: quoteActionTypes.LOAD_QUOTE_SUCCEEDED,
            meta: response.meta,
            payload: response.data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
        }));
    });

    it('returns new customer data if order is fetched successfully', () => {
        const response = getCompleteOrderResponseBody();
        const action = {
            type: orderActionTypes.LOAD_ORDER_SUCCEEDED,
            meta: response.meta,
            payload: response.data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
        }));
    });

    it('returns new customer data if order is submitted successfully', () => {
        const response = getCompleteOrderResponseBody();
        const action = {
            type: orderActionTypes.SUBMIT_ORDER_SUCCEEDED,
            meta: response.meta,
            payload: response.data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
        }));
    });

    it('returns new customer data if order is finalized successfully', () => {
        const response = getCompleteOrderResponseBody();
        const action = {
            type: orderActionTypes.FINALIZE_ORDER_SUCCEEDED,
            meta: response.meta,
            payload: response.data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
        }));
    });

    it('returns new customer data while signing in customer', () => {
        const action = {
            type: customerActionTypes.SIGN_IN_CUSTOMER_REQUESTED,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            statuses: { isSigningIn: true },
        }));
    });

    it('returns new customer data if customer has signed in successfully', () => {
        const action = {
            type: customerActionTypes.SIGN_IN_CUSTOMER_SUCCEEDED,
            payload: getCustomerResponseBody().data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
            statuses: { isSigningIn: false },
        }));
    });

    it('returns new customer data if customer has failed to sign in', () => {
        const action = {
            type: customerActionTypes.SIGN_IN_CUSTOMER_FAILED,
            payload: getErrorResponse(),
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            errors: { signInError: getErrorResponse() },
            statuses: { isSigningIn: false },
        }));
    });

    it('returns new customer data while signing out customer', () => {
        const action = {
            type: customerActionTypes.SIGN_OUT_CUSTOMER_REQUESTED,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            statuses: { isSigningOut: true },
        }));
    });

    it('returns new customer data if customer has signed out successfully', () => {
        const action = {
            type: customerActionTypes.SIGN_OUT_CUSTOMER_SUCCEEDED,
            payload: getCustomerResponseBody().data,
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            data: action.payload.customer,
            errors: {},
            statuses: { isSigningOut: false },
        }));
    });

    it('returns new customer data if customer has failed to sign out', () => {
        const action = {
            type: customerActionTypes.SIGN_OUT_CUSTOMER_FAILED,
            payload: getErrorResponse(),
        };

        expect(customerReducer(initialState, action)).toEqual(expect.objectContaining({
            errors: { signOutError: getErrorResponse() },
            statuses: { isSigningOut: false },
        }));
    });

    it('returns new customer data while initializing customer', () => {
        const action = {
            type: CustomerStrategyActionType.InitializeRequested,
            meta: { methodId: 'foobar' },
        };

        expect(customerReducer(initialState, action).statuses).toEqual({
            initializingMethod: 'foobar',
            isInitializing: true,
        });
    });

    it('returns new customer data if customer has initialized successfully', () => {
        const action = {
            type: CustomerStrategyActionType.InitializeSucceeded,
            meta: { methodId: 'foobar' },
        };

        expect(customerReducer(initialState, action).statuses).toEqual({
            initializingMethod: undefined,
            isInitializing: false,
        });
    });

    it('returns new customer data if customer has failed to initialize', () => {
        const action = {
            type: CustomerStrategyActionType.InitializeFailed,
            payload: getErrorResponse(),
            meta: { methodId: 'foobar' },
        };

        expect(customerReducer(initialState, action).statuses).toEqual({
            initializingMethod: undefined,
            isInitializing: false,
        });

        expect(customerReducer(initialState, action).errors).toEqual({
            initializeMethod: 'foobar',
            initializeError: action.payload,
        });
    });
});
