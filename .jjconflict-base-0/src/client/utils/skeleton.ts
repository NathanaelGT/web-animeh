import { randomBetween } from '~/shared/utils/number'

export const generateTextWidth = (
  minWordCount: number,
  maxWordCount: number,
  minPx = 14,
  maxPx = 75,
) => {
  const textWidth = []
  const textWordCount = randomBetween(minWordCount, maxWordCount)
  for (let i = 0; i < textWordCount; i++) {
    textWidth[i] = { width: randomBetween(minPx, maxPx) + 'px' }
  }

  return textWidth
}

export const generateTextWidthList = (
  [minListCount, maxListCount]: [number, number],
  [minWordCount, maxWordCount]: [number, number],
) => {
  const widthList: ReturnType<typeof generateTextWidth>[] = []
  const count = randomBetween(minListCount, maxListCount)
  for (let i = 0; i < count; i++) {
    widthList[i] = generateTextWidth(minWordCount, maxWordCount)
  }

  return widthList
}
