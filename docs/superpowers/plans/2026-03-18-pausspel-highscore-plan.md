# Pausspel: Svårighetskurva, Highscore & Lärarpanel — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smooth difficulty curves for Pong/Snake pause games, add class-based highscore lists (top 7), "Ximon is impressed!" celebration, and teacher dashboard panel.

**Architecture:** Games get new difficulty functions. A shared `GameOverScreen` component handles game-end UI + highscore display. A new Vercel API endpoint (`/api/highscores`) handles read/write of highscores in KV. Teacher dashboard gets a new `PauseGameHighscorePanel`. The `teacher-class-extras` endpoint gets merge-write to support `highscoreGroup`.

**Tech Stack:** React, Vite, Tailwind CSS, Vercel KV (Redis), Vercel Serverless Functions

**Spec:** `docs/superpowers/specs/2026-03-18-pausspel-highscore-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/highscoreClient.js` | Client helpers: `fetchHighscores(game, classId)`, `reportHighscore(game, studentId, name, score, classId)` |
| `src/components/student/GameOverScreen.jsx` | Shared game-over + celebration + highscore list UI |
| `src/components/teacher/sections/PauseGameHighscorePanel.jsx` | Teacher dashboard panel with Pong + Snake highscore columns |
| `api/highscores.js` | GET/POST endpoint for highscores in Vercel KV |

### Modified files
| File | Change |
|------|--------|
| `src/components/student/PongGame.jsx` | Replace difficulty curve with 4-phase piecewise ramp; use GameOverScreen |
| `src/components/student/SnakeGame.jsx` | Add time-based speed bonus; track gameStartTime; use GameOverScreen |
| `src/components/student/BreakGameOverlay.jsx` | Thread `studentId`, `studentName`, `classId` to games |
| `src/components/student/session/SessionOverlayRouter.jsx` | Pass `studentId`, `studentName`, `classId` to BreakGameOverlay |
| `src/components/student/session/sessionOverlayPropsBuilder.js` | Include `studentId`, `studentName`, `classId` in overlay props |
| `src/components/student/StudentSession.jsx` | Pass `profile.name`, `profile.classId` into overlay props builder |
| `api/teacher-class-extras.js` | Change to merge-write pattern (read existing → merge → save) |
| `src/components/teacher/Dashboard.jsx` | Import and render PauseGameHighscorePanel |

---

## Task 1: Pong difficulty curve

**Files:**
- Modify: `src/components/student/PongGame.jsx:1-23` (constants + getDifficultyFactor)

- [ ] **Step 1: Replace constants and getDifficultyFactor**

Replace lines 3-9 and the getDifficultyFactor function with a 4-phase piecewise curve:

```jsx
const PADDLE_HEIGHT = 88
const PADDLE_WIDTH = 12
const BALL_SIZE = 14
const PADDLE_SPEED = 8
const MAX_TIME = 120

// 4-phase difficulty: warmup → gradual → hard → impossible
function getPongDifficulty(elapsedSeconds) {
  const t = Math.min(elapsedSeconds / MAX_TIME, 1)
  if (t < 0.167) {        // 0-20s: warmup
    const p = t / 0.167
    return { aiSpeed: 0.30, ballSpeed: 3.0, maxSpeedX: 6.0 + p * 1.0, maxSpeedY: 5.0 + p * 0.5 }
  }
  if (t < 0.667) {        // 20-80s: gradual
    const p = (t - 0.167) / 0.5
    return { aiSpeed: 0.30 + p * 0.35, ballSpeed: 3.0 + p * 2.5, maxSpeedX: 7.0 + p * 2.5, maxSpeedY: 5.5 + p * 2.0 }
  }
  if (t < 0.917) {        // 80-110s: hard
    const p = (t - 0.667) / 0.25
    return { aiSpeed: 0.65 + p * 0.20, ballSpeed: 5.5 + p * 2.0, maxSpeedX: 9.5 + p * 2.5, maxSpeedY: 7.5 + p * 1.5 }
  }
  // 110-120s: impossible
  const p = (t - 0.917) / 0.083
  return { aiSpeed: 0.85 + p * 0.10, ballSpeed: 7.5 + p * 1.5, maxSpeedX: 12.0 + p * 2.0, maxSpeedY: 9.0 + p * 1.0 }
}
```

