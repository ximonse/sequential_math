#!/usr/bin/env node
// Read-only export of pupil answers for analysis (Claude Code, Codex, Excel).
// Logs in as a teacher via the same API as the dashboard, so it only sees the
// classes that teacher sees. It never writes to the app (only GET, plus login).
//
// Credentials: env MATH_TEACHER_USER / MATH_TEACHER_PASS (never in the repo).
// Usage: node scripts/teacher-data.mjs --pupil Kerstin --class 6 [--from 2026-10-19] [--to 2026-10-25]
//        node scripts/teacher-data.mjs --list          (classes and pupils the teacher can see)
// Options: --base <url> (default https://matematik.ximon.se)  --out <dir>  --wrong-only
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { defaultEvidenceDays, evidencePeriod } from '../src/lib/evidencePeriod.js'
import { evidencePage, practiceEvidence } from '../api/_pupilEvidence.js'
import { fetchPupilEvidence } from './pupil-evidence-client.mjs'

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }

// `setx` values are invisible to processes started before it ran; read the
// user registry so an older shell still works on Windows.
function credential(name) {
  if (process.env[name]) return process.env[name]
  if (process.platform !== 'win32') return ''
  try {
    // Base64 keeps å/ä/ö intact; PowerShell's stdout uses the console code page.
    const encoded = execFileSync('powershell', ['-NoProfile', '-Command',
      `$v=[Environment]::GetEnvironmentVariable('${name}','User'); if($v){[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($v))}`],
    { encoding: 'utf8' }).trim()
    return Buffer.from(encoded, 'base64').toString('utf8')
  } catch { return '' }
}

const base = (option('base') || 'https://matematik.ximon.se').replace(/\/$/, '')
const username = credential('MATH_TEACHER_USER')
const password = credential('MATH_TEACHER_PASS')
if (!username || !password) {
  console.error('Saknar MATH_TEACHER_USER / MATH_TEACHER_PASS (sätt dem med setx, se skillen teacher-data).')
  process.exit(2)
}

async function api(path, { token, body } = {}) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'x-teacher-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path}: ${response.status} ${data.error || ''}`.trim())
  return data
}

const defaults = defaultEvidenceDays()
const period = evidencePeriod(option('from') || defaults.from, option('to') || defaults.to)

const { token } = await api('/api/teacher-login', { body: { username, password } })
const [{ profiles }, { labels }] = await Promise.all([
  api('/api/students', { token }), api('/api/teacher-pupil-labels', { token })
])
const pupilName = profile => labels?.[String(profile.studentId).toUpperCase()] || profile.name || profile.studentId
const norm = value => String(value || '').toLowerCase()

if (flag('list')) {
  for (const profile of profiles) console.log(`${profile.className || profile.classId}\t${pupilName(profile)}\t${profile.studentId}`)
  process.exit(0)
}

const pupilQuery = norm(option('pupil'))
const classQuery = norm(option('class'))
const matches = profiles.filter(profile =>
  (!pupilQuery || norm(pupilName(profile)).includes(pupilQuery)) &&
  (!classQuery || norm(profile.className).includes(classQuery) || norm(profile.classId).includes(classQuery)))
if (matches.length === 0) { console.error('Ingen elev matchade. Kör med --list för att se vilka som finns.'); process.exit(1) }
if (!pupilQuery && !classQuery) { console.error('Ange --pupil och/eller --class (eller --list).'); process.exit(1) }
if (pupilQuery && matches.length > 1) throw new Error('Flera elever matchar. Ange exaktare elevnamn och klass; ingen export utfördes.')

const out = option('out') || join(homedir(), 'teacher-data-out')
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const stem = join(out, `${[pupilQuery, classQuery].filter(Boolean).join('_').replace(/[^\p{L}\p{N}]+/gu, '-') || 'export'}-${stamp}`)
if (flag('evidence')) {
  if (flag('wrong-only')) throw new Error('--evidence bevarar både rätta och felaktiga svar; kombinera inte med --wrong-only.')
  if (matches.length !== 1) throw new Error('Underlagsexport kräver exakt en elev. Ange --pupil och --class.')
  const match = matches[0]
  const evidence = await fetchPupilEvidence(path => api(path, { token }), { studentId: match.studentId,
    classId: match.classId, from: period.from, to: period.to, source: option('source') || 'practice' })
  mkdirSync(out, { recursive: true })
  writeFileSync(`${stem}.evidence.json`, JSON.stringify(evidence, null, 2))
  console.log(`${evidence.total} observationer; historikens fullständighet anges i coverage.\n${stem}.evidence.json`)
  process.exit(0)
}

const rows = [], coverage = []
for (const match of matches) {
  const { profile } = await api(`/api/teacher-students/${encodeURIComponent(match.studentId)}`, { token })
  const retained = practiceEvidence(profile)
  const evidence = evidencePage({ studentId: match.studentId, classId: match.classId, source: 'practice', period,
    practice: retained, screening: { entries: [], coverage: { status: 'not_requested' } }, query: { limit: 100 } })
  // Legacy CSV export may exceed a page; the same projection supplies all retained rows.
  coverage.push({ studentId: match.studentId, period, snapshotRevision: evidence.snapshotRevision, coverage: evidence.coverage })
  for (const entry of retained.entries) {
    const time = entry.timestamp
    if (time < period.startInclusive || time >= period.endExclusive) continue
    if (flag('wrong-only') && entry.answer.status !== 'incorrect') continue
    const { question, answer, context, interpretation, reference } = entry
    rows.push({
      Elev: pupilName(match), ElevID: match.studentId, Klass: match.className || '',
      Tid: new Date(time).toISOString(), Uppgift: question.promptText || JSON.stringify(question.values ?? ''),
      Problemtyp: question.problemType || '', Nivå: context.targetLevel ?? context.level ?? '',
      ElevensSvar: answer.studentAnswer ?? '', RättSvar: answer.correctAnswer ?? '',
      Rätt: answer.status === 'correct' ? 1 : answer.status === 'incorrect' ? 0 : '',
      Felkategori: interpretation.category, Felmönster: interpretation.patterns.join('|'),
      Feldetalj: interpretation.detail || '', SvarstidSek: context.timeSpent ?? '',
      Svarsstatus: answer.status, ObservationsID: reference.observationId || '',
      Källreferens: JSON.stringify({ ...reference, snapshotRevision: evidence.snapshotRevision })
    })
  }
}
rows.sort((a, b) => a.Tid.localeCompare(b.Tid))

mkdirSync(out, { recursive: true })
const cell = value => `"${String(value).replace(/"/g, '""')}"`
const header = rows[0] ? Object.keys(rows[0]) : ['Elev']
writeFileSync(`${stem}.csv`, `\uFEFF${[header.join(';'), ...rows.map(row => header.map(key => cell(row[key])).join(';'))].join('\r\n')}\r\n`)
writeFileSync(`${stem}.json`, JSON.stringify(rows, null, 2))
writeFileSync(`${stem}.coverage.json`, JSON.stringify(coverage, null, 2))
const wrong = rows.filter(row => row.Svarsstatus === 'incorrect').length
console.log(`${matches.length} elev(er), ${rows.length} uppgifter (${wrong} fel), ${period.from} till ${period.to} (Europe/Stockholm)`)
console.log(`${stem}.csv\n${stem}.json`)
console.log(`Historikens fullständighet är okänd. Täckning och källrevision: ${stem}.coverage.json`)
