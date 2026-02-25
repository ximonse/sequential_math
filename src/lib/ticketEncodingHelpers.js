export function parseTicketNumber(value) {
  if (value === '') return null
  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

export function normalizeTextAnswer(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function fromBase64Url(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding === 2) base64 += '=='
  else if (padding === 3) base64 += '='
  else if (padding !== 0) throw new Error('Invalid base64url')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
