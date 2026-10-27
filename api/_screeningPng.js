import { inflateSync } from 'node:zlib'

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Canvas emits non-interlaced eight-bit PNG. Validate the complete file rather
// than accepting a MIME label and a header with missing or corrupt image data.
export function validateScreeningPng(bytes) {
  if (bytes.length > 512 * 1024 || bytes.length < 57 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG')
  let offset = 8, header = null, ended = false
  const data = []
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), end = offset + 12 + size
    if (end > bytes.length || size > 512 * 1024) throw new Error('Invalid PNG chunk')
    const kind = bytes.toString('ascii', offset + 4, offset + 8)
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) throw new Error('Invalid PNG checksum')
    if (!header && kind !== 'IHDR') throw new Error('Missing PNG header')
    if (kind === 'IHDR') {
      if (header || size !== 13) throw new Error('Invalid PNG header')
      header = bytes.subarray(offset + 8, end - 4)
    }
    if (kind === 'IDAT') data.push(bytes.subarray(offset + 8, end - 4))
    if (kind === 'IEND') { ended = size === 0 && end === bytes.length; break }
    offset = end
  }
  if (!header || !ended || !data.length) throw new Error('Incomplete PNG')
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4)
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header[9]]
  if (!width || !height || width > 1024 || height > 1024 || header[8] !== 8 || !channels
    || header[10] !== 0 || header[11] !== 0 || header[12] !== 0) throw new Error('Unsupported PNG dimensions or format')
  const expected = height * (1 + width * channels)
  if (inflateSync(Buffer.concat(data), { maxOutputLength: expected }).length !== expected) throw new Error('Invalid PNG pixels')
}
