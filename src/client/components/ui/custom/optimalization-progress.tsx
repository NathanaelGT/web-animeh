import { Progress } from '@/ui/progress'
import type { PropsWithChildren } from 'react'
import type { OptimizingProgress } from '~s/external/download/progress'

type Props = PropsWithChildren<{
  progress: OptimizingProgress
}>

export function OptimalizationProgress({ progress, children }: Props) {
  return (
    <>
      <Progress
        value={progress.percent}
        // progressnya bakal keupdate setiap 500ms
        indicatorClassName="duration-500"
      />

      {children}
    </>
  )
}