- [ ] **Step 2: Update game loop to use new difficulty function**

In the `update` function (line ~94), replace:
```jsx
const t = getDifficultyFactor()
const aiSpeedFactor = 0.38 + t * 0.40
```
with:
```jsx
const elapsed = (Date.now() - gameStartTimeRef.current) / 1000
const diff = getPongDifficulty(elapsed)
const aiSpeedFactor = diff.aiSpeed
```

Update reset speed (line ~155):
```jsx
const resetSpeed = diff.ballSpeed
```

Update max speed caps (lines ~166-167):
```jsx
const maxSpeedX = diff.maxSpeedX
const maxSpeedY = diff.maxSpeedY
```

Remove `INITIAL_BALL_SPEED`, `DIFFICULTY_RAMP_SECONDS` constants and `getDifficultyFactor` callback (no longer needed).

Update `initGame` to use initial ball speed of 3.0:
```jsx
dx: 3.0 * (Math.random() > 0.5 ? 1 : -1),
dy: 3.0 * (Math.random() - 0.5)
```

- [ ] **Step 3: Test manually**

Run `npm run dev`, play Pong. Verify:
- First 20s feels relaxed (slow AI, slow ball)
- 20-80s gradually harder
- 80s+ noticeably tough
- Last 10s near-impossible

- [ ] **Step 4: Commit**

```bash
git add src/components/student/PongGame.jsx
git commit -m "feat: 4-phase pong difficulty curve (warmup → gradual → hard → impossible)"
```

---

## Task 2: Snake time-based difficulty

**Files:**
- Modify: `src/components/student/SnakeGame.jsx:8-9` (constants), `~155-187` (step/animate), `~273-288` (game state)

- [ ] **Step 1: Lower MIN_TICK_MS and add time-based speed bonus**

Change constant (line 9):
```jsx
const MIN_TICK_MS = 70  // was 95 — lowered to allow combined time+fruit acceleration
```

Add `animateStartTime` when game loop initializes (line ~105). Set it right after creating game state:
```jsx
gameRef.current = createInitialGameState()
gameRef.current.animateStartTime = performance.now()
```

In the `animate` function (line ~189), before the while-loop, compute time bonus and apply it to effective tick:
```jsx
const game = gameRef.current
const elapsedSec = (performance.now() - game.animateStartTime) / 1000
// No time bonus first 20s, then linear ramp to 50ms bonus at 120s
const timeBonus = elapsedSec <= 20 ? 0 : Math.min(50, ((elapsedSec - 20) / 100) * 50)
const effectiveTick = Math.max(MIN_TICK_MS, game.tickMs - timeBonus)
game.elapsedMs += delta
while (game.elapsedMs >= effectiveTick && !gameOverRef.current) {
  game.elapsedMs -= effectiveTick
  step()
}
```

- [ ] **Step 2: Test manually**

Run `npm run dev`, play Snake. Verify:
- First 20s: normal speed (170ms base)
- 40s: slightly faster even without eating
- 90s+: noticeably fast
- Eating fruit still speeds up additionally

- [ ] **Step 3: Commit**

```bash
git add src/components/student/SnakeGame.jsx
git commit -m "feat: add time-based snake speed bonus on top of fruit acceleration"
```

---

## Task 3: Thread studentId/name/classId to games

**Files:**
- Modify: `src/components/student/StudentSession.jsx:264-292`
- Modify: `src/components/student/session/sessionOverlayPropsBuilder.js:1-78`
- Modify: `src/components/student/session/SessionOverlayRouter.jsx:9-44`
- Modify: `src/components/student/BreakGameOverlay.jsx:4-21`
- Modify: `src/components/student/PongGame.jsx:11` (props)
- Modify: `src/components/student/SnakeGame.jsx:12` (props)

