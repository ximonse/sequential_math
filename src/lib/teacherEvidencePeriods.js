export const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STOCKHOLM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})

function getParts(timestamp) {
  const parts = dateFormatter.formatToParts(new Date(timestamp))
  const values = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return values
}

function getOffsetAt(timestamp) {
  const parts = getParts(timestamp)
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) - timestamp
}

function getStockholmMidnight(year, month, day) {
  const utcGuess = Date.UTC(year, month - 1, day)
  let timestamp = utcGuess - getOffsetAt(utcGuess)
  // Re-evaluate the offset at the resulting instant. This keeps calendar
  // boundaries correct around DST changes without relying on host timezone.
  timestamp = utcGuess - getOffsetAt(timestamp)
  return timestamp
}

function addCalendarDays({ year, month, day }, days) {
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  }
}

export function getStockholmDateKey(timestamp = Date.now()) {
  const { year, month, day } = getParts(timestamp)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getStockholmDayStart(timestamp = Date.now()) {
  const { year, month, day } = getParts(timestamp)
  return getStockholmMidnight(year, month, day)
}

export function getStockholmWeekStart(timestamp = Date.now()) {
  const date = getParts(timestamp)
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
  const monday = addCalendarDays(date, -daysSinceMonday)
  return getStockholmMidnight(monday.year, monday.month, monday.day)
}

export function getStockholmMonthStart(timestamp = Date.now()) {
  const { year, month } = getParts(timestamp)
  return getStockholmMidnight(year, month, 1)
}

export function getStockholmDaysAgoStart(timestamp = Date.now(), daysAgo = 0) {
  const date = addCalendarDays(getParts(timestamp), -Math.max(0, Math.round(daysAgo) || 0))
  return getStockholmMidnight(date.year, date.month, date.day)
}

export function getTeacherEvidencePeriods(timestamp = Date.now()) {
  return {
    dayStart: getStockholmDayStart(timestamp),
    weekStart: getStockholmWeekStart(timestamp),
    monthStart: getStockholmMonthStart(timestamp)
  }
}
