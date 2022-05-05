import terminalLink from 'terminal-link';
import Table from 'cli-table3';
import { DeviceFamily } from '../../store-api/common/device-family.js';
import { Storefront } from '../../store-api/common/storefront.js';
import { iTunesClient } from '../../store-api/itunes/client.js';

export default async function run(
  { 
    term, 
    limit, 
    d, 
    country,
  }: {
    term: string,
    limit: number,
    d: DeviceFamily,
    country: keyof typeof Storefront
  }): Promise<void> {
  const results = await iTunesClient.search(term, limit, country, d);
  if (!results) {
    console.log('No results found.');
    return;
  }
  const table = new Table({
    head: ['Track ID', 'Name', 'Bundle ID', 'Version', 'Price'],
  });
  results.forEach((value) => {
    table.push([
      terminalLink(String(value.trackId), value.trackViewUrl, {
        fallback: (text) => {
          return text;
        },
      }),
      value.trackName,
      value.bundleId,
      value.version,
      value.formattedPrice,
    ]);
  });
  console.log(table.toString());
}
