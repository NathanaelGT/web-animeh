import fs from 'fs/promises'

/**
 * Use case: ngecek bagian depan file yang besar, atau untuk file binary
 *
 * kalo filenya kecil dan text, mending pake:
 * ```ts
 * (await Bun.file(path).text()).includes(needle)
 * ```
 *
 * Note: `needle` harus kurang dari `chunkSize`
 */
export const isSubstringPresent = async (
  path: string,
  needle: string | Buffer,
  maxCheckSize: number,
  chunkSize = 64 * 1024,
) => {
  let currentSize = 0
  const tempFileHandle = await fs.open(path, 'r')
  const buf = Buffer.alloc(chunkSize)

  let prevTail = Buffer.alloc(0)
  let found = false

  while (currentSize < maxCheckSize) {
    const { bytesRead } = await tempFileHandle.read(buf as any, 0, chunkSize, currentSize)
    if (!bytesRead) {
      break
    }

    const chunk = buf.subarray(0, bytesRead)
    currentSize += bytesRead

    if (Buffer.concat([prevTail, chunk] as any).includes(needle)) {
      found = true
      break
    }

    prevTail = chunk.subarray(chunk.length - (needle.length - 1))
  }

  await tempFileHandle.close()

  return found
}
