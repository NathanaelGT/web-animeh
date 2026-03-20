export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const formatTime = (totalSeconds: number, separator = ':') => {
  if (totalSeconds < 0) return '00'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (num: number) => num.toString().padStart(2, '0')

  if (hours > 0) {
    return hours + separator + pad(minutes) + separator + pad(seconds)
  } else if (minutes > 0) {
    return minutes + separator + pad(seconds)
  }
  return seconds + ''
}

export const parseTime = (timeStr: string, separator = ':') => {
  const parts = timeStr.split(separator).map(Number)

  let result: number

  if (parts.length === 1) {
    result = parts[0]!
  } else if (parts.length === 2) {
    result = parts[0]! * 60 + parts[1]!
  } else {
    result = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  }

  if (isNaN(result) || result < 0) {
    return 0
  }

  return result
}

export const getTime = (date: Date | number) => {
  if (typeof date === 'number') {
    return date
  }
  return date.getTime()
}

export const howManyWeeksSince = (since: Date | number, compareTo: Date | number = Date.now()) => {
  const diff = getTime(compareTo) - getTime(since)

  if (diff < 0) {
    return 0
  }

  const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000

  return Math.floor(diff / MS_IN_WEEK)
}
