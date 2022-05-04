import { createWriteStream } from 'fs';
import https from 'https';
import chalk from 'chalk';
import fileSize from 'filesize';
import { getPassword } from 'keytar';
import { SingleBar, Presets } from 'cli-progress';
import { StoreClient } from '../store-api/store/client.js';
import { SignatureClient } from '../store-api/signature/client.js';
import { iTunesClient } from '../store-api/itunes/client.js';
import { Storefront } from '../store-api/common/storefront.js';
import { DeviceFamily } from '../store-api/common/device-family.js';
import { StoreErrors, StoreItem } from '../store-api/store/response.js';
import { Logger } from './logger.js';

interface Account {
  name: string;
  email: string;
  passwordToken: string;
  directoryServicesIdentifier: string;
  cookies: string[];
}

async function downloadFile(url: string, output: string, updateCallback: (downloaded: number, fileSize: number) => any): Promise<number> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const writeStream = createWriteStream(output, {
        flags: 'w',
      });
      const fs = parseInt(res.headers['content-length'] ?? '0', 10);
      let downloaded = 0;
      
      res
        .on('data', (chunk) => {
          writeStream.write(chunk);
          downloaded += chunk.length;
          updateCallback(downloaded, fs);
        })
        .on('end', () => {
          writeStream.end(() => {
            resolve(fs);
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  });
}

async function downloadWithProgress(url: string, output: string): Promise<void> {
  const bar = new SingleBar({
    format: 'Downloading: {bar} {percentage}% | {downloaded} of {fs}',
  }, Presets.shades_classic);
  bar.start(100, 0, {
    downloaded: 'N/A',
    fs: 'N/A',
  });
  const fs = await downloadFile(url, output, (downloaded: number, files: number) => {
    bar.update(Math.round(downloaded / files * 100), {
      downloaded: fileSize(downloaded),
      fs: fileSize(files),
    });
  });
  bar.update(100, {
    downloaded: fileSize(fs),
    fs: fileSize(fs),
  });
  bar.stop();
}

async function login(): Promise<Account | null> {
  const rawUser = await getPassword('ipatool.ts.service', 'account');
  if (!rawUser) {
    return null;
  }
  return JSON.parse(rawUser);
}

async function sign(app: StoreItem, user: Account, file: string) {
  const sigClient = new SignatureClient(app, user.email);
  await sigClient.loadFile(file);
  await sigClient.appendMetadata().appendSignature();
  await sigClient.write();
}

async function getTrackId(country: keyof typeof Storefront, deviceFamily: DeviceFamily, bundleId?: string, trackId?: string) {
  if (trackId) {
    return trackId;
  } else if (bundleId) {
    const resp = await iTunesClient.lookup(bundleId, country, deviceFamily);
    return resp?.trackId;
  }
}

export default async function run({ 
  bundleId, 
  trackId, 
  deviceFamily, 
  country, 
  output,
  logLevel,
}: {
  bundleId: string | undefined,
  trackId: string | undefined,
  deviceFamily: DeviceFamily,
  country: keyof typeof Storefront,
  output: string | undefined,
  logLevel: string,
}) {
  const logger = new Logger(logLevel);

  logger.info('Logging in with provided information...');
  const user = await login();
  if (!user) {
    logger.error('Authentication required. Run the "auth" subcommand.');
    return 1;
  }

  logger.debug('Setting authentication cookies...');
  user.cookies.map((cookie: string) => {
    StoreClient.storeReq.cookieJar.setCookieSync(cookie, 'https://apple.com');
  });
  
  logger.info(`Logged in as ${user.name}`);

  const identifier = await getTrackId(country, deviceFamily, bundleId, trackId);
  logger.debug(`Track ID: ${identifier}`);
  if (!identifier) {
    logger.error(`Couldn\'t find app with given identifier ${bundleId ?? trackId}`);
    return 1;
  }

  try {
    logger.info('Obtaining a signed copy of the app...');
    const app = await StoreClient.item(String(identifier), user.directoryServicesIdentifier);
    logger.info(`Found app ${app.metadata.bundleDisplayName} with version ${app.metadata.bundleShortVersionString}`);
    output ??= `${app.metadata.bundleDisplayName}_${app.metadata.bundleShortVersionString}.ipa`;
    
    await downloadWithProgress(app.URL, output);

    logger.info('Signing IPA');
    await sign(app, user, output);

    logger.info(chalk.green(`Saved IPA to ${output}`));
  } catch (e: any) {
    switch (e.failureType) {
      case StoreErrors.INVALID_COUNTRY: {
        logger.error('The country provided does not match your account. Use the -c, --country flag to supply a valid one.');
        break;
      }
      case StoreErrors.PASSWORD_TOKEN_EXPIRED: {
        logger.error('Login session expired. Login again.');
        break;
      }
      case StoreErrors.INVALID_ITEM: {
        logger.error('Received invalid store item.');
        break;
      }
      case StoreErrors.INVALID_LICENSE: {
        logger.error('Your Apple ID does not have a license for this app. Use the purchase command to obtain one.');
        break;
      }
      default: {
        if (e._state === 'failure') {
          logger.error(`Couldn't find app: ${e.customerMessage} (${e.failureType})`);
          break;
        } else {
          throw e;
        }
      }
    }
  } 
}
