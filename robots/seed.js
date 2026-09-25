// Control endpoints for the robots: reset the in-memory database, create a
// class with pupils (code name + PIN), and read back what the server stored.
import { kv } from '@vercel/kv'
import { createPilotStudentAuth, createQrSecret, reserveStudentLoginCode } from '../api/_studentSession.js'
import { createStudentRecord } from '../api/_studentStore.js'
import { hashTeacherPassword } from '../api/_helpers.js'
import { ALL_OPERATIONS } from '../src/lib/operations.js'

export const ROBOT_CLASS_ID = 'robot-klass'
export const ROBOT_PIN = '2468'
export const ROBOT_TEACHER_PASSWORD = 'robot-larare-losen'

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
  if (action === 'reset') { kv._reset(); return { ok: true } }
  if (action === 'seed') {
    const operations = Array.isArray(body.operations) ? body.operations : ALL_OPERATIONS
    const classId = String(body.classId || ROBOT_CLASS_ID)
    if (body.operations || !(await kv.get(`class:${classId}`))) {
      await kv.set(`class:${classId}`, { id: classId, name: String(body.className || classId), grade: 4, teacherIds: ['robot-teacher'], enabledExtras: [], enabledOperations: operations, serverRevision: 1 })
      await kv.sadd('classes:index', classId)
    }
    const pupils = []
    for (const name of body.pupils || ['Robot Ett']) {
      const studentId = Buffer.from(name).toString('hex').toUpperCase().padEnd(32, '0').slice(0, 32)
      const loginCode = await reserveStudentLoginCode(studentId, () => name)
      const className = (await kv.get(`class:${classId}`))?.name || classId
      await createStudentRecord(studentId, emptyPupil(studentId, loginCode, classId, className))
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
      classIds, role: 'teacher', sessionVersion: 1
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
