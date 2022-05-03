import { parse } from 'fast-plist';
import plist from 'plist';
import getMAC from 'getmac';
import fetchCookie from 'fetch-cookie';
import nodeFetch from 'node-fetch';
import { StoreEndpoint } from './endpoint.js';
import { StoreFailureResponse, StoreAuthResponse, StoreDownloadResponse } from './response.js';

const fetch = fetchCookie(nodeFetch);

export class StoreRequest {
  static commonHeaders = {
    'User-Agent':
      'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  static get guid(): string {
    return getMAC().replaceAll(':', '').toUpperCase();
  }

  public static async authenticate(
    email: string,
    password: string,
    mfa?: string,
  ): Promise<StoreFailureResponse | StoreAuthResponse> {
    const body = plist.build({
      appleId: email,
      attempt: mfa ? 2 : 4,
      createSession: 'true',
      guid: this.guid,
      password: `${password}${mfa ?? ''}`,
      rmp: 0,
      why: 'signIn',
    });
    const resp = await fetch(
      StoreEndpoint.authenticate(mfa ? 'p71' : 'p25', this.guid),
      {
        method: 'POST',
        body: body,
        headers: this.commonHeaders,
      },
    );
    const parsedResp = parse(await resp.text());
    if (<StoreFailureResponse>parsedResp.failureType) {
      return Object.assign(parsedResp, {
        _state: 'failure',
      });
    }
    return Object.assign(parsedResp, {
      _state: 'success',
    });
  }

  public static async download(
    appIdentifier: string,
    directoryServicesIdentifier: string,
  ): Promise<StoreFailureResponse | StoreDownloadResponse> {
    const body = plist.build({
      creditDisplay: '',
      guid: this.guid,
      salableAdamId: appIdentifier,
    });
    const resp = await fetch(
      StoreEndpoint.download(this.guid),
      {
        method: 'POST',
        body: body,
        headers: Object.assign(this.commonHeaders, {
          'X-Dsid': directoryServicesIdentifier,
          'iCloud-DSID': directoryServicesIdentifier,
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }),
      },
    );
    const parsedResp = parse(await resp.text());
    if (<StoreFailureResponse>parsedResp.failureType) {
      return Object.assign(parsedResp, {
        _state: 'failure',
      });
    }
    return Object.assign(parsedResp, {
      _state: 'success',
    });
  }

  /**
   * @todo
   */
  public static async purchase() {
    // TODO
  }
}
