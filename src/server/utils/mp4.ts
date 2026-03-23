import fs from 'fs/promises'

export const isFastStart = async (path: string) => {
  const handle = await fs.open(path, 'r')

  let cursor = 0

  const HEADER_SIZE = 16
  const header = Buffer.alloc(HEADER_SIZE)

  const moov = Buffer.from('moov') as Uint8Array
  const mdat = Buffer.from('mdat') as Uint8Array

  try {
    while (true) {
      const { bytesRead } = await handle.read(header as any, 0, HEADER_SIZE, cursor)
      if (bytesRead < 8) {
        return null
      }

      const atom = header.subarray(4, 8)

      if (atom.equals(moov)) {
        return true
      }
      if (atom.equals(mdat)) {
        return false
      }

      let size = header.readUInt32BE()
      if (size === 1) {
        size = Number(header.readBigUInt64BE(8))
      }

      cursor += size
    }
  } finally {
    await handle.close()
  }
}
