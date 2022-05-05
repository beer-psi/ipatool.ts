import chalk from 'chalk';
import { StoreClient } from '../../store-api/store/client.js';
import { Storefront } from '../../store-api/common/storefront.js';
import { DeviceFamily } from '../../store-api/common/device-family.js';
import { StoreErrors } from '../../store-api/store/response.js';
import { Logger } from '../utils/logger.js';
import { loginFromKeychain, getTrackId } from '../utils/misc.js';

export default async function run({ 
  bundleId, 
  trackId, 
  deviceFamily, 
  country, 
  logLevel,
}: {
  bundleId: string | undefined,
  trackId: string | undefined,
  deviceFamily: DeviceFamily,
  country: keyof typeof Storefront,
  logLevel: string,
}) {
  const logger = new Logger(logLevel);

  logger.info('Logging in with provided information...');
  const user = await loginFromKeychain();
  if (!user) {
    logger.error('Authentication required. Run the "auth" subcommand.');
    return 1;
  }

  logger.debug('Setting authentication cookies...');
  user.c.map((cookie: string) => {
    StoreClient.storeReq.cookieJar.setCookieSync(cookie, 'https://apple.com');
  });

  logger.info(`Logged in as ${user.n}`);

  const identifier = await getTrackId(country, deviceFamily, bundleId, trackId);
  logger.debug(`Track ID: ${identifier}`);
  if (!identifier) {
    logger.error(`Couldn\'t find app with given identifier ${bundleId ?? trackId}`);
    return 1;
  }

  try {
    logger.info(`Obtaining a license for ${identifier} from the App Store...`);
    const app = await StoreClient.purchase(String(identifier), user.d, user.p, country);
    logger.debug(JSON.stringify(app, null, 2));
    logger.info('Done.');
  } catch (e: any) {
    if (e._state === 'failure') {
      switch (e.failureType) {
        case StoreErrors.PRICE_MISMATCH: {
          logger.error('A license already exists for this item.');
          break;
        }
        case StoreErrors.INVALID_COUNTRY: {
          logger.error('The country provided does not match your account. Use the -c, --country flag to supply a valid one.');
          break;
        }
        case StoreErrors.PASSWORD_TOKEN_EXPIRED: {
          logger.error('Login session expired. Login again.');
          break;
        }
        case StoreErrors.PASSWORD_CHANGED: {
          logger.error('Your password has changed.');
          break;
        }
        default: {
          throw e;
        }
      }
    } else {
      if (e.message === 'The Apple ID already contains a license for this app.') {
        logger.error(e.message);
      } else {
        throw e;
      }
    }
  }
}
