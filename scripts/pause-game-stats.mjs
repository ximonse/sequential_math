// Read-only teacher login and aggregate game results. Never exports pupil rows.
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const option = name => args[args.indexOf(`--${name}`) + 1]
function credential(name) {
  if (process.env[name]) return process.env[name]
  if (process.platform !== 'win32') return ''
  try {
    const encoded = execFileSync('powershell', ['-NoProfile', '-Command',
      `$v=[Environment]::GetEnvironmentVariable('${name}','User'); if($v){[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($v))}`], { encoding: 'utf8' }).trim()
    return Buffer.from(encoded, 'base64').toString('utf8')
  } catch { return '' }
}

async function main() {
  const base = (args.includes('--base') ? option('base') : 'https://matematik.ximon.se').replace(/\/$/, '')
  const username = credential('MATH_TEACHER_USER'), password = credential('MATH_TEACHER_PASS')
  if (!username || !password) throw Error('Teacher credentials are unavailable; no data was read.')
  let token
  async function api(path, body) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'x-teacher-token': token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    const data = await response.json()
    if (!response.ok) throw Error(`${path.split('?')[0]}: HTTP ${response.status}`)
    return data
  }
  token = (await api('/api/teacher-login', { username, password })).token
  const days = args.includes('--days') ? Number(option('days')) : 7
  if (!Number.isInteger(days) || days < 1 || days > 30) throw Error('--days must be 1–30')
  const to = Date.now() + 1
  const from = args.includes('--from') ? Date.parse(option('from')) : to - days * 86400000
  if (!Number.isFinite(from) || from >= to || to - from > 30 * 86400000) throw Error('Invalid --from; maximum period is 30 days')
  const classIds = args.includes('--class-id') ? [option('class-id')] : []
  if (!args.includes('--class-id')) {
    let offset = 0
    do {
      const page = await api(`/api/students?resource=classes&limit=100&offset=${offset}`)
      if (!Array.isArray(page.classes)) throw Error('Class listing is unavailable; cannot infer coverage.')
      classIds.push(...page.classes.map(record => record.classId))
      if (page.nextOffset !== null && (!Number.isInteger(page.nextOffset) || page.nextOffset <= offset)) throw Error('Invalid class pagination; coverage is unknown.')
      offset = page.nextOffset
    } while (offset !== null)
  }
  if (!classIds.length) throw Error('No authorized classes; game-statistics coverage is unknown.')
  const summaries = []
  for (const classId of classIds) {
    const query = new URLSearchParams({ resource: 'break-games', classId, from: String(from), to: String(to) })
    const result = await api(`/api/students?${query}`)
    if (result.version !== 1 || result.coverage !== 'recorded_rounds_only' || !result.games) {
      throw Error('Game statistics are not published on this server yet; this is not a zero-result report.')
    }
    summaries.push(result)
  }
  console.log(JSON.stringify({ source: base, capturedAt: Date.now(), summaries }, null, 2))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
