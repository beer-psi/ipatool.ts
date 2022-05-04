import { Storefront } from '../common/storefront.js';
import { StoreRequest } from './request.js';
import { StoreAuthResponse, StoreErrors, StoreItem, StorePurchaseResponse } from './response.js';

export class StoreClient {
  static storeReq = StoreRequest;

  /**
   * Signs a user into iTunes.
   * @param email Apple ID email
   * @param password Apple ID password
   * @param mfa Apple ID 2FA token (if there is one)
   * @returns An object containing user information
   * @throws {StoreFailureResponse} if the user cannot sign in.
   */
  public static async authenticate(
    email: string,
    password: string,
    mfa?: string,
  ): Promise<StoreAuthResponse> {
    return this.#authenticate(email, password, mfa, true);
  }

  /**
   * Gets an app from the iTunes Store.
   * @param appIdentifier (a.k.a `salableAdamId`) A number that identifies the app on iTunes Store.
   * @param directoryServicesIdentifier The user's DSID.
   * @throws {StoreFailureResponse}
   */
  public static async item(
    appIdentifier: string,
    directoryServicesIdentifier: string,
  ): Promise<StoreItem> {
    const resp = await StoreRequest.download(appIdentifier, directoryServicesIdentifier);
    if (resp._state === 'failure') {
      throw resp;
    } else {
      return resp.songList[0];
    }
  }

  /**
   * Signs a user into iTunes, with optional retrying
   * @param email Apple ID email
   * @param password Apple ID password
   * @param mfa Apple ID 2FA token (if there is one)
   * @param firstTime Whether this was the first attempt logging in
   * @returns An object containing user information
   * @throws {StoreFailureResponse} if the user cannot sign in even on 2nd attempt.
   */
  static async #authenticate(
    email: string,
    password: string,
    mfa: string | undefined,
    firstTime: boolean,
  ): Promise<StoreAuthResponse> {
    const resp = await StoreRequest.authenticate(email, password, mfa);
    if (resp._state === 'failure') {
      if (resp.failureType === StoreErrors.INVALID_CREDENTIALS && firstTime) {
        return this.#authenticate(email, password, mfa, false);
      } else {
        throw resp;
      }
    } else {
      return resp;
    }
  }

  public static async purchase(
    appIdentifier: string,
    directoryServicesIdentifier: string,
    passwordToken: string,
    countryCode: keyof typeof Storefront,
  ): Promise<StorePurchaseResponse> {
    const resp = await StoreRequest.purchase(appIdentifier, directoryServicesIdentifier, passwordToken, countryCode);
    if (resp._state === 'failure') {
      throw resp;
    } else {
      return resp;
    }
  }
}
