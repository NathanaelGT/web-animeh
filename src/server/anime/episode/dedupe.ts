import { episodes } from '~s/db/schema'

type Episode = Pick<typeof episodes.$inferSelect, 'number'>

function dedupeEpisodes<TEpisode extends Episode>(
  episodes: TEpisode[],
  otherEpisodes: TEpisode[],
): TEpisode[]
function dedupeEpisodes<TEpisode extends Episode, TOtherEpisode extends Episode>(
  episodes: TEpisode[],
  otherEpisodes: TOtherEpisode[],
  modifyOtherEpisodes: (episode: TOtherEpisode) => TEpisode,
): TEpisode[]
function dedupeEpisodes<TEpisode extends Episode, TOtherEpisode extends Episode>(
  episodes: TEpisode[],
  otherEpisodes: TEpisode[] | TOtherEpisode[],
  modifyOtherEpisodes?: (episode: TOtherEpisode) => TEpisode,
): TEpisode[] {
  if (!otherEpisodes.length) {
    return episodes
  }

  const episodeNumbers = new Set<number>()
  for (let i = 0; i < episodes.length; i++) {
    episodeNumbers.add(episodes[i]!.number)
  }

  const filteredOtherEpisodes = otherEpisodes.filter(episode => !episodeNumbers.has(episode.number))

  return episodes.concat(
    modifyOtherEpisodes
      ? (filteredOtherEpisodes as TOtherEpisode[]).map(modifyOtherEpisodes)
      : (filteredOtherEpisodes as TEpisode[]),
  )
}

export { dedupeEpisodes }
