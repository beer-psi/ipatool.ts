import * as keytar from 'keytar';
import { Storefront } from '../../store-api/common/storefront.js';
import { DeviceFamily } from '../../store-api/common/device-family.js';
import { iTunesClient } from '../../store-api/itunes/client.js';

export interface Account {
  /**
   * The name assigned with this Apple ID.
   */
  n: string;

  /**
   * The email associated with this Apple ID.
   */
  e: string;

  /**
   * The password token of this ID.
   */
  p: string;

  /**
   * Directory Services Identifier
   */
  d: string;

  /**
   * An array of Set-Cookie strings
   */
  c: string[];
}

export async function loginFromKeychain(): Promise<Account | null> {
  const rawUser = await keytar.getPassword('ipatool.ts.service', 'account');
  if (!rawUser) {
    return null;
  }
  return JSON.parse(rawUser);
}

export async function getTrackId(country: keyof typeof Storefront, deviceFamily: DeviceFamily, bundleId?: string, trackId?: string) {
  if (trackId) {
    return trackId;
  } else if (bundleId) {
    const resp = await iTunesClient.lookup(bundleId, country, deviceFamily);
    return resp?.trackId;
  }
}
