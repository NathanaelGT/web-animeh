import { Progress } from '@/ui/progress'
import { formatBytes } from '~/shared/utils/byte'
import { formatFloat } from '~/shared/utils/number'
import type { DownloadProgress } from '~s/external/download/progress'

type Props = {
  progress: DownloadProgress
  text?: string
}

export function DownloadProgress({
  progress: { speed, receivedLength, totalLength },
  text,
}: Props) {
  if (!totalLength) {
    return (
      <div className="grid text-center lining-nums">
        <p className="md:text-start">{text || formatBytes(speed) + '/s'}</p>

        <p className="md:text-end">{formatBytes(receivedLength)}</p>
      </div>
    )
  }

  const progressPercentage = (receivedLength / totalLength) * 100

  return (
    <>
      <Progress
        value={progressPercentage}
        className={text ? 'animate-pulse' : undefined}
        indicatorClassName="duration-50" // progressnya bakal keupdate setiap 50ms
      />

      <div className="grid text-center lining-nums md:grid-cols-5">
        <p className="md:col-span-2 md:text-start">{text || formatBytes(speed) + '/s'}</p>

        <p>{formatFloat(progressPercentage, Math.floor)}%</p>

        <p className="md:col-span-2 md:text-end">
          {formatBytes(receivedLength)}
          {' / '}
          {formatBytes(totalLength)}
        </p>
      </div>
    </>
  )
}
