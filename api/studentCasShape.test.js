import { expect, it, vi } from 'vitest'
import { STUDENT_CAS_SCRIPT, mutateStudentRecord } from './_studentStore.js'

// A 4 MB profile decoded twice in Lua exceeded the database's script time limit
// (2026-11-16). The script reads the revision from the start of the stored text
// and the class ids from their own argument, so neither profile is decoded.
it('writes serverRevision first and passes class ids apart from the record', async () => {
  const current = { name: 'Elev', classIds: ['c1'], serverRevision: 7, serverUpdatedAt: 1 }
  const store = { exists: vi.fn(async () => 0), get: vi.fn(async () => current), del: vi.fn(), eval: vi.fn(async () => 1) }
  await mutateStudentRecord('a', profile => ({ ...profile, classIds: ['c1', 'c2'] }), { store })
  const [script, , args] = store.eval.mock.calls[0]
  expect(script).toBe(STUDENT_CAS_SCRIPT)
  expect(args[0]).toBe(7)
  expect(args[2].startsWith('{"serverRevision":8,')).toBe(true)
  expect(JSON.parse(args[2])).toMatchObject({ name: 'Elev', serverRevision: 8, studentId: 'A' })
  expect(JSON.parse(args[4])).toEqual(['c1', 'c2'])
  expect(STUDENT_CAS_SCRIPT).not.toContain('cjson.decode(ARGV[3])')
})
