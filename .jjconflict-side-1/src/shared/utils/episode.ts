export const searchEpisode = <TEpisode extends { number: number }>(
  episodeList: TEpisode[],
  episodeToSearch: number,
): TEpisode | undefined => {
  const estimated = episodeList[episodeToSearch - 1]

  if (estimated) {
    if (estimated.number === episodeToSearch) {
      return estimated
    }

    if (estimated.number > episodeToSearch) {
      for (let i = episodeToSearch - 1; i < episodeList.length; i++) {
        if (episodeList[i]!.number === episodeToSearch) {
          return episodeList[i]!
        }
      }
    } else {
      for (let i = episodeToSearch - 1; i >= 0; i--) {
        if (episodeList[i]!.number === episodeToSearch) {
          return episodeList[i]!
        }
      }
    }
  }

  return episodeList.find(episode => episode.number === episodeToSearch)
}
