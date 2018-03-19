import { CheckoutSelectors, CheckoutStore } from '../../checkout';
import CustomerCredentials from '../customer-credentials';
import SignInCustomerService from '../sign-in-customer-service';

export default abstract class CustomerStrategy {
    protected _isInitialized = false;

    constructor(
        protected _store: CheckoutStore,
        protected _signInCustomerService: SignInCustomerService
    ) {}

    abstract signIn(credentials: CustomerCredentials, options?: any): Promise<CheckoutSelectors>;

    abstract signOut(options?: any): Promise<CheckoutSelectors>;

    initialize(options?: any): Promise<CheckoutSelectors> {
        this._isInitialized = true;

        return Promise.resolve(this._store.getState());
    }

    deinitialize(options?: any): Promise<CheckoutSelectors> {
        this._isInitialized = false;

        return Promise.resolve(this._store.getState());
    }
}
