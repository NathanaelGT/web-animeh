/**
 * Original implementation: https://github.com/FFmpeg/FFmpeg/blob/master/tools/qt-faststart.c
 * TypeScript port: https://github.com/kevincharm/moov-faststart
 * Improvement: https://github.com/igorivaniuk/moov-faststart/tree/patch-2
 */

import fs from 'fs'

// ─── Atom Constants ───────────────────────────────────────────────────────────

const MOOV = 0x6d6f6f76
const FTYP = 0x66747970
const STCO = 0x7374636f
const CO64 = 0x636f3634

const subatomSet = new Set([
  MOOV,
  0x7472616b, // trak
  0x6d646961, // mdia
  0x6d696e66, // minf
  0x7374626c, // stbl
])

// ─── Types ────────────────────────────────────────────────────────────────────

interface AtomEntry {
  kind: number
  offset: number
  dataOffset: number
  dataSize: number
  extendedSize: boolean
}

interface QtAtom {
  kind: number
  size: number
  extendedSize: boolean
  data: QtAtom[] | Buffer
  _totalSize?: number
}

// ─── Atom Utilities ───────────────────────────────────────────────────────────

function writeU64BE(buf: Buffer, val: number, offset: number) {
  buf.writeUInt32BE((val / 0x100000000) >>> 0, offset)
  buf.writeUInt32BE(val >>> 0, offset + 4)
}

function scanAtoms(fd: number, fileSize: number): AtomEntry[] {
  const entries: AtomEntry[] = []
  const headerBuf = Buffer.alloc(16)
  let pos = 0

  while (pos < fileSize) {
    if (fileSize - pos < 8) break

    fs.readSync(fd, headerBuf as any, 0, 8, pos)
    let atomSize = headerBuf.readUInt32BE(0)
    const atomType = headerBuf.readUInt32BE(4)
    let extendedSize = false
    let dataOffset: number

    if (atomSize === 1) {
      fs.readSync(fd, headerBuf as any, 8, 8, pos + 8)
      const hi = headerBuf.readUInt32BE(8)
      const lo = headerBuf.readUInt32BE(12)
      atomSize = hi * 0x100000000 + lo
      dataOffset = pos + 16
      extendedSize = true
    } else {
      dataOffset = pos + 8
    }

    const dataSize = atomSize - (dataOffset - pos)

    entries.push({
      kind: atomType,
      offset: pos,
      dataOffset,
      dataSize,
      extendedSize,
    })

    pos += atomSize
  }

  return entries
}

function readAtomData(fd: number, entry: AtomEntry): Buffer {
  const buf = Buffer.alloc(entry.dataSize)
  fs.readSync(fd, buf as any, 0, entry.dataSize, entry.dataOffset)
  return buf
}

function parseAtoms(infile: Buffer, depth = 0): QtAtom[] {
  const atoms: QtAtom[] = []
  let pos = 0
  const len = infile.byteLength

  while (pos < len) {
    if (len - pos < 8) break

    let atomSize = infile.readUInt32BE(pos)
    pos += 4
    const atomType = infile.readUInt32BE(pos)
    pos += 4

    let extendedSize = false
    let dataStart: number
    if (atomSize === 1) {
      const hi = infile.readUInt32BE(pos)
      const lo = infile.readUInt32BE(pos + 4)
      atomSize = hi * 0x100000000 + lo
      pos += 8
      dataStart = pos
      extendedSize = true
    } else {
      dataStart = pos
    }
    const dataEnd = dataStart + atomSize - (extendedSize ? 16 : 8)
    const subatoms =
      subatomSet.has(atomType) && depth < 10
        ? parseAtoms(infile.subarray(dataStart, dataEnd), depth + 1)
        : infile.subarray(dataStart, dataEnd)
    pos = dataEnd

    atoms.push({
      kind: atomType,
      size: atomSize,
      extendedSize,
      data: subatoms,
      _totalSize: atomSize,
    })
  }

  return atoms
}

