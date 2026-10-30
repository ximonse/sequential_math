import { test } from 'node:test'
import assert from 'node:assert/strict'
import { report } from '../src/schemas.mjs'

const base = { schemaVersion: 1, snapshotRevision: 'a'.repeat(64), scopeSv: 'Syntetisk period',
  provenance: { kind: 'ai', instructionVersion: 'synthetic-check-v1' }, strengths: [], limitationsSv: [] }
const hypothesis = { id: 'h1', textSv: 'Beräknad kandidat', basis: 'rule_candidate', signalCode: 'smaller_minus_larger',
  supportRefs: ['r1'], counterRefs: [], alternativesSv: ['Annan förklaring'], nextCheckSv: 'Särskiljande fråga' }

test('MCP report schema keeps a rule candidate ruleVersion for server validation', () => {
  const parsed = report.parse({ ...base, hypotheses: [{ ...hypothesis, ruleVersion: 'predictable-errors-v1' }] })
  assert.equal(parsed.hypotheses[0].ruleVersion, 'predictable-errors-v1')
  assert.throws(() => report.parse({ ...base, hypotheses: [{ ...hypothesis, ruleVersion: '' }] }))
})
