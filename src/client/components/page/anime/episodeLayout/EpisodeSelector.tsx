import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { oneRemInPx } from '~c/utils/css'
import { SimpleTooltip } from '@/ui/tooltip'
import type { EpisodeList } from '~c/stores'

const calculateRenderLimit = (episodeHeightInRem: number) => {
  const headerHeight = 4 * oneRemInPx
  const searchFormHeight = 2.5 * oneRemInPx
  const breadcrumbHeight = 1.25 * oneRemInPx
  const paddingAndGap = 4.5 * oneRemInPx // engga termasuk padding-bottom
  const height = innerHeight - headerHeight - searchFormHeight - breadcrumbHeight - paddingAndGap

  const episodeHeight = episodeHeightInRem * oneRemInPx
  const offset = 1

  return Math.ceil(height / episodeHeight) + offset
}

type EpisodeTooltipProps = {
  episode: EpisodeList[number]
}

export function EpisodeTooltip({ episode }: EpisodeTooltipProps) {
  return (
    <table>
      <tbody>
        <tr>
          <td>Episode</td>
          <td>: {episode.number}</td>
        </tr>
        {(episode.title || episode.romanjiTitle || episode.japaneseTitle) && (
          <tr>
            <td className="align-top">Judul</td>
            <td>
              {episode.title && <span>: {episode.title}</span>}
              {episode.romanjiTitle && (
                <>
                  <br />
                  <span className="text-transparent">: </span>
                  <span className="text-xs italic text-slate-500">{episode.romanjiTitle}</span>
                </>
              )}
              {episode.japaneseTitle && (
                <>
                  <br />
                  <span className="text-transparent">: </span>
                  <span className="text-xs italic text-slate-500">{episode.japaneseTitle}</span>
                </>
              )}
            </td>
          </tr>
        )}
        {episode.score !== null && (
          <tr>
            <td>Skor</td>
            <td>: {episode.score}</td>
          </tr>
        )}
        {episode.isFiller !== null && (
          <tr>
            <td>Filler</td>
            <td>: {episode.isFiller ? 'Ya' : 'Bukan'}</td>
          </tr>
        )}
        {episode.isRecap !== null && (
          <tr>
            <td>Recap</td>
            <td>: {episode.isRecap ? 'Ya' : 'Bukan'}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

type Props = {
  animeId: string
  currentEpisode: number
  episodeList: EpisodeList
  compactMode: boolean
}

function DetailEpisodeSelector(initial: boolean, { animeId, currentEpisode, episodeList }: Props) {
  let renderLimit: number
  if (initial) {
    renderLimit = calculateRenderLimit(2.75) // h-11 = 2.75rem
  }

  return episodeList.map((episode, index) => {
    if (initial && index >= renderLimit) {
      return <div key={episode.number} className="h-11" />
    }

    return (
      <div
        key={episode.number}
        id={`episode_${episode.number}`}
        className={
          'relative h-11 ring-3 ring-transparent ring-offset-0 transition-shadow duration-500 ease-in-out' +
          (episode.isFiller ? ' bg-yellow-100' : episode.isRecap ? ' bg-red-100' : '')
        }
      >
        <SimpleTooltip title={<EpisodeTooltip episode={episode} />}>
          <Link
            to="/anime/$id/episode/$number"
            params={{ id: animeId, number: episode.number.toString() }}
            className={
              'flex gap-3 py-3 pr-2 outline-indigo-400/75 transition-[outline] ' +
              (currentEpisode === episode.number
                ? 'bg-primary/15'
                : 'pl-4' + (index % 2 === 0 ? ' bg-primary/5' : ''))
            }
          >
            {currentEpisode === episode.number && <div className="-my-3 w-1 bg-indigo-400" />}

            <p className="min-w-4 flex-auto">{episode.number}</p>

            <p className="w-full truncate">
              {episode.title ? (
                episode.title
              ) : (
                <span className="opacity-50">Episode {episode.number}</span>
              )}
            </p>
          </Link>
        </SimpleTooltip>
      </div>
    )
  })
}

function CompactEpisodeSelector(initial: boolean, { animeId, currentEpisode, episodeList }: Props) {
  let renderLimit: number
  if (initial) {
    renderLimit = calculateRenderLimit(3) // h-10 = 2.5rem, gap-2 = 0.5rem
  }

  return episodeList.map((episode, index) => {
    if (initial && index / 5 >= renderLimit) {
      return <div key={episode.number} className="h-10" />
    }

    return (
      <div
        key={episode.number}
        id={`episode_${episode.number}`}
        className={
          'w-10 rounded-md ring-3 ring-transparent ring-offset-0 transition-shadow duration-500 ease-in-out ' +
          (episode.isFiller ? 'bg-yellow-100' : episode.isRecap ? 'bg-red-100' : 'bg-primary/20')
        }
      >
        <SimpleTooltip title={<EpisodeTooltip episode={episode} />}>
          <Link
            to="/anime/$id/episode/$number"
            params={{ id: animeId, number: episode.number.toString() }}
            className={
              'flex h-10 w-10 items-center justify-center rounded-md outline-indigo-400/75 transition-[outline]' +
              (currentEpisode === episode.number ? ' ring-indigo-400' : '')
            }
          >
            {episode.number}
          </Link>
        </SimpleTooltip>
      </div>
    )
  })
}

export function EpisodeSelector(props: Props) {
  const [initial, setInitial] = useState(true)

  useEffect(() => {
    setInitial(false)
  }, [setInitial])

  const Component = props.compactMode ? CompactEpisodeSelector : DetailEpisodeSelector

  return Component(initial, props)
}