- [ ] **Step 1: Add profile data to overlay props builder call**

In `StudentSession.jsx`, add to the `buildSessionOverlayProps` call (~line 264):
```jsx
studentName: profile.name,
classId: profile.classId || null,
```

- [ ] **Step 2: Pass through sessionOverlayPropsBuilder.js**

Add `studentName` and `classId` to the function params and return object.

In params: add `studentName, classId`
In return object: add `studentId, studentName, classId`

(Note: `studentId` is already in params but not returned — add it.)

- [ ] **Step 3: Pass through SessionOverlayRouter.jsx**

Add `studentId, studentName, classId` to the props destructure. Pass to `BreakGameOverlay`:
```jsx
<BreakGameOverlay
  activeBreakGame={activeBreakGame}
  onClose={onCloseBreakGame}
  studentId={studentId}
  studentName={studentName}
  classId={classId}
/>
```

- [ ] **Step 4: Pass through BreakGameOverlay.jsx**

Update to receive and forward props:
```jsx
function BreakGameOverlay({ activeBreakGame, onClose, studentId, studentName, classId }) {
  // ...
  {isPong ? (
    <PongGame onClose={() => onClose('pong')} studentId={studentId} studentName={studentName} classId={classId} />
  ) : (
    <SnakeGame onClose={() => onClose('snake')} studentId={studentId} studentName={studentName} classId={classId} />
  )}
}
```

- [ ] **Step 5: Update game component signatures**

PongGame: `function PongGame({ onClose, studentId, studentName, classId })`
SnakeGame: `function SnakeGame({ onClose, studentId, studentName, classId })`

(Props are accepted but unused until Task 5 — GameOverScreen.)

- [ ] **Step 6: Test manually**

Verify games still render and work. No visual changes expected.

- [ ] **Step 7: Commit**

```bash
git add src/components/student/StudentSession.jsx src/components/student/session/sessionOverlayPropsBuilder.js src/components/student/session/SessionOverlayRouter.jsx src/components/student/BreakGameOverlay.jsx src/components/student/PongGame.jsx src/components/student/SnakeGame.jsx
git commit -m "feat: thread studentId/name/classId from session to pause games"
```

---

## Task 4: Highscore API endpoint

**Files:**
- Create: `api/highscores.js`

- [ ] **Step 1: Create the endpoint**

