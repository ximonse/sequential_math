import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { previewTeacherMaterial } from './_teacherMaterialPreview.js'
import { readMaterialDraft, saveMaterialDraft } from './_teacherMaterialStore.js'
import { assertMaterialDraftAccess } from './_teacherMaterialAccess.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
  try {
    if (req.method === 'GET') {
      const state = await readMaterialDraft(auth.teacherId, req.query?.draftId)
      if (!state) return res.status(404).json({ error: 'Utkastet finns inte.' })
      await assertMaterialDraftAccess(req, state)
      return res.status(200).json({ draft: state, assigned: false })
    }
    const action = req.body?.action
    if (!['preview', 'save'].includes(action) || Object.keys(req.body).some(key => !['action', 'material', 'draftId', 'requestId', 'expectedRevision', 'expectedContentRevision'].includes(key))) {
      return res.status(400).json({ error: 'Åtgärden stöds inte.' })
    }
    if (Buffer.byteLength(JSON.stringify(req.body)) > 150000) return res.status(413).json({ error: 'Materialet är för stort.' })
    const preview = await previewTeacherMaterial(req, auth, req.body.material)
    if (action === 'preview') return res.status(200).json(preview)
    if (req.body.draftId) {
      const previous = await readMaterialDraft(auth.teacherId, req.body.draftId)
      if (!previous) return res.status(404).json({ error: 'Utkastet finns inte.' })
      await assertMaterialDraftAccess(req, previous)
    }
    const { state, savedVersion } = await saveMaterialDraft(auth.teacherId, req.body, preview)
    await assertMaterialDraftAccess(req, state)
    return res.status(200).json({ draftId: state.draftId, revision: state.revision, savedVersion,
      contentRevision: preview.contentRevision, saved: true, assigned: false, approval: 'not_requested' })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Materialet kunde inte förhandsvisas.' })
  }
}
