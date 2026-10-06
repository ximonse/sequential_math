// Control endpoints for the robots: reset the in-memory database, create a
// class with pupils (code name + PIN), and read back what the server stored.
import { kv } from '@vercel/kv'
import { createPilotStudentAuth, createQrSecret, reserveStudentLoginCode } from '../api/_studentSession.js'
import { createStudentRecord } from '../api/_studentStore.js'
import { hashTeacherPassword } from '../api/_helpers.js'
import { ALL_OPERATIONS } from '../src/lib/operations.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import diagnosticManifest from '../src/domains/arithmetic/diagnosticTasks.v1.json'

export const ROBOT_CLASS_ID = 'robot-klass'
export const ROBOT_PIN = '2468'
export const ROBOT_TEACHER_PASSWORD = 'robot-larare-losen'

const DAY_MS = 24 * 60 * 60 * 1000

// Synthetic history fixture for the table-progress robot. Keep this independent
// of app/profile helpers so it exercises the exact persisted server shape.
function makeTableDrillHistory(studentId, classId, {
  currentAttempts = 20,
  currentCorrect = 16,
  previousAttempts = 20,
  previousCorrect = 10,
  noiseAttempts = 251,
  noiseTable = 8
} = {}) {
  const now = Date.now()
  let sequence = 0
  const makeResult = (table, timestamp, correct) => {
    const factor = (sequence % 10) + 1
    const a = table
    const b = factor
    const problemId = `robot-table-history-${studentId}-${sequence}`
    const result = {
      observationId: `${problemId}:${timestamp}`,
      problemId,
      classIdAtAttempt: classId,
      domain: 'arithmetic',
      skill: 'multiplication',
      contentSkill: 'multiplication',
      evidenceSkill: `mul_table_${table}`,
      evidenceClass: 'practice_only',
      trainingMode: 'table_drill',
      trainingContext: {
        version: 1,
        frameId: `robot-table-history-${studentId}`,
        mode: 'table_drill',
        source: 'student_focus',
        assignmentId: '',
        assignmentKind: '',
        allowedSkills: ['multiplication'],
        levelRange: null,
        tableSet: [table],
        progressionMode: 'challenge'
      },
      operation: 'multiplication',
      level: 4,
      problemType: 'mul_table_drill',
      values: { a, b },
      correctAnswer: a * b,
      studentAnswer: correct ? a * b : a * b + 1,
      correct,
      errorCategory: correct ? 'none' : 'knowledge',
      timeSpent: 3,
      speedTimeSec: 3,
      timestamp,
      difficulty: { conceptual_level: 4 },
      skillTag: `mul_table_${table}`
    }
    sequence += 1
    return result
  }

  const rows = []
  for (let i = 0; i < previousAttempts; i += 1) {
    rows.push(makeResult(7, now - (10 * DAY_MS) + i * 1000, i < previousCorrect))
  }
  for (let i = 0; i < currentAttempts; i += 1) {
    rows.push(makeResult(7, now - (2 * DAY_MS) + i * 1000, i < currentCorrect))
  }
  for (let i = 0; i < noiseAttempts; i += 1) {
    rows.push(makeResult(noiseTable, now - DAY_MS + i * 1000, i % 2 === 0))
  }

  return rows
}

function emptyPupil(studentId, displayAlias, classId, className = classId) {
  const now = Date.now()
  return {
    profileSchemaVersion: 1, studentId, displayAlias, grade: 4, created_at: now,
    currentDifficulty: 1, highestDifficulty: 1,
    adaptive: { skillStates: {}, recentSelections: [] },
    activity: { page: 'unknown', inFocus: false, lastPresenceAt: 0, lastInteractionAt: 0, visibilityState: 'hidden', createdAt: now },
    masteryFacts: { version: 1, facts: [], revokedIds: [] },
    recentProblems: [], problemLog: [],
    stats: { totalProblems: 0, correctAnswers: 0, overallSuccessRate: 0, avgTimePerProblem: 0, typeStats: {}, weakestTypes: [], strongestTypes: [], lifetimeProblems: 0, lifetimeCorrectAnswers: 0, lifetimeTimeSpent: 0, lifetimeSpeedSamples: 0, lifetimeSpeedTimeSpent: 0, avgSpeedTimePerProblem: 0 },
    classId, classIds: [classId], className,
    enrollmentKey: `robot-${studentId}`,
    auth: createPilotStudentAuth({ qrSecret: createQrSecret(), pin: ROBOT_PIN })
  }
}

