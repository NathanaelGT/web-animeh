export const parseNumber = (value: any) => {
  const number = parseInt(value)

  if (isNaN(number)) {
    return null
  }

  return number
}

export const clamp = (number: number, min = -Infinity, max = Infinity) => {
  return Math.min(Math.max(number, min), max)
}

export const randomBetween = (min: number, max: number) => {
  return Math.round(Math.random() * (max - min) + min)
}
