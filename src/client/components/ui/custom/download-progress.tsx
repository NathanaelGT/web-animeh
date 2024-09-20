import { clsx } from 'clsx'
import { Progress } from '@/ui/progress'
import type { ReactNode } from 'react'

type Props = {
  text: string
}

export function DownloadProgress({ text }: Props) {
  const progressPercentage = text.endsWith('%)') ? text.slice(text.indexOf('(') + 1, -2) : null

  const atIndex = text.indexOf('@')
  const speed = text.slice(atIndex + 1, text.lastIndexOf('/s'))

  const progressText = text.slice('Mengunduh: '.length, atIndex)

  return (
    <>
      {progressPercentage && (
        <Progress
          value={Number(progressPercentage)}
          // progressnya bakal keupdate setiap 50ms
          indicatorClassName="duration-50"
        />
      )}

      <div className="grid gap-x-4 md:grid-cols-3">
        <ConsistentWidthText text={speed} suffix="/s" className="md:mx-0" />

        {progressPercentage && <ConsistentWidthText text={progressPercentage} suffix="%" />}

        <ConsistentWidthText text={progressText} className="md:mr-0" />
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
