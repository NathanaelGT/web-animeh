import { argv } from '~s/argv'

export const maxWidth = argv.log ? 140 : 90

export const fill = (minus: string | number = 0, ...args: (string | number)[]) => {
  if (typeof minus === 'string') {
    minus = minus.length
  }

  for (const arg of args) {
    if (typeof arg === 'string') {
      minus += arg.length
    } else {
      minus += arg
    }
  }

  const columns = process.stdout.columns ? Math.min(process.stdout.columns, maxWidth) : 50

  return '.'.repeat(columns - (minus % columns))
}
