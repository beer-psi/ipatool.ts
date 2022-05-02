export class StoreEndpoint {
  public static authenticate(prefix: string, guid: string): string {
    return `https://${prefix}-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/authenticate?guid=${guid}`;
  }

  public static download(guid: string): string {
    return `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${guid}`;
  }

  public static purchase =
    'https://buy.itunes.apple.com/WebObjects/MZBuy.woa/wa/buyProduct';
}
