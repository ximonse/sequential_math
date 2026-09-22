import { kv } from '@vercel/kv'
import { normalizeClassName } from './_classStore.js'
import { studentStoreError } from './_studentStore.js'

export const CLASS_ROLLOVER_CAS_SCRIPT = `
local expected = cjson.decode(ARGV[3])
local expectedCount = tonumber(ARGV[4])
local liveCount = 0
local indexedIds = redis.call('SMEMBERS', KEYS[1])
for _, id in ipairs(indexedIds) do
  local raw = redis.call('GET', 'class:' .. id)
  if raw then
    local record = cjson.decode(raw)
    if tostring(record.schoolId or '') == ARGV[2] then
      liveCount = liveCount + 1
      local wanted = expected[id]
      if wanted == nil or tonumber(record.serverRevision or 0) ~= tonumber(wanted) then return -1 end
    end
  end
end
if liveCount ~= expectedCount then return -1 end
local updates = cjson.decode(ARGV[5])
for _, update in ipairs(updates) do
  redis.call('SET', 'class:' .. update.id, cjson.encode(update.record))
end
return #updates
`

const normalizedYear = value => {
  const year = Number(value)
  return Number.isInteger(year) && year >= 2000 && year <= 2200 ? year : new Date().getFullYear()
}

function parseGradeName(name) {
  const match = String(name || '').trim().match(/^(Åk\s*)?([1-9])(\s*[A-Za-zÅÄÖåäö].*)$/i)
  if (!match) return null
  return { prefix: match[1] || '', grade: Number(match[2]), suffix: match[3] }
}

export function buildRolloverPlan(classes, { graduatingGrade = 6, exitYear } = {}) {
  const finalGrade = Math.min(9, Math.max(1, Number(graduatingGrade) || 6))
  const year = normalizedYear(exitYear)
  const active = classes.filter(record => record && !record.archived)
  const snapshot = Object.fromEntries(classes.filter(Boolean).map(record => [record.id, Number(record.serverRevision) || 0]))
  const changes = active.flatMap(record => {
    const parsed = parseGradeName(record.name)
    if (!parsed || parsed.grade > finalGrade) return []
    if (parsed.grade === finalGrade) {
      return [{ id: record.id, from: record.name, action: 'archive', to: `${record.name} ${year} legacy` }]
    }
    return [{ id: record.id, from: record.name, action: 'rename', to: `${parsed.prefix}${parsed.grade + 1}${parsed.suffix}` }]
  })
  return { changes, snapshot, graduatingGrade: finalGrade, exitYear: year }
}

export function prepareRolloverUpdates(classes, requestedChanges, snapshot) {
  const byId = new Map(classes.map(record => [String(record.id), record]))
  const supplied = Array.isArray(requestedChanges) ? requestedChanges : []
  const seen = new Set()
  const now = Date.now()
  const updates = []

  for (const change of supplied) {
    const id = String(change?.id || '')
    const current = byId.get(id)
    if (!current || current.archived || seen.has(id)) throw studentStoreError(400, 'Årsbytesförslaget innehåller en ogiltig klass.')
    seen.add(id)
    const action = String(change.action || 'rename')
    if (action === 'skip') continue
    if (!['rename', 'archive'].includes(action)) throw studentStoreError(400, 'Ogiltig årsbytesåtgärd.')
    const name = String(change.to || '').normalize('NFC').trim().replace(/\s+/g, ' ')
    if (!name) throw studentStoreError(400, 'Alla valda klasser måste ha ett nytt namn.')
    const next = {
      ...current,
      name,
      serverRevision: (Number(current.serverRevision) || 0) + 1,
      serverUpdatedAt: now,
      updatedAt: now,
      rolloverAt: now
    }
    if (action === 'archive') {
      next.archived = true
      next.archivedAt = now
      next.activeNameBeforeArchive = current.name
    }
    updates.push({ id, action, from: current.name, to: name, record: next })
  }

  const proposed = new Map(classes.map(record => [record.id, updates.find(update => update.id === record.id)?.record || record]))
  const activeNames = [...proposed.values()].filter(record => !record.archived).map(record => normalizeClassName(record.name))
  if (new Set(activeNames).size !== activeNames.length) {
    throw studentStoreError(409, 'Årsbytet skulle skapa två aktiva klasser med samma namn.')
  }
  const expected = snapshot && typeof snapshot === 'object' ? snapshot : Object.fromEntries(classes.map(record => [record.id, Number(record.serverRevision) || 0]))
  return { updates, expected }
}

export async function applyRolloverAtomically(schoolId, classes, requestedChanges, snapshot, { store = kv } = {}) {
  const { updates, expected } = prepareRolloverUpdates(classes, requestedChanges, snapshot)
  const result = Number(await store.eval(
    CLASS_ROLLOVER_CAS_SCRIPT,
    ['classes:index'],
    ['class-rollover-v1', String(schoolId), JSON.stringify(expected), Object.keys(expected).length, JSON.stringify(updates)]
  ))
  if (result === -1) throw studentStoreError(409, 'Klasserna ändrades efter förhandsgranskningen. Förhandsgranska igen.')
  return updates.map(({ record, ...change }) => change)
}
