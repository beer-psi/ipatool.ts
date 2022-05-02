export enum StoreErrors {
  UNKNOWN_ERROR = '0',
  GENERIC_ERROR = '5002',
  CODE_REQURIED = '1',
  INVALID_LICENSE = '9610',
  INVALID_CREDENTIALS = '-5000',
  INVALID_ACCOUNT = '5001',
  INVALID_ITEM = '-10000',
  LOCKED_ACCOUNT = '-10001',
  INVALID_COUNTRY = '-128',
  PASSWORD_TOKEN_EXPIRED = '2034',
  PRICE_MISMATCH = '2019',
}

interface StoreResponse {
  pings: unknown[],
}

interface HasDSID {
  dsPersonId: string,
}

export interface StoreAuthResponse extends StoreResponse, HasDSID {
  _state: 'success',
  accountInfo: Account,
  passwordToken: string,
}

export interface StoreFailureResponse extends StoreResponse, Error {
  _state: 'failure',
  failureType: `${StoreErrors}`,
  customerMessage: string
}

export interface StoreDownloadResponse extends StoreResponse, HasDSID {
  _state: 'success'
  jingleDocType: string,
  jingleAction: string,
  songList: StoreItem[],
}

export interface StoreItem {
  URL: string,
  md5: string,
  sinfs: {
    id: number,
    sinf: Buffer
  }[],
  metadata: {
    bundleDisplayName: string,
    bundleShortVersionString: string,
    softwareVersionBundleId: string,
    softwareVersionExternalIdentifier: string,
    softwareVersionExternalIdentifiers: string[],
  }
}

export interface Account {
  appleId: string,
  address: {
    firstName: string,
    lastName: string,
  }
}