export async function handleControl(action, body = {}) {
  if (action === 'seed-pupil-lifecycle') {
    const studentId = String(body.studentId)
    const profile = await kv.get(`student:${studentId}`)
    if (!profile) return { ok: false }
    const task = diagnosticManifest.tasks[0]
    const attemptId = `retire-${studentId}`
    const assignmentId = `retire-assignment-${studentId}`
    const itemId = `retire-item-${studentId}`
    const grid = recordDiagnosticGridEvent(createDiagnosticGrid({ attemptId, taskId: task.taskId,
      taskVersion: task.taskVersion }), { type: 'answer_change', before: '', after: '699' }, Date.now())
    await kv.set(`diagnostic_assignment:${assignmentId}`, { assignmentId, classId: profile.classId,
      studentIds: [studentId], items: [{ assignmentItemId: itemId, taskSnapshot: task }] })
    await kv.set(`diagnostic_attempt:${attemptId}`, { attemptId, studentId, assignmentId, assignmentItemId: itemId,
      taskId: task.taskId, taskVersion: task.taskVersion, serverRevision: 1, lastSequence: 1,
      evidenceClass: 'diagnostic_only', status: 'in_progress', grid: { ...grid, events: [] }, createdAt: Date.now() })
    await kv.set(`diagnostic_attempt_events:${attemptId}`, grid.events)
    await kv.set(`diagnostic_active:${studentId}:${itemId}`, attemptId)
    await kv.set(`student:${studentId}`, { ...profile, name: 'Private retirement name', preferredName: 'Private retirement name',
      problemLog: [{ timestamp: Date.now(), correct: true, operation: 'addition', studentAnswer: 4, correctAnswer: 4 }],
      stats: { ...profile.stats, totalProblems: 1, lifetimeProblems: 1, correctAnswers: 1 } })
    return { ok: true, attemptId, assignmentId }
  }
  if (action === 'inspect-pupil-lifecycle') {
    return { profileExists: Boolean(await kv.get(`student:${body.studentId}`)),
      attemptExists: Boolean(await kv.get(`diagnostic_attempt:${body.attemptId}`)),
      eventsExist: Boolean(await kv.get(`diagnostic_attempt_events:${body.attemptId}`)),
      assignmentExists: Boolean(await kv.get(`diagnostic_assignment:${body.assignmentId}`)) }
  }
  if (action === 'reset') { kv._reset(); return { ok: true } }
  if (action === 'seed') {
    const operations = Array.isArray(body.operations) ? body.operations : ALL_OPERATIONS
    const classId = String(body.classId || ROBOT_CLASS_ID)
    if (body.operations || !(await kv.get(`class:${classId}`))) {
      await kv.set(`class:${classId}`, { id: classId, name: String(body.className || classId), grade: 4, teacherIds: ['robot-teacher'], enabledExtras: [], enabledOperations: operations, serverRevision: 1 })
      await kv.sadd('classes:index', classId)
    }
    const pupils = []
    for (const [index, name] of (body.pupils || ['Robot Ett']).entries()) {
      const studentId = Buffer.from(name).toString('hex').toUpperCase().padEnd(32, '0').slice(0, 32)
      const loginCode = await reserveStudentLoginCode(studentId, () => name)
      const className = (await kv.get(`class:${classId}`))?.name || classId
      const profile = emptyPupil(studentId, loginCode, classId, className)
      if (body.creationNames?.[index]) profile.name = String(body.creationNames[index])
      await createStudentRecord(studentId, profile)
      await kv.sadd(`class_students:${classId}`, studentId)
      pupils.push({ studentId, loginCode, pin: ROBOT_PIN, classId })
    }
    return { ok: true, classId, pupils }
  }
  if (action === 'teacher') {
    const id = String(body.id || 'robot-larare')
    const classIds = Array.isArray(body.classIds) ? body.classIds : []
    const { hash, salt, scheme } = hashTeacherPassword(ROBOT_TEACHER_PASSWORD)
    await kv.set(`teacher_account:${id}`, {
      id, username: id, displayName: body.displayName || 'Robotläraren',
      passwordHash: hash, passwordSalt: salt, passwordScheme: scheme,
      classIds, role: body.role === 'super_admin' ? 'super_admin' : 'teacher', sessionVersion: 1
    })
    await kv.sadd('teacher_accounts:index', id)
    for (const classId of classIds) {
      const record = await kv.get(`class:${classId}`)
      if (record) await kv.set(`class:${classId}`, { ...record, teacherIds: [...new Set([...(record.teacherIds || []), id])] })
    }
    return { ok: true, username: id, password: ROBOT_TEACHER_PASSWORD, classIds }
  }
  if (action === 'student') {
    const profile = await kv.get(`student:${String(body.studentId || '').toUpperCase()}`)
    if (profile) delete profile.auth
    return { ok: Boolean(profile), profile }
  }
  if (action === 'seed-table-progress') {
    const seeded = []
    for (const fixture of Array.isArray(body.students) ? body.students : []) {
      const studentId = String(fixture?.studentId || '').trim().toUpperCase()
      const profile = await kv.get(`student:${studentId}`)
      if (!profile) return { ok: false, error: `Unknown synthetic student ${studentId}` }
      const rows = makeTableDrillHistory(studentId, String(profile.classId || ''), fixture)
      await kv.set(`student:${studentId}`, {
        ...profile,
        problemLog: rows,
        stats: { ...profile.stats, lifetimeProblems: rows.length },
        recentProblems: rows.slice(-250)
      })
      seeded.push({ studentId, problemLogCount: rows.length, recentProblemsCount: Math.min(rows.length, 250) })
    }
    return { ok: true, students: seeded }
  }
  if (action === 'verify') {
    const registry = await import('../src/domains/registry.js')
    const problem = body.problem || {}
    const domain = registry.getDomain(problem.domain) || registry.getDomainForSkill(problem.skill)
    if (!domain?.verifyContent) return { valid: true, skipped: true }
    try { return domain.verifyContent(problem) } catch (error) { return { valid: false, reason: String(error?.message || error) } }
  }
  if (action === 'class-operations') {
    const record = await kv.get(`class:${ROBOT_CLASS_ID}`)
    await kv.set(`class:${ROBOT_CLASS_ID}`, { ...record, enabledOperations: body.operations })
    return { ok: true }
  }
  return { ok: false, error: `unknown action ${action}` }
}
