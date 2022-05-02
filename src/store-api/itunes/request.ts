import fetch, { Response } from 'node-fetch';
import { DeviceFamily } from '../common/device-family.js';
import { Storefront } from '../common/storefront.js';
import { iTunesEndpoint } from './endpoint.js';

export class iTunesRequest {
  private static entity(deviceFamily: DeviceFamily): string {
    switch (deviceFamily) {
      case DeviceFamily.PHONE:
        return 'software';
      case DeviceFamily.PAD:
        return 'iPadSoftware';
    }
  }

  public static search(
    term: string,
    limit: number,
    countryCode: keyof typeof Storefront,
    deviceFamily: DeviceFamily = DeviceFamily.PHONE,
  ): Promise<Response> {
    const qs = new URLSearchParams({
      media: 'software',
      term: term,
      limit: String(limit),
      country: countryCode,
      entity: this.entity(deviceFamily),
    });
    const url = new URL(iTunesEndpoint.SEARCH);
    url.search = qs.toString();
    return fetch(url.toString());
  }

  public static lookup(
    bundleIdentifier: string,
    countryCode: keyof typeof Storefront,
    deviceFamily: DeviceFamily,
  ): Promise<Response> {
    const qs = new URLSearchParams({
      media: 'software',
      bundleId: bundleIdentifier,
      limit: '1',
      country: countryCode,
      entity: this.entity(deviceFamily),
    });
    const url = new URL(iTunesEndpoint.LOOKUP);
    url.search = qs.toString();
    return fetch(url.toString());
  }
}
