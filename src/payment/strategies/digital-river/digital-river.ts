export default interface DigitalRiverJS {
    createDropIn(configuration: DigitalRiverDropInConfiguration): DigitalRiverDropIn;
}

export interface DigitalRiverWindow extends Window {
    DigitalRiver?(apiKey: string, options: DigitalRiverJSOptions): DigitalRiverJS;
}

interface DigitalRiverJSOptions {
    locale: string;
}

export interface DigitalRiverDropInConfiguration {
    sessionId: string;
    billingAddress: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        address: {
            line1: string;
            line2: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        }
    },
    onSuccess(data: OnSuccessResponse): void;
    onCancel(data: { paymentMethod: string }): void;
    onError(data: { paymentMethod: string }): void;
    onReady(data: { paymentMethodTypes: string[] }): void;
}

interface OnSuccessResponse {
    "source": {
        "clientId": string;
        "channelId": string;
        "liveMode": boolean;
        "id": string;
        "sessionId": string;
        "clientSecret": string;
        "type": string;
        "reusable": boolean;
        "owner": {
            "firstName": string;
            "lastName": string;
            "email": string;
            "phoneNumber": string;
            "address": {
                "line1": string;
                "city": string;
                "state": string;
                "country": string;
                "postalCode": string;
            }
        },
        "paymentId": string;
        "amount": string;
        "currency": string;
        "state": string;
        "upstreamId": string;
        "creationIp": string;
        "createdTime": string;
        "updatedTime": string;
        "flow": string;
        "browserInfo": {
            "userAgent": string;
            "acceptHeader": string;
            "language": string;
            "colorDepth": number;
            "screenHeight": number;
            "screenWidth": number;
            "timeZoneOffset": number;
            "javaEnabled": false;
            "browserIp": string;
            "referrer": string;
        },
        "creditCard": {
            "brand": string;
            "expirationMonth": number;
            "expirationYear": number;
            "lastFourDigits": string;
            "paymentIdentifier": string;
            "binData": {
                "cardNumberLength": number;
            }
        }
    },
    "readyForStorage": false;
}

export interface DigitalRiverDropIn {
    mount(dropInId: string): void;
}
