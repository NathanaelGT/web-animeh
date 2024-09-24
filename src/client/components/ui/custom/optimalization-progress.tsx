import { Progress } from '@/ui/progress'
import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  text: string
}>

export function OptimalizationProgress({ text, children }: Props) {
  const progressPercentage = text.slice(text.indexOf('(') + 1, -2)

  return (
    <>
      <Progress
        value={Number(progressPercentage)}
        // progressnya bakal keupdate setiap 500ms
        indicatorClassName="duration-500"
      />

      {children}
    </>
  )
}
