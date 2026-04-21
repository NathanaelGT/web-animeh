export const parseNumber = (value: any) => {
  const number = parseInt(value)

  if (isNaN(number)) {
    return null
  }

  return number
}

export const formatFloat = (number: number, rounding = Math.round) => {
  const rounded = rounding(number * 100)

  const intPart = Math.trunc(rounded / 100)
  const fracPart = Math.abs(rounded % 100)

  const fracStr = fracPart < 10 ? '0' + fracPart : fracPart

  return intPart + '.' + fracStr
}

export const clamp = (number: number, min = -Infinity, max = Infinity) => {
  return Math.min(Math.max(number, min), max)
}

export const randomBetween = (min: number, max: number) => {
  return Math.round(Math.random() * (max - min) + min)
}

export const findClosestNumberIndex = (
  numbers: number[] | undefined | null,
  target: number,
  direction: -1 | 0 | 1 = 0,
  maxDistance: number = Infinity,
) => {
  const n = numbers?.length
  if (!n) {
    return null
  }

  if (target <= numbers[0]!) {
    return direction >= 0 ? checkDistance(0) : null
  }
  if (target >= numbers[n - 1]!) {
    return direction <= 0 ? checkDistance(n - 1) : null
  }

  let left = 0
  let right = n - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    if (numbers[mid] === target) {
      return mid
    }

    if (target < numbers[mid]!) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  if (direction === -1) {
    return checkDistance(right)
  }
  if (direction === 1) {
    return checkDistance(left)
  }

  const closestIdx =
    Math.abs(numbers[left]! - target) < Math.abs(numbers[right]! - target) ? left : right

  return checkDistance(closestIdx)

  function checkDistance(idx: number) {
    return Math.abs(numbers![idx]! - target) <= maxDistance ? idx : null
  }
}

export const findClosestNumber = (
  numbers: number[] | undefined | null,
  target: number,
  direction: -1 | 0 | 1 = 0,
  maxDistance: number = Infinity,
) => {
  const index = findClosestNumberIndex(numbers, target, direction, maxDistance)

  if (index === null) {
    return null
  }

  return numbers![index] ?? null
}
