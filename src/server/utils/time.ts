export const formatNs = (ns: number) => {
  if (ns > 1e11) {
    return (ns / 1e12).toFixed(2) + 'm'
  } else if (ns > 1e8) {
    return (ns / 1e9).toFixed(2) + 's'
  } else if (ns > 1e5) {
    return (ns / 1e6).toFixed(2) + 'ms'
  } else if (ns > 1e2) {
    return (ns / 1e3).toFixed(2) + 'µs'
  }
  return ns.toFixed(2) + 'ns'
}

export const isMoreThanOneDay = <TFallback = true>(
  compareTo: Date | null | undefined,
  { fallback = true as TFallback } = {},
) => {
  if (!compareTo) {
    return fallback
  }

  const diff = Date.now() - compareTo.getTime()

  return diff > 24 * 60 * 60 * 1000
}

export const isMoreThanOneMinute = <TFallback = true>(
  compareTo: Date | null | undefined,
  { fallback = true as TFallback } = {},
) => {
  if (!compareTo) {
    return fallback
  }

  const diff = Date.now() - compareTo.getTime()

  return diff > 60 * 1000
}
