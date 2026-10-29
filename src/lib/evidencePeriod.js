// Calendar dates are interpreted in Stockholm, independent of the caller's timezone.
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function stockholmDay(timestamp = Date.now()) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function dateNumber(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(day)) throw new Error('Datum ska anges som ÅÅÅÅ-MM-DD.')
  const value = Date.parse(`${day}T00:00:00Z`)
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== day
    || Number(day.slice(0, 4)) < 1900 || Number(day.slice(0, 4)) > 9998) throw new Error('Ogiltigt kalenderdatum.')
  return value
}

function midnight(day) {
  const target = dateNumber(day)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(formatter.formatToParts(guess).map(part => [part.type, part.value]))
    const rendered = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)
    guess += target - rendered
  }
  return guess
}

export function evidencePeriod(from, to) {
  const startInclusive = evidenceBoundary(from), endExclusive = evidenceBoundary(to, true)
  if (endExclusive <= startInclusive) throw new Error('Slutet måste vara efter början av perioden.')
  return { from, to, timeZone: 'Europe/Stockholm',
    startInclusive, endExclusive }
}

// A date ends after that whole day. An explicit clock time is an exclusive end.
function evidenceBoundary(value, end = false) {
  if (typeof value !== 'string') throw new Error('Ange datum eller lokal tid som ÅÅÅÅ-MM-DDTHH:mm.')
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    const date = dateNumber(value)
    return midnight(end ? new Date(date + 86400000).toISOString().slice(0, 10) : value)
  }
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(\+0[12]:00)?$/u.exec(value)
  if (!match) throw new Error('Tid ska vara ÅÅÅÅ-MM-DDTHH:mm i Europe/Stockholm, eventuellt med +01:00 eller +02:00.')
  const wall = dateNumber(match[1]) + Number(match[2]) * 3600000 + Number(match[3]) * 60000
  const offsets = match[4] ? [Number(match[4].slice(1, 3))] : [1, 2]
  const candidates = offsets.map(offset => wall - offset * 3600000).filter(time => {
    const p = Object.fromEntries(formatter.formatToParts(time).map(part => [part.type, part.value]))
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value.slice(0, 16)
  })
  if (!candidates.length) throw new Error('Klockslaget finns inte i Europe/Stockholm eller har fel UTC-offset.')
  if (candidates.length > 1) throw new Error('Klockslaget är tvetydigt vid vintertidsbytet. Ange +02:00 eller +01:00.')
  return candidates[0]
}

export function defaultEvidenceDays(now = Date.now()) {
  const to = stockholmDay(now)
  const date = new Date(`${to}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return { from: date.toISOString().slice(0, 10), to }
}
