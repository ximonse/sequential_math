import { describe, expect, it } from 'vitest'
import { collectLegacyBusinessStorage } from './legacyClientStorageExport'

function createStorage(records) {
  const entries = Object.entries(records)
  return {
    get length() { return entries.length },
    key(index) { return entries[index]?.[0] ?? null },
    getItem(key) { return Object.hasOwn(records, key) ? records[key] : null }
  }
}

describe('legacy client storage export', () => {
  it('exports business records but excludes UI preferences', () => {
    const exported = collectLegacyBusinessStorage(createStorage({
      mathapp_classes_v1: '[{"id":"class_6a"}]',
      mathapp_student_SIMON: '{"studentId":"SIMON"}',
      mathapp_ticket_templates_v1: '[{"id":"ticket_1"}]',
      mathapp_theme: 'dark',
      unrelated: 'keep out'
    }))

    expect(Object.keys(exported.records).sort()).toEqual([
      'mathapp_classes_v1',
      'mathapp_student_SIMON',
      'mathapp_ticket_templates_v1'
    ])
  })
})
