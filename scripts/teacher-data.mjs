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

const startOfWeek = () => {
  const date = new Date(); date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}
const parseDay = (text, endOfDay) => {
  const date = new Date(`${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) throw new Error(`Ogiltigt datum: ${text} (använd ÅÅÅÅ-MM-DD)`)
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}
const from = option('from') ? parseDay(option('from')) : startOfWeek()
const to = option('to') ? parseDay(option('to'), true) : new Date()

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

const rows = []
for (const match of matches) {
  const { profile } = await api(`/api/teacher-students/${encodeURIComponent(match.studentId)}`, { token })
  const log = Array.isArray(profile.problemLog) && profile.problemLog.length ? profile.problemLog : profile.recentProblems || []
  for (const problem of log) {
    const time = Number(problem.timestamp || 0)
    if (time < from.getTime() || time > to.getTime()) continue
    if (flag('wrong-only') && problem.correct) continue
    rows.push({
      Elev: pupilName(match), ElevID: match.studentId, Klass: match.className || '',
      Tid: new Date(time).toISOString(), Uppgift: problem.promptText || JSON.stringify(problem.values ?? ''),
      Problemtyp: problem.problemType || '', Nivå: problem.targetLevel ?? problem.level ?? '',
      ElevensSvar: problem.studentAnswer ?? '', RättSvar: problem.correctAnswer ?? '',
      Rätt: problem.correct ? 1 : 0, Felkategori: problem.errorCategory || (problem.correct ? 'none' : 'knowledge'),
      Felmönster: Array.isArray(problem.errorPatterns) ? problem.errorPatterns.join('|') : '',
      Feldetalj: problem.errorDetail || '', SvarstidSek: problem.timeSpent ?? ''
    })
  }
}
rows.sort((a, b) => a.Tid.localeCompare(b.Tid))

const out = option('out') || join(homedir(), 'teacher-data-out')
mkdirSync(out, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const stem = join(out, `${[pupilQuery, classQuery].filter(Boolean).join('_').replace(/[^\p{L}\p{N}]+/gu, '-') || 'export'}-${stamp}`)
const cell = value => `"${String(value).replace(/"/g, '""')}"`
const header = rows[0] ? Object.keys(rows[0]) : ['Elev']
writeFileSync(`${stem}.csv`, `﻿${[header.join(';'), ...rows.map(row => header.map(key => cell(row[key])).join(';'))].join('\r\n')}\r\n`)
writeFileSync(`${stem}.json`, JSON.stringify(rows, null, 2))
const wrong = rows.filter(row => !row.Rätt).length
console.log(`${matches.length} elev(er), ${rows.length} uppgifter (${wrong} fel), ${from.toISOString().slice(0, 10)} till ${to.toISOString().slice(0, 10)}`)
console.log(`${stem}.csv\n${stem}.json`)