```js
import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'

const MAX_ENTRIES = 7

function normalizeGroupKey(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase().replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function getHighscoreGroup(classId) {
  if (!classId) return null
  const extras = await kv.get(`class_extras:${classId}`)
  const raw = extras?.highscoreGroup
  return normalizeGroupKey(raw) || classId
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type, x-student-password'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const game = String(req.query?.game || '').trim()
    const classId = String(req.query?.classId || '').trim()
    if (!game || !classId) return res.status(400).json({ error: 'game and classId required' })
    if (game !== 'pong' && game !== 'snake') return res.status(400).json({ error: 'game must be pong or snake' })

    const group = await getHighscoreGroup(classId)
    if (!group) return res.status(200).json({ highscores: [] })

    const key = `highscores:${game}:${group}`
    const list = await kv.get(key)
    return res.status(200).json({ highscores: Array.isArray(list) ? list : [], group })
  }

  if (req.method === 'POST') {
    const { game, studentId, name, score, classId } = req.body || {}
    if (!game || !studentId || score == null || !classId) {
      return res.status(400).json({ error: 'game, studentId, score, classId required' })
    }
    if (game !== 'pong' && game !== 'snake') return res.status(400).json({ error: 'game must be pong or snake' })

    // Verify student auth
    const studentPassword = String(req.headers['x-student-password'] || '')
    if (!studentPassword) return res.status(401).json({ error: 'Unauthorized' })
    const profile = await kv.get(`student:${String(studentId).toUpperCase()}`)
    if (!profile?.auth) return res.status(401).json({ error: 'Student not found' })
    // Simple hash check — reuse same pattern as student API
    const { passwordHash, passwordSalt } = profile.auth
    if (passwordHash && passwordSalt) {
      const { createHash } = await import('node:crypto')
      const actual = createHash('sha256').update(`${passwordSalt}:${studentPassword}`).digest('hex')
      if (actual !== passwordHash) {
        // Try uppercase fallback
        const upper = studentPassword.toUpperCase()
        if (upper === studentPassword) return res.status(401).json({ error: 'Unauthorized' })
        const upperActual = createHash('sha256').update(`${passwordSalt}:${upper}`).digest('hex')
        if (upperActual !== passwordHash) return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    const group = await getHighscoreGroup(classId)
    if (!group) return res.status(400).json({ error: 'Could not resolve highscore group' })

    const key = `highscores:${game}:${group}`
    const current = (await kv.get(key)) || []
    const list = Array.isArray(current) ? current : []

    const numericScore = Number(score)
    const entry = {
      studentId: String(studentId).toUpperCase(),
      name: String(name || studentId).slice(0, 30),
      score: numericScore,
      timestamp: Date.now()
    }

    // If student already has a better or equal score, skip
    const existingBest = list.find(e => e.studentId === entry.studentId)
    if (existingBest && existingBest.score >= numericScore) {
      return res.status(200).json({ qualified: false, rank: null, highscores: list })
    }

    // Remove student's old entry (if any), add new, sort, trim
    const filtered = list.filter(e => e.studentId !== entry.studentId)
    filtered.push(entry)
    filtered.sort((a, b) => b.score - a.score)
    const trimmed = filtered.slice(0, MAX_ENTRIES)

    // Check if student made the cut
    if (!trimmed.some(e => e.studentId === entry.studentId)) {
      return res.status(200).json({ qualified: false, rank: null, highscores: list })
    }

    await kv.set(key, trimmed)
    const rank = trimmed.findIndex(e => e.studentId === entry.studentId) + 1
    return res.status(200).json({ qualified: true, rank, highscores: trimmed })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/highscores.js
git commit -m "feat: add GET/POST /api/highscores endpoint with class group support"
```

---

## Task 5: Highscore client library

**Files:**
- Create: `src/lib/highscoreClient.js`

- [ ] **Step 1: Create client helpers**

```js
import { getActiveStudentSessionSecret } from './storage'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchHighscores(game, classId) {
  if (!classId) return []
  try {
    const res = await fetch(`${API_BASE}/api/highscores?game=${game}&classId=${encodeURIComponent(classId)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.highscores || []
  } catch {
    return []
  }
}

