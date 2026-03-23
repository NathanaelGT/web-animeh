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
