export class InvalidLoginCredentialsError extends Error {
    constructor(username: string, password: string) {
        super(`("${username}", "${password})`);
    }
}
export class UserUnauthorisedError extends Error {
    constructor(userid?: number, message?: string) {
        super(`User(${userid}) make an unauthorised request! ${message}`);
    }
}
export class CurrencyMismatchError extends Error {
    constructor(currencyA?: string, currencyB?: string) {
        super(`Mismatch between (${currencyA}) and (${currencyB})`);
    }
}
export class NoSuchWalletError extends Error {
    public readonly address?: string;

    constructor(address?: string, message?: string) {
        super(`No such wallet (${address}): ${message}`);
        this.address = address;
    }
}
export class BalanceInsufficentError extends Error {}
export class NoSuchUserError extends Error {}
export class MissingRequiredParametersError extends Error {}
export class UnknownError extends Error {}