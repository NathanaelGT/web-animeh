import { Progress } from '@/ui/progress'

type Props = {
  text: string
}

export function OptimalizationProgress({ text }: Props) {
  const progressPercentage = text.slice(text.indexOf('(') + 1, -2)

  return (
    <>
      <Progress
        value={Number(progressPercentage)}
        // progressnya bakal keupdate setiap 500ms
        indicatorClassName="duration-500"
      />

      <p className="text-center">Mengoptimalisasi video</p>
    </>
  )
}
