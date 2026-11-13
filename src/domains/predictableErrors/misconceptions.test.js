import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR_MODELS } from './catalog.js'
import { MISCONCEPTION_EVIDENCE, MISCONCEPTION_STATUSES, MISCONCEPTIONS, MODELS_WITHOUT_MISCONCEPTION,
  NOT_A_MISCONCEPTION_REASONS, misconceptionsForModel } from './misconceptions.js'
import coverage from '../../../docs/NCM_DIDACTIC_COVERAGE.json' with { type: 'json' }
import register from '../../../docs/misconceptions/source-register.json' with { type: 'json' }

// Step 1b in docs/STYRNING_FELFORSTAELSER.md: every error model says which
// misconception it can be evidence for, or why it is not one; every row in
// Simon's source tables has an outcome; nothing unreviewed reaches teachers.
const ids = Object.keys(MISCONCEPTIONS)
const linked = new Set(ids.flatMap(id => MISCONCEPTIONS[id].errorModels.map(link => link.id)))
const required = ['status', 'fieldsFrom', 'areaSv', 'titleSv', 'typicalSv', 'logicSv', 'focusSv', 'criticalAspectSv', 'variationSv', 'evidence']

describe('misconceptions behind the error models', () => {
  it('links every error model to a misconception or gives a reason why not', () => {
    expect(Object.keys(ERROR_MODELS).filter(id => !linked.has(id) && !MODELS_WITHOUT_MISCONCEPTION[id])).toEqual([])
    for (const [id, entry] of Object.entries(MODELS_WITHOUT_MISCONCEPTION)) {
      expect(ERROR_MODELS[id], id).toBeTruthy()
      expect(NOT_A_MISCONCEPTION_REASONS, id).toContain(entry.reason)
    }
  })

  it('names only existing models and says whether a source or the agent made the link', () => {
    for (const id of ids) for (const link of MISCONCEPTIONS[id].errorModels) {
      expect(ERROR_MODELS[link.id], `${id}: ${link.id}`).toBeTruthy()
      expect(['source', 'agent', 'simon_observation'], `${id}: ${link.id}`).toContain(link.basis)
      expect(link.noteSv?.trim(), `${id}: ${link.id}`).toBeTruthy()
    }
  })

  it('gives every misconception the cluster fields, a status and known NCM codes', () => {
    // NCM's diagnosis catalogue, as inventoried in docs/NCM_DIDACTIC_COVERAGE.json.
    const codes = new Set(coverage.catalogueCodes.map(entry => entry.code.toUpperCase()))
    for (const id of ids) {
      const m = MISCONCEPTIONS[id]
      for (const key of required) expect(String(m[key] ?? '').trim(), `${id}.${key}`).toBeTruthy()
      expect(MISCONCEPTION_STATUSES, id).toContain(m.status)
      expect(MISCONCEPTION_EVIDENCE, id).toContain(m.evidence)
      for (const code of m.ncm) expect(codes.has(code.toUpperCase()), `${id}: ${code}`).toBe(true)
    }
  })

  it('accounts for every row in the source tables', () => {
    for (const row of register.rows) {
      const outcome = row.outcome
      const valid = outcome === 'header' || MISCONCEPTIONS[outcome] || (outcome.startsWith('out:') && register.outOfScope[outcome.slice(4)])
      expect(valid, `${row.id}: ${outcome}`).toBeTruthy()
    }
    for (const id of ids) {
      const from = MISCONCEPTIONS[id].fieldsFrom
      if (from !== 'agent') expect(register.rows.find(row => row.id === from)?.outcome, id).toBe(id)
    }
  })

  it('shows teachers nothing that is still awaiting review', () => {
    const pending = ids.filter(id => MISCONCEPTIONS[id].status !== 'approved')
    for (const id of pending) for (const link of MISCONCEPTIONS[id].errorModels) {
      expect(misconceptionsForModel(link.id).some(m => m.id === id), `${id} via ${link.id}`).toBe(false)
    }
    const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])
    const views = walk(join(process.cwd(), 'src/components')).filter(file => /\.(?:jsx?|mjs)$/u.test(file))
    // Views must go through misconceptionsForModel, which reads approved entries only.
    for (const file of views) expect(readFileSync(file, 'utf8'), file).not.toMatch(/MISCONCEPTIONS\b|includePending/u)
  })
})
