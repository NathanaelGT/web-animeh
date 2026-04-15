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

export const findClosestNumber = (
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
    return direction >= 0 ? checkDistance(numbers[0]!) : null
  }
  if (target >= numbers[n - 1]!) {
    return direction <= 0 ? checkDistance(numbers[n - 1]!) : null
  }

  let left = 0
  let right = n - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    if (numbers[mid] === target) {
      return numbers[mid]
    }

    if (target < numbers[mid]!) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  const valAtRight = numbers[right]!
  const valAtLeft = numbers[left]!

  if (direction === -1) {
    return checkDistance(valAtRight)
  }

  if (direction === 1) {
    return checkDistance(valAtLeft)
  }

  const closest =
    Math.abs(valAtLeft - target) < Math.abs(valAtRight - target) ? valAtLeft : valAtRight

  return checkDistance(closest)

  function checkDistance(num: number) {
    return Math.abs(num - target) <= maxDistance ? num : null
  }
}
