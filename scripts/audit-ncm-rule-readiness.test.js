import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { auditRuleReadiness } from './audit-ncm-rule-readiness.mjs'

const sha256 = text => createHash('sha256').update(text).digest('hex')

function createAuditFixture(sourceText) {
  const root = mkdtempSync(join(tmpdir(), 'ncm-audit-'))
  mkdirSync(join(root, 'docs'), { recursive: true })
  const coverage = JSON.parse(readFileSync('docs/NCM_DIDACTIC_COVERAGE.json', 'utf8'))
  coverage.source.path = 'docs/reference.md'
  coverage.source.sha256 = sha256(sourceText.replace(/\r\n?/g, '\n'))
  coverage.codeSignals = []
  writeFileSync(join(root, 'docs/NCM_DIDACTIC_COVERAGE.json'), JSON.stringify(coverage, null, 2))
  writeFileSync(join(root, coverage.source.path), sourceText)
  return root
}

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

  it('accepts LF and CRLF checkouts of the same reference, while rejecting changed content', () => {
    const lf = '# Reference\nLine two\n'
    const lfRoot = createAuditFixture(lf)
    const crlfRoot = createAuditFixture(lf.replace(/\n/g, '\r\n'))
    try {
      expect(auditRuleReadiness(crlfRoot)).toEqual(auditRuleReadiness(lfRoot))

      writeFileSync(join(crlfRoot, 'docs/reference.md'), lf.replace(/\n/g, '\r\n') + 'Changed\r\n')
      expect(() => auditRuleReadiness(crlfRoot)).toThrow('NCM reference changed')
    } finally {
      rmSync(lfRoot, { recursive: true, force: true })
      rmSync(crlfRoot, { recursive: true, force: true })
    }
  })
})
