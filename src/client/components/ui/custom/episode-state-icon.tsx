import { DownloadIcon, Wand, CircleCheckBig, Hourglass, LoaderCircle } from 'lucide-react'
import * as downloadText from '~/shared/anime/episode/downloadText'
import type { DownloadProgressDataWithoutDone } from '~s/db/repository/episode'

type Props = {
  data: DownloadProgressDataWithoutDone
}

export function EpisodeStateIcon({ data }: Props) {
  if (data.status === 'DOWNLOADING') {
    return <DownloadIcon />
  }

  if (data.text === downloadText.OPTIMIZING) {
    return <Wand />
  }

  if (data.text === downloadText.FINISH) {
    return <CircleCheckBig />
  }

  if (data.text.startsWith('Menunggu')) {
    return <Hourglass />
  }

  return <LoaderCircle className="animate-spin" />
}
