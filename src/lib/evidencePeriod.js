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
  const start = dateNumber(from), end = dateNumber(to)
  if (end < start) throw new Error('Slutdatum får inte vara före startdatum.')
  const nextDay = new Date(end + 86400000).toISOString().slice(0, 10)
  return { from, to, timeZone: 'Europe/Stockholm',
    startInclusive: midnight(from), endExclusive: midnight(nextDay) }
}

export function defaultEvidenceDays(now = Date.now()) {
  const to = stockholmDay(now)
  const date = new Date(`${to}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return { from: date.toISOString().slice(0, 10), to }
}
