import { setPassword, deletePassword } from 'keytar';
import { StoreClient } from '../store-api/store/client.js';
import { StoreAuthResponse, StoreFailureResponse } from '../store-api/store/response.js';
import { Logger } from './logger.js';

async function _login(email: string, password: string, mfa?: string): Promise<StoreAuthResponse | StoreFailureResponse> {
  try {
    return await StoreClient.authenticate(email, password, mfa);
  } catch (e: any) {
    return e;
  }
}

export async function login({ email, password, mfaCode, logLevel }: {
  email: string,
  password: string,
  mfaCode?: string,
  logLevel: string,
}) {
  const logger = new Logger(logLevel);

  logger.info('Logging in with provided information...');
  const user = await _login(email, password, mfaCode);
  if (user._state === 'failure') {
    logger.error(`Couldn't log in: ${user.customerMessage} (${user.failureType})`);
    return 1;
  }
  logger.info(`Logged in as ${user.accountInfo.address.firstName} ${user.accountInfo.address.lastName}`);
  const userinfo = {
    n: `${user.accountInfo.address.firstName} ${user.accountInfo.address.lastName}`,
    e: email,
    p: user.passwordToken,
    d: user.dsPersonId,
    c: StoreClient.storeReq.cookieJar.getSetCookieStringsSync('https://apple.com', { allPaths: true }),
  };
  logger.debug(JSON.stringify(userinfo));
  await setPassword('ipatool.ts.service', 'account', JSON.stringify(userinfo));
  logger.info('Saved authentication info to your system\'s keychain.');
}

export async function revoke({ logLevel }: { logLevel: string }) {
  const logger = new Logger(logLevel);
  const res = await deletePassword('ipatool.ts.service', 'account');
  if (res)
    logger.info('Revoked authentication.');
  else
    logger.info('No credentials available to revoke.');
}
