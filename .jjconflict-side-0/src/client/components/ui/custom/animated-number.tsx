import NumberFlow, { type Value } from '@number-flow/react'

type Props = {
  value: Value
}

export function AnimatedNumber({ value }: Props) {
  return (
    <NumberFlow
      value={value}
      format={{ useGrouping: 'min2' }}
      locales={'id-ID'}
      className="lining-nums"
    />
  )
}
