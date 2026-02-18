import { readFileSync, promises as fs } from 'fs'
import { faststart } from '@ivaniuk/moov-faststart'

const [source, out] = Bun.argv.slice(2)
if (!source) {
  throw new Error('source is required')
}
if (!out) {
  throw new Error('out is required')
}

const video = readFileSync(source)

const faststarted = faststart(video)

await Promise.all([fs.writeFile(out, faststarted as any), fs.rm(source)])
