/**
 * A demonstration of store-api. This logs you into the iTunes Store,
 * then download a signed copy of Working Copy (the git client.)
 */
import { createWriteStream } from 'fs';
import fetch from 'node-fetch';
import { StoreClient } from './store-api/store/client.js';
import { SignatureClient } from './store-api/signature/client.js';

const APPLE_ID = '';
const PASSWORD = '';
const TRACKID = '896694807'; // Working Copy

(async () => {
  console.log('Logging in...');
  const user = await StoreClient.authenticate(APPLE_ID, PASSWORD);
  console.log(`Logged in as ${user.accountInfo.address.firstName} ${user.accountInfo.address.lastName}`);

  console.log('Looking up app');
  const app = await StoreClient.item(TRACKID, user.dsPersonId);
  console.log(`Found app ${app.metadata.bundleDisplayName} with version ${app.metadata.bundleShortVersionString}`);
  const output = `${app.metadata.bundleDisplayName}_${app.metadata.bundleShortVersionString}.ipa`;

  console.log('Downloading app...');
  const resp = await fetch(app.URL);
  const file = createWriteStream(output);
  if (resp.body) {
    const fileSize = Number(resp.headers.get('content-length'));
    let downloaded = 0;
    for await (const chunk of resp.body) {
      file.write(chunk, (e?: Error | null) => {
        if (e) { throw e; }
      });
      downloaded += chunk.length;
      process.stdout.write(`Downloaded ${downloaded} of ${fileSize} (${Math.round(downloaded / fileSize * 100)})\r`);
    }
    file.close();
    console.log('Signing IPA');
    const sigClient = new SignatureClient(app, APPLE_ID);
    await sigClient.loadFile(output);
    await sigClient.appendMetadata().appendSignature();
    await sigClient.write();
  }
})();

