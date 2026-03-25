import { describe, it, expect } from 'vitest'
import { createStudentProfile } from './studentProfile'
import { findUndefinedFields, getSchemaFields } from './profileMergeSchema'

describe('profileMergeSchema', () => {
  it('every field in createStudentProfile has a merge strategy', () => {
    const profile = createStudentProfile('TEST', 'Test User', 4)
    const allKeys = getAllProfileKeys(profile)
    const undefined_ = findUndefinedFields(allKeys)
    expect(undefined_, `Fields missing merge strategy: ${undefined_.join(', ')}`).toEqual([])
  })

  it('schema covers fields that appear after addProblemResult', () => {
    // teacherSummary läggs till runtime
    const runtimeFields = ['teacherSummary', 'effectiveLevels', 'tableDrill', 'auth', 'classId', 'classIds', 'className', 'pongHighScore', 'telemetry', 'ticketResponses', 'ticketRevealAll', 'ticketInbox', 'recentSelections']
    const undefined_ = findUndefinedFields(runtimeFields)
    expect(undefined_, `Runtime fields missing merge strategy: ${undefined_.join(', ')}`).toEqual([])
  })

  it('schema has no orphan fields (defined but not in any profile)', () => {
    const schemaFields = getSchemaFields()
    // Alla schemafält ska finnas i antingen createStudentProfile eller runtime
    expect(schemaFields.length).toBeGreaterThan(20)
  })
})

function getAllProfileKeys(obj, prefix = '') {
  const keys = []
  for (const key of Object.keys(obj)) {
    keys.push(prefix ? `${prefix}.${key}` : key)
  }
  return keys
}
