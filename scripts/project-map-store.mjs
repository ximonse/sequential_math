import { readFile, open, mkdir, writeFile, rename, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'

export const statuses = ['Beslutat', 'Byggt', 'Föreslaget', 'Planerat', 'Saknas', 'Lokalt klart', 'Beslut behövs', 'Senare']
export const revisionOf = text => createHash('sha256').update(text).digest('hex')
export function deriveEdges(cards) {
  return cards.flatMap(c => [
    ...c.requires.map(source => ({ source, target: c.id, kind: 'kräver' })),
    ...c.affects.map(target => ({ source: c.id, target, kind: 'påverkar' })),
  ])
}
export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.cards) || !plan.cards.length || plan.cards.length > 500) throw Error('Ogiltig kortlista')
  for (const field of ['title', 'date', 'note']) if (typeof plan[field] !== 'string') throw Error(`Saknar ${field}`)
  const ids = new Set()
  for (const c of plan.cards) {
    if (!/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id)) throw Error('Ogiltigt eller dubblerat kort-ID')
    ids.add(c.id)
    for (const field of ['area', 'title', 'status', 'purpose', 'next', 'acceptance', 'decision', 'evidence', 'issue', 'kind']) {
      if (typeof c[field] !== 'string' || c[field].length > 12000) throw Error(`Ogiltigt ${field} på ${c.id}`)
    }
    if (!c.title.trim() || !c.area.trim() || !statuses.includes(c.status)) throw Error('Rubrik, område eller status är ogiltig')
    if (c.issue && !/^https:\/\/github\.com\/ximonse\/sequential_math\/issues\/\d+$/.test(c.issue)) throw Error('Ogiltig issue-länk')
    for (const field of ['requires', 'affects']) if (!Array.isArray(c[field]) || new Set(c[field]).size !== c[field].length) throw Error('Ogiltiga relationer')
    if (c.tasks !== undefined) {
      if (!Array.isArray(c.tasks) || c.tasks.length > 100) throw Error('Ogiltiga deluppgifter')
      const taskIds = new Set()
      for (const t of c.tasks) {
        if (typeof t.id !== 'string' || taskIds.has(t.id) || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 2000 || typeof t.done !== 'boolean') throw Error('Ogiltig deluppgift')
        taskIds.add(t.id)
      }
    }
  }
  for (const c of plan.cards) for (const id of [...c.requires, ...c.affects]) if (!ids.has(id) || id === c.id) throw Error('Relation pekar på saknat kort eller sig själv')
  const visited = new Set(), visiting = new Set(), byId = new Map(plan.cards.map(c => [c.id, c]))
  const visit = id => {
    if (visiting.has(id)) throw Error('Cykel bland krav')
    if (visited.has(id)) return
    visiting.add(id); byId.get(id).requires.forEach(visit); visiting.delete(id); visited.add(id)
  }
  plan.cards.forEach(c => visit(c.id))
  if (JSON.stringify(plan.edges) !== JSON.stringify(deriveEdges(plan.cards))) throw Error('Relationslistan stämmer inte med korten')
  return plan
}
export async function loadPlan(path) {
  const text = await readFile(path, 'utf8')
  return { plan: validatePlan(JSON.parse(text)), revision: revisionOf(text) }
}
export function mergeCard(base, draft, current) {
  if (!base || !draft || !current || base.id !== draft.id || base.id !== current.id) throw Object.assign(Error('Kortet saknas eller har bytt identitet.'), { status: 409 })
  const merged = structuredClone(current)
  const allowed = ['title', 'area', 'status', 'purpose', 'next', 'acceptance', 'decision', 'evidence', 'issue', 'kind', 'requires', 'affects', 'tasks']
  for (const field of allowed) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    if (same(base[field], draft[field])) continue
    if (!same(current[field], base[field]) && !same(current[field], draft[field])) {
      throw Object.assign(Error(`Samma fält har ändrats av någon annan: ${field}. Ditt utkast finns kvar.`), { status: 409 })
    }
    merged[field] = structuredClone(draft[field])
  }
  return merged
}
export async function saveCard(path, base, draft) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const latest = await loadPlan(path)
    const index = latest.plan.cards.findIndex(c => c.id === base?.id)
    latest.plan.cards[index] = mergeCard(base, draft, latest.plan.cards[index])
    latest.plan.edges = deriveEdges(latest.plan.cards)
    try { return await savePlan(path, latest.plan, latest.revision) }
    catch (error) { if (error.status !== 409 || attempt === 3) throw error }
  }
}
export async function savePlan(path, plan, baseRevision) {
  validatePlan(plan)
  const lockPath = `${path}.lock`, tempPath = `${path}.${randomUUID()}.tmp`
  let lock
  try { lock = await open(lockPath, 'wx') } catch { throw Object.assign(Error('Planfilen används av en annan skrivning. Försök igen.'), { status: 409 }) }
  try {
    const currentText = await readFile(path, 'utf8')
    if (revisionOf(currentText) !== baseRevision) throw Object.assign(Error('Planen har ändrats. Ditt utkast finns kvar; läs senaste innan du försöker igen.'), { status: 409 })
    const backupDir = join(dirname(path), '.backups')
    await mkdir(backupDir, { recursive: true })
    await writeFile(join(backupDir, `${Date.now()}-${randomUUID()}.json`), currentText, { flag: 'wx' })
    const text = `${JSON.stringify(plan, null, 2)}\n`
    const temp = await open(tempPath, 'wx')
    try { await temp.writeFile(text); await temp.sync() } finally { await temp.close() }
    await rename(tempPath, path)
    return { plan, revision: revisionOf(text) }
  } finally {
    await unlink(tempPath).catch(() => {})
    await lock.close()
    await unlink(lockPath)
  }
}
