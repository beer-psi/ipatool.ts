import { createWriteStream, readFileSync } from 'fs';
import JSZip from 'jszip';
import plist from 'plist';
import { parse } from 'fast-plist';
import { StoreItem } from '../store/response.js';

export async function readZip(path: string): Promise<JSZip> {
  const z = new JSZip();
  const content: Uint8Array = readFileSync(path);
  await z.loadAsync(content);
  return z;
}

export class SignatureClient {
  public archive: JSZip = new JSZip();

  public filename: string = '';

  public metadata: Record<string, unknown>;

  public signature: {
    id: number,
    sinf: Buffer
  };

  public email: string;

  constructor(
    item: StoreItem,
    email: string, 
  ) {
    this.metadata = Object.assign(item.metadata, {
      'apple-id': email,
      userName: email,
    });
    this.signature = item.sinfs.filter(sinf => sinf.id === 0)[0];
    if (!this.signature) {
      throw new Error('Invalid signature.');
    }
    this.email = email;
  }

  public async loadFile(path: string) {
    this.archive = await readZip(path);
    this.filename = path;
  }

  /**
   * Adds iTunesMetadata.plist to the downloaded IPA.
   */
  public appendMetadata(): SignatureClient {
    this.archive.file('iTunesMetadata.plist', Buffer.from(plist.build(<plist.PlistValue> this.metadata), 'utf8'));
    return this;
  }

  /**
   * Appends sinfs to the IPA.
   * @throws if the app bundle is invalid, or the signature is.
   */
  public async appendSignature(): Promise<SignatureClient> {
    const manifestPath = this.archive.file(/\.app\/SC_Info\/Manifest\.plist$/)[0].name;
    if (!manifestPath) {
      throw new Error('Invalid app bundle.');
    }
    const manifest = parse((await this.archive.file(manifestPath)?.async('string')) ?? '<plist></plist>');
    if (!manifest.SinfPaths[0]) {
      throw new Error('Invalid signature.');
    }
    const appBundleName = manifestPath.split('/')[1].replace(/\.app$/g, '');
    const signatureTargetPath = `Payload/${appBundleName}.app/${manifest.SinfPaths[0]}`;
    this.archive.file(signatureTargetPath, this.signature.sinf);
    return this;
  }

  public async write(): Promise<SignatureClient> {
    this.archive.generateNodeStream({
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    })
      .pipe(createWriteStream(this.filename))
      .on('finish', () => {
        console.log('ok');
      });
    return this;
  }
}
