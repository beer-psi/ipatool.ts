export interface iTunesResponse {
  resultCount: number;
  results: iTunesSearchResult[];
}

export interface iTunesSearchResult {
  trackId: number;
  trackName: string;
  bundleId: string;
  version: string;
  price: number;
}
