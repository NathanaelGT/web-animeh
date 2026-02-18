import type { PropsWithChildren, ReactElement } from 'react'

type Props = PropsWithChildren<{
  icon: ReactElement
  progress?: ReactElement
  suffix?: ReactElement
}>

export function Status({ icon, progress, suffix, children }: Props) {
  return (
    <div className="m-auto grid w-11/12 gap-2 lg:max-w-xl">
      <div className="mx-auto mb-2 flex gap-2">
        <div className="my-auto w-6">{icon}</div>

        <p className="flex-1 whitespace-pre-wrap">{children}</p>
      </div>

      {progress}

      <div className="mt-4 flex h-10 justify-center">{suffix}</div>
    </div>
  )
}
