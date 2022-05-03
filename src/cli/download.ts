import { createWriteStream } from 'fs';
import https from 'https';
import chalk from 'chalk';
import fileSize from 'filesize';
import { SingleBar, Presets } from 'cli-progress';
import { StoreClient } from '../store-api/store/client.js';
import { SignatureClient } from '../store-api/signature/client.js';
import { iTunesClient } from '../store-api/itunes/client.js';
import { Storefront } from '../store-api/common/storefront.js';
import { DeviceFamily } from '../store-api/common/device-family.js';
import { StoreErrors } from '../store-api/store/response.js';

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

export default async function downloadApp({ 
  email, 
  password, 
  mfaCode, 
  bundleId, 
  trackId, 
  deviceFamily, 
  country, 
  output, 
}: {
  email: string,
  password: string
  mfaCode: string | undefined,
  bundleId: string | undefined,
  trackId: string | undefined,
  deviceFamily: DeviceFamily,
  country: keyof typeof Storefront,
  output: string | undefined,
}) {
  console.log('Logging in with provided information...');
  try {
    const user = await StoreClient.authenticate(email, password, mfaCode);
    console.log(chalk.green(`Logged in as ${user.accountInfo.address.firstName} ${user.accountInfo.address.lastName}`));
    if (bundleId) {
      console.log(`Finding app with bundle ID ${bundleId} on ${country} storefront...`);
      const lookupRes = await iTunesClient.lookup(bundleId, country, deviceFamily);
      if (!lookupRes) {
        console.log(chalk.red('Couldn\'t find app with said bundle ID!'));
        return 1;
      }
      trackId = String(lookupRes.trackId);
    }
    if (trackId) {
      console.log('Obtaining a signed copy of the app...');
      try {
        const app = await StoreClient.item(trackId, user.dsPersonId);
        console.log(`Found app ${app.metadata.bundleDisplayName} with version ${app.metadata.bundleShortVersionString}`);
        output ??= `${app.metadata.bundleDisplayName}_${app.metadata.bundleShortVersionString}.ipa`;
        
        await downloadWithProgress(app.URL, output);

        console.log('Signing IPA');
        const sigClient = new SignatureClient(app, user.accountInfo.appleId);
        await sigClient.loadFile(output);
        await sigClient.appendMetadata().appendSignature();
        await sigClient.write();
        console.log(chalk.green(`Saved IPA to ${output}`));
      } catch (e: any) {
        switch (e.failureType) {
          case StoreErrors.INVALID_COUNTRY: {
            console.log(chalk.red('The country provided does not match your account. Use the -c, --country flag to supply a valid one.'));
            break;
          }
          case StoreErrors.PASSWORD_TOKEN_EXPIRED: {
            console.log(chalk.red('Login session expired. Login again.'));
            break;
          }
          case StoreErrors.INVALID_ITEM: {
            console.log(chalk.red('Received invalid store item.'));
            break;
          }
          case StoreErrors.INVALID_LICENSE: {
            console.log(chalk.red('Your Apple ID does not have a license for this app. Use the purchase command to obtain one.'));
            break;
          }
          default: {
            if (e._state === 'failure') {
              console.log(chalk.red(`Couldn't find app: ${e.customerMessage} (${e.failureType})`));
              break;
            } else {
              throw e;
            }
          }
        }
      }
      
    }
  } catch (e: any) {
    if (e._state === 'failure') {
      console.log(chalk.red(`Couldn't log in: ${e.customerMessage} (${e.failureType})`));
    } else {
      throw e;
    }
  }
}
