import { DeviceFamily } from '../common/device-family.js';
import { Storefront } from '../common/storefront.js';
import { iTunesRequest } from './request.js';
import { iTunesResponse, iTunesSearchResult } from './response.js';

export class iTunesClient {
  /**
   * Searches for an app on the iTunes Store.
   * @param term The search term
   * @param limit How many results should the API return
   * @param countryCode The iTunes Store region to search in
   * @param deviceFamily The device type
   * @returns A list of apps matching the search result, or null if there is none
   */
  public static async search(
    term: string,
    limit: number,
    countryCode: keyof typeof Storefront,
    deviceFamily: DeviceFamily = DeviceFamily.PHONE,
  ): Promise<iTunesSearchResult[] | null> {
    const resp = await iTunesRequest.search(
      term,
      limit,
      countryCode,
      deviceFamily,
    );
    const decoded: iTunesResponse = <iTunesResponse> await resp.json();
    return decoded.results;
  }

  /**
   * Find an app by its bundle ID.
   * @param bundleIdentifier The app bundle ID to look for
   * @param countryCode The iTunes Store region to search in
   * @param deviceFamily The device type
   * @returns An app if there was a matching bundle ID, or null if there was none.
   */
  public static async lookup(
    bundleIdentifier: string,
    countryCode: keyof typeof Storefront,
    deviceFamily: DeviceFamily,
  ): Promise<iTunesSearchResult | null> {
    const resp = await iTunesRequest.lookup(
      bundleIdentifier,
      countryCode,
      deviceFamily,
    );
    const decoded: iTunesResponse = <iTunesResponse> await resp.json();
    return decoded.resultCount > 0 ? decoded.results[0] : null;
  }
}
