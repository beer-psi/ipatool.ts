import { createWriteStream } from 'fs';
import https from 'https';
import chalk from 'chalk';
import fileSize from 'filesize';
import { StoreClient } from '../store-api/store/client.js';
import { SignatureClient } from '../store-api/signature/client.js';
import { iTunesClient } from '../store-api/itunes/client.js';
import { Storefront } from '../store-api/common/storefront.js';
import { DeviceFamily } from '../store-api/common/device-family.js';

async function downloadFile(url: string, output: string, updateCallback: (downloaded: number, fileSize: number) => any): Promise<void> {
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
            resolve();
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  });
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
  _purchase,
}: {
  email: string,
  password: string
  mfaCode: string | undefined,
  bundleId: string | undefined,
  trackId: string | undefined,
  deviceFamily: DeviceFamily,
  country: keyof typeof Storefront,
  output: string | undefined,
  _purchase: boolean,
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
      console.log('Querying app with the iTunes Store API...');
      try {
        const app = await StoreClient.item(trackId, user.dsPersonId);
        console.log(`Found app ${app.metadata.bundleDisplayName} with version ${app.metadata.bundleShortVersionString}`);
        output ??= `${app.metadata.bundleDisplayName}_${app.metadata.bundleShortVersionString}.ipa`;
        
        console.log(`Saving app to ${output}...`);
        await downloadFile(app.URL, output, (downloaded: number, fs: number) => {
          process.stdout.write(`Downloaded ${Math.round(downloaded / fs * 100)}% (${fileSize(downloaded)} of ${fileSize(fs)})\r`);
        });
        console.log('\nSigning IPA');
        const sigClient = new SignatureClient(app, user.accountInfo.appleId);
        await sigClient.loadFile(output);
        await sigClient.appendMetadata().appendSignature();
        await sigClient.write();
        console.log(chalk.green(`Saved IPA to ${output}`));
      } catch (e: any) {
        if (e._state === 'failure') {
          console.log(chalk.red(`Couldn't find app: ${e.customerMessage} (${e.failureType})`));
        } else {
          throw e;
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