function computeTotalSize(atom: QtAtom): number {
  if (atom._totalSize !== undefined) return atom._totalSize
  const headerSize = atom.extendedSize ? 16 : 8
  if (Buffer.isBuffer(atom.data)) {
    const total = headerSize + atom.data.byteLength
    atom._totalSize = total
    return total
  }
  let childrenSize = 0
  for (let i = 0; i < atom.data.length; i++) {
    childrenSize += computeTotalSize(atom.data[i]!)
  }
  const total = headerSize + childrenSize
  atom._totalSize = total
  return total
}

function writeAtomToBuffer(atom: QtAtom, out: Buffer, offset: number): number {
  const totalSize = atom._totalSize!
  const headerSize = atom.extendedSize ? 16 : 8

  if (atom.extendedSize) {
    out.writeUInt32BE(1, offset)
    out.writeUInt32BE(atom.kind, offset + 4)
    writeU64BE(out, totalSize, offset + 8)
  } else {
    out.writeUInt32BE(totalSize, offset)
    out.writeUInt32BE(atom.kind, offset + 4)
  }

  if (Buffer.isBuffer(atom.data)) {
    atom.data.copy(out as any, offset + headerSize)
  } else {
    let childOffset = offset + headerSize
    for (let i = 0; i < atom.data.length; i++) {
      childOffset = writeAtomToBuffer(atom.data[i]!, out, childOffset)
    }
  }

  return offset + totalSize
}

function serializeAtom(atom: QtAtom): Buffer {
  computeTotalSize(atom)
  const out = Buffer.allocUnsafe(atom._totalSize!)
  writeAtomToBuffer(atom, out, 0)
  return out
}

function traverseAtoms(atoms: QtAtom[], callback: (atom: QtAtom) => void) {
  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i]!
    if (!Buffer.isBuffer(atom.data)) {
      traverseAtoms(atom.data, callback)
    }
    callback(atom)
  }
}

// ─── Update Chunk Offsets ─────────────────────────────────────────────────────

function updateChunkOffsets(moov: QtAtom) {
  const atoms = moov.data as QtAtom[]
  const originalMoovSize = moov.size
  let newChunksSize = 0
  let originalChunksSize = 0

  const chunkAtoms: QtAtom[] = []
  traverseAtoms(atoms, atom => {
    const kind = atom.kind
    if ((kind !== STCO && kind !== CO64) || !Buffer.isBuffer(atom.data)) {
      return
    }
    chunkAtoms.push(atom)

    const entries = atom.data.readUInt32BE(4)
    const isCo64 = kind === CO64
    const originalEntrySize = isCo64 ? 8 : 4
    originalChunksSize += entries * originalEntrySize
    const newEntrySize = isCo64 ? 8 : 4
    newChunksSize += entries * newEntrySize
  })

  const totalOffset = originalMoovSize - originalChunksSize + newChunksSize

  for (let i = 0; i < chunkAtoms.length; i++) {
    const atom = chunkAtoms[i]!
    const overflow = updateChunkAtom(atom, totalOffset)
    if (overflow) {
      upgradeStcoToCo64(atom, totalOffset)
    }
  }
}

function updateChunkAtom(atom: QtAtom, totalOffset: number): boolean {
  const origData = atom.data as Buffer
  const isCo64 = atom.kind === CO64
  const entries = origData.readUInt32BE(4)

  if (isCo64) {
    const data = Buffer.from(origData as any)
    atom.data = data
    for (let i = 0; i < entries; i++) {
      const cur = 8 + i * 8
      const hi = data.readUInt32BE(cur)
      const lo = data.readUInt32BE(cur + 4)
      const newVal = hi * 0x100000000 + lo + totalOffset
      data.writeUInt32BE((newVal / 0x100000000) >>> 0, cur)
      data.writeUInt32BE(newVal >>> 0, cur + 4)
    }
    return false
  }

  for (let i = 0; i < entries; i++) {
    const cur = 8 + i * 4
    if (origData.readUInt32BE(cur) + totalOffset > 0xffffffff) {
      return true
    }
  }

  const data = Buffer.from(origData as any)
  atom.data = data
  for (let i = 0; i < entries; i++) {
    const cur = 8 + i * 4
    data.writeUInt32BE(data.readUInt32BE(cur) + totalOffset, cur)
  }
  return false
}

