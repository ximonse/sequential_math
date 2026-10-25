import { kv } from '@vercel/kv'
import { persistStudentEvents } from '../api/student/[studentId]/events.js'
import { ATTENTION_DEMO_PROFILES, attentionDemoHistory } from './lib/attentionDemoData.js'

export async function seedAttentionDemo(control) {
  const existing = await kv.get('robot:attention-demo')
  if (existing) return existing
  const classId = 'focus-demo-varied'
  const seeded = await control('seed', { classId, className: 'Fokusdemo · påhittade resultat',
    operations: ['addition'], pupils: ATTENTION_DEMO_PROFILES.map(profile => profile.name) })
  const now = Date.now()
  let count = 0
  for (const [index, pupil] of seeded.pupils.entries()) {
    const history = attentionDemoHistory(ATTENTION_DEMO_PROFILES[index], index, now)
    for (let offset = 0; offset < history.length; offset += 12) {
      const entries = history.slice(offset, offset + 12).map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload }))
      await persistStudentEvents(pupil.studentId, entries, async () => {})
    }
    count += history.length
  }
  const teacher = await control('teacher', { id: 'focus-demo-admin', classIds: [classId], role: 'super_admin', displayName: 'Fokusdemo · testkonto' })
  const result = { ok: true, classId, pupils: seeded.pupils, teacher, count, profiles: ATTENTION_DEMO_PROFILES, seededAt: now }
  await kv.set('robot:attention-demo', result)
  return result
}
