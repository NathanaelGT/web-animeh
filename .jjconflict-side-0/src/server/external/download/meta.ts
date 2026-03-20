export type DownloadMeta = {
  animeId: number
  episodeNumber: number
}

export const downloadMeta = new Map<string, DownloadMeta>()
