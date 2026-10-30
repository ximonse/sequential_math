import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { auditRuleReadiness } from './audit-ncm-rule-readiness.mjs'

describe('common NCM rule readiness audit', () => {
  it('accounts for all six domains and every original signal, without treating generic labels as models', () => {
    const audit = auditRuleReadiness()
    const source = JSON.parse(readFileSync('docs/NCM_DIDACTIC_COVERAGE.json'))
    expect(audit.domains).toHaveLength(6)
    const signals = audit.domains.flatMap(d => d.signals)
    expect(signals.map(s => s.file + ':' + s.signal).sort()).toEqual(source.codeSignals.map(s => s.file + ':' + s.signal).sort())
    for (const id of ['percentage', 'arithmetic_expressions', 'number_fluency']) {
      expect(audit.domains.find(d => d.id === id).signals.every(s => s.kind === 'generic' || s.kind === 'input')).toBe(true)
    }
  })
  it('retains every original NCM group and all 126 codes with a source pointer', () => {
    const audit = auditRuleReadiness()
    const source = JSON.parse(readFileSync('docs/NCM_DIDACTIC_COVERAGE.json'))
    for (const [group, entries] of Object.entries(audit.inventory)) {
      expect(entries).toHaveLength(source[group].length)
      expect(entries.every((e, i) => e.ref.endsWith(`/${group}/${i}`))).toBe(true)
    }
    expect(audit.inventory.catalogueCodes).toHaveLength(126)
    expect(audit.inventory.mappings).toHaveLength(30)
    expect(audit.untouchedProduction).toBe(true)
  })
})
