import { clsx } from 'clsx'
import { Progress } from '@/ui/progress'
import { formatBytes } from '~/shared/utils/byte'
import type { ReactNode } from 'react'
import type { DownloadProgress } from '~s/external/download/progress'

type Props = {
  progress: DownloadProgress
}

export function DownloadProgress({ progress: { speed, receivedLength, totalLength } }: Props) {
  const progressPercentage = totalLength && (receivedLength / totalLength) * 100

  return (
    <>
      {progressPercentage && (
        <Progress
          value={progressPercentage}
          // progressnya bakal keupdate setiap 50ms
          indicatorClassName="duration-50"
        />
      )}

      <div className="grid gap-x-4 md:grid-cols-3">
        <ConsistentWidthText text={formatBytes(speed)} suffix="/s" className="md:mx-0" />

        {progressPercentage && (
          <ConsistentWidthText text={progressPercentage.toFixed(2)} suffix="%" />
        )}

        <ConsistentWidthText
          text={formatBytes(receivedLength) + (totalLength ? ' / ' + formatBytes(totalLength) : '')}
          className="md:mr-0"
        />
      </div>
    </>
  )
}

type ConsistentWidthTextProps = {
  text: string
  suffix?: ReactNode
  className?: string
}

function ConsistentWidthText({ text, suffix, className }: ConsistentWidthTextProps) {
  return (
    <p className={clsx('mx-auto flex whitespace-pre', className)}>
      {text.match(/\d+|\D+/g)?.map((chars, index) => {
        const asciiCode = chars.codePointAt(0)!

        if (asciiCode >= 48 && asciiCode <= 57) {
          return (
            <span key={index} style={{ width: chars.length + 'ch' }} className="inline-block">
              {chars}
            </span>
          )
        }

        return <span key={index}>{chars}</span>
      })}

      {suffix}
    </p>
  )
}