export async function reportHighscore(game, studentId, name, score, classId) {
  if (!classId) return { qualified: false, rank: null, highscores: [] }
  try {
    const secret = getActiveStudentSessionSecret()
    const res = await fetch(`${API_BASE}/api/highscores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-student-password': secret } : {})
      },
      body: JSON.stringify({ game, studentId, name, score, classId })
    })
    if (!res.ok) return { qualified: false, rank: null, highscores: [] }
    return await res.json()
  } catch {
    return { qualified: false, rank: null, highscores: [] }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/highscoreClient.js
git commit -m "feat: add highscore client helpers (fetch + report)"
```

---

## Task 6: GameOverScreen component

**Files:**
- Create: `src/components/student/GameOverScreen.jsx`

- [ ] **Step 1: Create the shared game over component**

```jsx
import { useEffect, useState } from 'react'
import { reportHighscore, fetchHighscores } from '../../lib/highscoreClient'

const IMPRESSED_MIN_SNAKE_SCORE = 10

function GameOverScreen({ game, score, timeLeft, onClose, studentId, studentName, classId }) {
  const [highscores, setHighscores] = useState([])
  const [rank, setRank] = useState(null)
  const [loading, setLoading] = useState(true)

  const survived120 = timeLeft === 0
  const isImpressed = game === 'pong'
    ? survived120
    : survived120 && score >= IMPRESSED_MIN_SNAKE_SCORE

  useEffect(() => {
    let cancelled = false
    async function submit() {
      if (!classId) {
        setLoading(false)
        return
      }
      const result = await reportHighscore(game, studentId, studentName, score, classId)
      if (cancelled) return
      setHighscores(result.highscores || [])
      setRank(result.qualified ? result.rank : null)
      setLoading(false)
    }
    submit()
    return () => { cancelled = true }
  }, [game, score, studentId, studentName, classId])

  const isPong = game === 'pong'
  const scoreLabel = isPong ? `${score}s` : `${score} poäng`

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl z-10">
      <div className="bg-white rounded-2xl p-6 text-center mx-4 max-w-sm w-full">
        {isImpressed ? (
          <>
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-2xl font-bold mb-1 text-yellow-600">Ximon is impressed!</h2>
            <p className="text-gray-600 mb-3">Du klarade hela 2 minuter!</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1">
              {isPong ? (timeLeft === 0 ? 'Bra kämpat!' : 'Tid ute!') : (timeLeft > 0 ? 'Game Over!' : 'Tid ute!')}
            </h2>
            <p className="text-lg text-gray-700 mb-3">{scoreLabel}</p>
          </>
        )}

        {/* Highscore list */}
        {classId && !loading && highscores.length > 0 && (
          <div className="mb-4 text-left">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 text-center">
              {isPong ? 'Highscore — Pong' : 'Highscore — Snake'}
            </h3>
            <ol className="space-y-1">
              {highscores.map((entry, i) => {
                const isMe = entry.studentId === studentId
                return (
                  <li
                    key={entry.studentId}
                    className={`flex justify-between text-sm px-2 py-1 rounded ${
                      isMe ? 'bg-yellow-100 font-bold' : ''
                    }`}
                  >
                    <span>{i + 1}. {entry.name}</span>
                    <span className="text-gray-600">
                      {isPong ? `${entry.score}s` : entry.score}
                    </span>
                  </li>
                )
              })}
            </ol>
            {rank && (
              <p className="text-center text-sm text-yellow-600 font-semibold mt-2">
                Du är #{rank}!
              </p>
            )}
          </div>
        )}

        {loading && classId && (
          <p className="text-sm text-gray-400 mb-3">Laddar highscore...</p>
        )}

        <button
          onClick={onClose}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl w-full"
        >
          Tillbaka till matten
        </button>
      </div>
    </div>
  )
}

export default GameOverScreen
```

- [ ] **Step 2: Commit**

```bash
git add src/components/student/GameOverScreen.jsx
git commit -m "feat: shared GameOverScreen with highscore list and Ximon celebration"
```

---

## Task 7: Integrate GameOverScreen into Pong

**Files:**
- Modify: `src/components/student/PongGame.jsx:223-275`

- [ ] **Step 1: Import GameOverScreen and compute survival time**

Add import at top:
```jsx
import GameOverScreen from './GameOverScreen'
```

Add a `survivedSeconds` computed value. In the timer effect, when time runs out, record survival:
- The score for Pong highscore = elapsed seconds when game ends.
- Add state: `const [finalTime, setFinalTime] = useState(null)`
- When `gameOver` becomes true, compute: `setFinalTime(MAX_TIME - timeLeft)`
- Actually simpler: compute `MAX_TIME - timeLeft` at render time.

- [ ] **Step 2: Replace game over overlay**

Replace the existing game over JSX (lines 247-264):
```jsx
{gameOver && (
  <GameOverScreen
    game="pong"
    score={MAX_TIME - timeLeft}
    timeLeft={timeLeft}
    onClose={onClose}
    studentId={studentId}
    studentName={studentName}
    classId={classId}
  />
)}
```

- [ ] **Step 3: Test manually**

Play Pong to completion or let timer run out. Verify:
- Game over screen appears with score
- Highscore list loads (if cloud sync enabled and classId exists)
- "Ximon is impressed!" shows if 120s survived

- [ ] **Step 4: Commit**

```bash
git add src/components/student/PongGame.jsx
git commit -m "feat: integrate GameOverScreen into Pong with survival time score"
```

---

## Task 8: Integrate GameOverScreen into Snake

**Files:**
- Modify: `src/components/student/SnakeGame.jsx:245-268`

- [ ] **Step 1: Import GameOverScreen**

Add import at top:
```jsx
import GameOverScreen from './GameOverScreen'
```

- [ ] **Step 2: Replace game over overlay**

Replace the existing game over JSX (lines 245-259):
```jsx
{gameOver && (
  <GameOverScreen
    game="snake"
    score={score}
    timeLeft={timeLeft}
    onClose={onClose}
    studentId={studentId}
    studentName={studentName}
    classId={classId}
  />
)}
```

- [ ] **Step 3: Test manually**

Play Snake. Verify game over screen, highscore list, and "Ximon is impressed!" (if 120s + 10+ fruits).

- [ ] **Step 4: Commit**

```bash
git add src/components/student/SnakeGame.jsx
git commit -m "feat: integrate GameOverScreen into Snake with fruit score"
```

---

## Task 9: Merge-write for teacher-class-extras

**Files:**
- Modify: `api/teacher-class-extras.js:22-35`

- [ ] **Step 1: Change PUT handler to read-merge-write**

Replace the current write logic (line 34-35):
```js
// Old: await kv.set(`class_extras:${classId}`, { enabledExtras: extras })

// New: read-merge-write to preserve other fields (e.g. highscoreGroup)
const existing = (await kv.get(`class_extras:${classId}`)) || {}
const merged = { ...existing, enabledExtras: extras }
await kv.set(`class_extras:${classId}`, merged)
```

- [ ] **Step 2: Add support for highscoreGroup in the same endpoint**

After the `extras` parsing, add:
```js
const highscoreGroup = req.body?.highscoreGroup !== undefined
  ? String(req.body.highscoreGroup || '').trim()
  : undefined
```

In the merge:
```js
const merged = { ...existing, enabledExtras: extras }
if (highscoreGroup !== undefined) {
  merged.highscoreGroup = highscoreGroup || null  // empty string → null (removes grouping)
}
await kv.set(`class_extras:${classId}`, merged)
```

Also update the class record merge:
```js
if (classRecord) {
  const classUpdate = { ...classRecord, enabledExtras: extras }
  if (highscoreGroup !== undefined) classUpdate.highscoreGroup = highscoreGroup || null
  await kv.set(`class:${classId}`, classUpdate)
}
```

- [ ] **Step 3: Commit**

```bash
git add api/teacher-class-extras.js
git commit -m "fix: merge-write class_extras to preserve highscoreGroup + enabledExtras"
```

---

## Task 10: Teacher dashboard — PauseGameHighscorePanel

**Files:**
- Create: `src/components/teacher/sections/PauseGameHighscorePanel.jsx`

- [ ] **Step 1: Create the panel component**

```jsx
import { useEffect, useState } from 'react'
import CollapsibleSection from './CollapsibleSection'

const API_BASE = import.meta.env.VITE_API_URL || ''

function PauseGameHighscorePanel({ selectedClassId, teacherToken, teacherPassword }) {
  const [pongScores, setPongScores] = useState([])
  const [snakeScores, setSnakeScores] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedClassId) {
      setPongScores([])
      setSnakeScores([])
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetch(`${API_BASE}/api/highscores?game=pong&classId=${encodeURIComponent(selectedClassId)}`)
        .then(r => r.ok ? r.json() : { highscores: [] }).catch(() => ({ highscores: [] })),
      fetch(`${API_BASE}/api/highscores?game=snake&classId=${encodeURIComponent(selectedClassId)}`)
        .then(r => r.ok ? r.json() : { highscores: [] }).catch(() => ({ highscores: [] }))
    ]).then(([pong, snake]) => {
      if (cancelled) return
      setPongScores(pong.highscores || [])
      setSnakeScores(snake.highscores || [])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [selectedClassId])

  const renderList = (scores, unit) => {
    if (scores.length === 0) return <p className="text-gray-400 text-sm">Inga resultat ännu</p>
    return (
      <ol className="space-y-1">
        {scores.map((entry, i) => (
          <li key={entry.studentId} className="flex justify-between text-sm">
            <span>{i + 1}. {entry.name}</span>
            <span className="text-gray-500">{entry.score}{unit}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <CollapsibleSection title="Pausspel — Highscore" defaultOpen={false}>
      {loading ? (
        <p className="text-gray-400 text-sm">Laddar...</p>
      ) : !selectedClassId ? (
        <p className="text-gray-400 text-sm">Välj en klass</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Pong (tid)</h4>
            {renderList(pongScores, 's')}
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Snake (poäng)</h4>
            {renderList(snakeScores, '')}
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}

export default PauseGameHighscorePanel
```

- [ ] **Step 2: Commit**

```bash
git add src/components/teacher/sections/PauseGameHighscorePanel.jsx
git commit -m "feat: teacher dashboard PauseGameHighscorePanel component"
```

---

## Task 11: Add PauseGameHighscorePanel to Dashboard

**Files:**
- Modify: `src/components/teacher/Dashboard.jsx`

- [ ] **Step 1: Import the new panel**

Add import near top of file with other section imports:
```jsx
import PauseGameHighscorePanel from './sections/PauseGameHighscorePanel'
```

- [ ] **Step 2: Find where sections are rendered and add the panel**

Look for where other panels like `CloudSyncStatusPanel` are rendered. Add `PauseGameHighscorePanel` near the bottom of the dashboard sections, passing `selectedClassId` (the currently selected class filter).

Identify the correct prop name for the selected class by checking the existing filter state variable name.

- [ ] **Step 3: Test manually**

Open teacher dashboard, select a class, verify the "Pausspel — Highscore" section appears (collapsed by default). If highscores exist, they should show.

- [ ] **Step 4: Commit**

```bash
git add src/components/teacher/Dashboard.jsx
git commit -m "feat: add pause game highscore panel to teacher dashboard"
```

---

## Task 12: Highscore group setting in class management

**Files:**
- Find and modify: the class settings/extras UI component (likely in `ClassManagementPanel.jsx` or wherever `enabledExtras` is toggled)

- [ ] **Step 1: Locate the class extras UI**

Search for where `enabledExtras` or `teacher-class-extras` PUT is called from the frontend. Add a text input for "Highscore-grupp" near that UI.

- [ ] **Step 2: Add the highscoreGroup text field**

Add a text input with:
- Label: "Highscore-grupp"
- Placeholder: "Lämna tomt = egen lista"
- Value bound to the class's current `highscoreGroup`
- On save: include `highscoreGroup` in the PUT body alongside `enabledExtras`

- [ ] **Step 3: Test manually**

Set a highscore group on two different classes. Play pause games in both. Verify they share the same highscore list.

- [ ] **Step 4: Commit**

```bash
git add <modified-files>
git commit -m "feat: add highscoreGroup setting to class management UI"
```

---

## Task 13: Final integration test

- [ ] **Step 1: Full flow test**

1. Open the app as a student with a class
2. Play Pong — verify difficulty curve feels right
3. Let timer run out — verify GameOverScreen + highscore
4. Play Snake — verify time-based speed increase
5. Score well — verify highscore list updates
6. Open teacher dashboard — verify PauseGameHighscorePanel shows scores
7. Test with no classId (unassigned student) — verify graceful fallback

- [ ] **Step 2: Edge cases**

- Student without classId: game over shows score but no highscore list
- Empty highscore list: should show cleanly
- Multiple students: second student's score appears in same list

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for pause game highscores"
```
