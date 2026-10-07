import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadPlan, savePlan, saveCard, deriveEdges, validatePlan } from './project-map-store.mjs'
import { createMapServer } from './project-map-server.mjs'

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), 'project-map-'))
  try {
    const path = join(dir, 'plan.json')
    const plan = JSON.parse(await readFile(new URL('../docs/screening-map/plan.json', import.meta.url), 'utf8'))
    await writeFile(path, JSON.stringify(plan))
    await run(path, dir)
  } finally { await rm(dir, { recursive: true, force: true }) }
}
describe('Shared project map persistence', () => {
  it('merges a stale card edit with changes to another card and another field', async () => fixture(async path => {
    const first = await loadPlan(path)
    const base = structuredClone(first.plan.cards[0])
    const draft = structuredClone(base); draft.decision = 'Simons beslut'
    first.plan.cards[1].title = 'Agent updated another card'
    first.plan.cards[0].evidence = 'New verified evidence'
    await savePlan(path, first.plan, first.revision)
    const saved = await saveCard(path, base, draft)
    expect(saved.plan.cards[0].decision).toBe('Simons beslut')
    expect(saved.plan.cards[0].evidence).toBe('New verified evidence')
    expect(saved.plan.cards[1].title).toBe('Agent updated another card')
  }))
  it('preserves both drafts when the same field conflicts', async () => fixture(async path => {
    const first = await loadPlan(path)
    const base = structuredClone(first.plan.cards[0])
    const draft = structuredClone(base); draft.decision = 'User draft'
    first.plan.cards[0].decision = 'Other decision'
    const saved = await savePlan(path, first.plan, first.revision)
    await expect(saveCard(path, base, draft)).rejects.toMatchObject({ status: 409 })
    expect((await loadPlan(path)).revision).toBe(saved.revision)
    expect(draft.decision).toBe('User draft')
  }))
  it('preserves checkboxes, Unicode text and a backup; rejects an old full-plan overwrite', async () => fixture(async (path, dir) => {
    const first = await loadPlan(path)
    first.plan.cards[0].tasks = [{ id: 'review', text: 'Läs Simons ändringar', done: true }]
    first.plan.cards[0].decision += '\nSimon: behåll denna anteckning.'
    const saved = await savePlan(path, first.plan, first.revision)
    expect((await loadPlan(path)).plan.cards[0].tasks[0].done).toBe(true)
    expect(saved.revision).not.toBe(first.revision)
    const stale = structuredClone(first.plan); stale.cards[0].decision = 'Old replacement'
    await expect(savePlan(path, stale, first.revision)).rejects.toMatchObject({ status: 409 })
    expect((await loadPlan(path)).plan.cards[0].decision).toContain('Simon:')
    const backups = await readdir(join(dir, '.backups'))
    expect(backups).toHaveLength(1)
    expect(JSON.parse(await readFile(join(dir, '.backups', backups[0]), 'utf8')).cards[0].tasks).not.toEqual(first.plan.cards[0].tasks)
  }))
  it('allows only one competing writer and releases the lock', async () => fixture(async path => {
    const first = await loadPlan(path)
    const left = structuredClone(first.plan), right = structuredClone(first.plan)
    left.cards[0].title = 'Left'; right.cards[0].title = 'Right'
    const results = await Promise.allSettled([savePlan(path, left, first.revision), savePlan(path, right, first.revision)])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const fresh = await loadPlan(path)
    await expect(savePlan(path, fresh.plan, fresh.revision)).resolves.toBeTruthy()
  }))
  it('rejects broken and cyclic dependencies', async () => fixture(async path => {
    const { plan } = await loadPlan(path)
    plan.cards[0].requires = [plan.cards[1].id]; plan.cards[1].requires = [plan.cards[0].id]
    plan.edges = deriveEdges(plan.cards)
    expect(() => validatePlan(plan)).toThrow('Cykel')
    plan.cards[0].requires = ['missing']; plan.edges = deriveEdges(plan.cards)
    expect(() => validatePlan(plan)).toThrow('saknat')
  }))
  it('rejects cross-origin and uncredentialed writes; accepts explicit same-origin saving', async () => fixture(async path => {
    const server = createMapServer(path, 'test-token')
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const origin = `http://127.0.0.1:${server.address().port}`
      const first = await (await fetch(`${origin}/api/plan`)).json()
      const body = JSON.stringify({ ...first, baseRevision: first.revision })
      const post = headers => fetch(`${origin}/api/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body })
      expect((await post({ Origin: 'https://example.org', 'X-Plan-Token': 'test-token' })).status).toBe(403)
      expect((await post({ Origin: origin })).status).toBe(403)
      expect((await post({ Origin: origin, 'X-Plan-Token': 'test-token' })).status).toBe(200)
    } finally { await new Promise(resolve => server.close(resolve)) }
  }))
})