function upgradeStcoToCo64(atom: QtAtom, totalOffset: number) {
  const origData = atom.data as Buffer
  const entries = origData.readUInt32BE(4)
  const upgradedData = Buffer.allocUnsafe(8 + entries * 8)
  origData.copy(upgradedData as any, 0, 0, 8)
  for (let i = 0; i < entries; i++) {
    const cur32 = 8 + i * 4
    const newVal = origData.readUInt32BE(cur32) + totalOffset
    const cur64 = 8 + i * 8
    upgradedData.writeUInt32BE((newVal / 0x100000000) >>> 0, cur64)
    upgradedData.writeUInt32BE(newVal >>> 0, cur64 + 4)
  }
  atom.kind = CO64
  atom.data = upgradedData
  atom.size = 8 + upgradedData.byteLength
}

// ─── Faststart ────────────────────────────────────────────────────────────────

const COPY_BUF_SIZE = 8 * 1024 * 1024

function copyRange(
  srcFd: number,
  dstFd: number,
  srcPos: number,
  dstPos: number,
  length: number,
  buf: Buffer,
): number {
  let remaining = length
  let rPos = srcPos
  let wPos = dstPos

  while (remaining > 0) {
    const toRead = Math.min(remaining, COPY_BUF_SIZE)
    const bytesRead = fs.readSync(srcFd, buf as any, 0, toRead, rPos)
    if (bytesRead === 0) {
      throw new Error(
        `Unexpected read of 0 bytes at position ${rPos} with ${remaining} bytes remaining`,
      )
    }

    fs.writeSync(dstFd, buf as any, 0, bytesRead, wPos)
    rPos += bytesRead
    wPos += bytesRead
    remaining -= bytesRead
  }

  return wPos
}

const source = Bun.argv[2]!
const destination = Bun.argv[3]!

const stat = fs.statSync(source)
const fd = fs.openSync(source, 'r')

const entries = scanAtoms(fd, stat.size)

const ftypEntry = entries.find(e => e.kind === FTYP)
const moovEntry = entries.find(e => e.kind === MOOV)

// Read and process moov
const moovData = readAtomData(fd, moovEntry!)
const moovAtoms = parseAtoms(moovData)
const moovAtom: QtAtom = {
  kind: MOOV,
  size: moovEntry!.dataSize + (moovEntry!.extendedSize ? 16 : 8),
  extendedSize: moovEntry!.extendedSize,
  data: moovAtoms,
}
updateChunkOffsets(moovAtom)
const serializedMoov = serializeAtom(moovAtom)

// Build merged copy ranges for remaining atoms (everything except ftyp & moov)
const mergedRanges: { start: number; length: number }[] = []
for (let i = 0; i < entries.length; i++) {
  const e = entries[i]!
  if (e.kind === FTYP || e.kind === MOOV) continue
  const start = e.offset
  const length = (e.extendedSize ? 16 : 8) + e.dataSize
  const last = mergedRanges[mergedRanges.length - 1]
  if (last && last.start + last.length === start) {
    last.length += length
  } else {
    mergedRanges.push({ start, length })
  }
}

// Write output using direct fd I/O
const outFd = fs.openSync(destination, 'w')
const copyBuf = Buffer.allocUnsafe(COPY_BUF_SIZE)
let writePos = 0

// 1. Write ftyp
if (ftypEntry) {
  const ftypLen = (ftypEntry.extendedSize ? 16 : 8) + ftypEntry.dataSize
  writePos = copyRange(fd, outFd, ftypEntry.offset, writePos, ftypLen, copyBuf)
}

// 2. Write moov
fs.writeSync(outFd, serializedMoov as any, 0, serializedMoov.byteLength, writePos)
writePos += serializedMoov.byteLength

// 3. Copy remaining atoms (merged ranges)
for (let i = 0; i < mergedRanges.length; i++) {
  const range = mergedRanges[i]!
  writePos = copyRange(fd, outFd, range.start, writePos, range.length, copyBuf)
}

fs.closeSync(outFd)
fs.closeSync(fd)
