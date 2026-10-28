import { kv } from '@vercel/kv'
import { createHash } from 'node:crypto'
import { normalizeScreeningDraft } from '../src/domains/arithmetic/screeningDraft.js'
import { authorizeQuestionImages } from './_screeningImages.js'

export const SCREENING_DRAFT_CAS = `
local raw = redis.call('GET', KEYS[1])
local revision = raw and cjson.decode(raw).revision or 0
if revision ~= tonumber(ARGV[1]) then return 0 end
if not raw and redis.call('SCARD', KEYS[2]) >= 100 then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SADD', KEYS[2], ARGV[3])
return 1
`
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/u.test(value)
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const key = (teacherId, draftId) => `screening_draft:${teacherId}:${draftId}`
const index = teacherId => `screening_drafts:${teacherId}`
const fail = (status, message) => { throw Object.assign(new Error(message), { status, code: 'draft_conflict' }) }

export async function readScreeningDraft(teacherId, draftId, { store = kv } = {}) {
  if (!validId(draftId)) fail(400, 'Ogiltigt utkast-ID.')
  const draft = await store.get(key(teacherId, draftId))
  if (!draft || draft.teacherId !== teacherId) fail(404, 'Utkastet finns inte.')
  return draft
}

export async function listScreeningDrafts(teacherId, { store = kv } = {}) {
  const ids = await store.smembers(index(teacherId)) || []
  const records = await Promise.all(ids.filter(validId).map(id => store.get(key(teacherId, id))))
  return records.filter(draft => draft?.teacherId === teacherId).map(draft => {
    const latest = draft.versions.at(-1)
    return { draftId: draft.draftId, revision: draft.revision, titleSv: latest.content.titleSv, updatedAt: latest.createdAt }
  }).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveScreeningDraft(teacherId, command, { store = kv, now = Date.now() } = {}) {
  if (!validId(command.requestId) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0) fail(400, 'Ogiltig sparbegäran.')
  let content
  try { content = normalizeScreeningDraft(command.content) } catch (error) { fail(400, error.message) }
  for (const task of [...content.imageTasks, content.imageEditor.draft]) await authorizeQuestionImages(task, teacherId, { store })
  const draftId = command.draftId || `draft_${hash([teacherId, command.requestId]).slice(0, 24)}`
  if (!validId(draftId)) fail(400, 'Ogiltigt utkast-ID.')
  const previous = await store.get(key(teacherId, draftId)) || { schemaVersion: 1, teacherId, draftId, revision: 0, versions: [] }
  if (previous.teacherId !== teacherId) fail(404, 'Utkastet finns inte.')
  const contentHash = hash(content)
  const retry = previous.versions.find(version => version.requestId === command.requestId)
  if (retry) {
    if (retry.contentHash !== contentHash) fail(409, 'Samma sparbegäran har redan använts för ett annat innehåll.')
    return previous
  }
  if (previous.revision !== command.expectedRevision) fail(409, 'En nyare version finns. Din text är kvar; läs den senaste versionen eller spara en kopia.')
  if (previous.versions.length >= 20) fail(413, 'Utkastet har 20 versioner. Spara en ny kopia för att fortsätta.')
  const next = { ...previous, revision: previous.revision + 1, versions: [...previous.versions,
    { version: previous.revision + 1, requestId: command.requestId, contentHash, content, createdAt: now }] }
  if (Buffer.byteLength(JSON.stringify(next)) > 2 * 1024 * 1024) fail(413, 'Utkastets historik är för stor. Spara en ny kopia.')
  const saved = Number(await store.eval(SCREENING_DRAFT_CAS, [key(teacherId, draftId), index(teacherId)],
    [command.expectedRevision, JSON.stringify(next), draftId]))
  if (saved !== 1) {
    const current = await store.get(key(teacherId, draftId))
    if (current?.versions.some(version => version.requestId === command.requestId && version.contentHash === contentHash)) return current
    fail(saved === -1 ? 413 : 409, saved === -1 ? 'Du har redan 100 utkast.' : 'En annan sparning hann före. Din text är kvar; läs senaste version eller spara en kopia.')
  }
  return next
}

// This private resource has no assignment/publication writes or pupil indexes.
export async function teacherDraftAction(req, res, teacherId, options) {
  if (req.method === 'GET') return res.status(200).json(req.query?.draftId
    ? { draft: await readScreeningDraft(teacherId, req.query.draftId, options) }
    : { drafts: await listScreeningDrafts(teacherId, options) })
  if (req.method === 'POST') return res.status(200).json({ draft: await saveScreeningDraft(teacherId, req.body, options) })
  return res.status(405).json({ error: 'Method not allowed' })
}
