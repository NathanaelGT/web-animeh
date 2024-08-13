import { cn } from '~c/utils'

type Props = {
  text: string
  className?: string
}

export function DownloadProgress({ text, className }: Props) {
  return (
    <p className={cn('flex whitespace-pre', className)}>
      {text.match(/\d+|\D+/g)?.map((chars, index) => {
        const asciiCode = chars.codePointAt(0)!
        // untuk angka, diset widthnya 1ch biar engga gerak"
        if (asciiCode >= 48 && asciiCode <= 57) {
          return (
            <span key={index} style={{ width: chars.length + 'ch' }} className="inline-block">
              {chars}
            </span>
          )
        }

        return <span key={index}>{chars}</span>
      })}
    </p>
  )
}
