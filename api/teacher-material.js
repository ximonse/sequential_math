import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { previewTeacherMaterial } from './_teacherMaterialPreview.js'
import { readMaterialDraft, saveMaterialDraft, approveMaterialDraft } from './_teacherMaterialStore.js'
import { assertMaterialDraftAccess } from './_teacherMaterialAccess.js'
import { readMaterialDispatch } from './_teacherMaterialDispatchStore.js'
import { publishMaterialDraft } from './_teacherMaterialPublish.js'

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
      const dispatches = (await Promise.all(state.versions.map(item => readMaterialDispatch(state, item.version)))).filter(Boolean)
      return res.status(200).json({ draft: state, dispatches, assigned: dispatches.some(value => value.status === 'complete') })
    }
    const action = req.body?.action
    if (!['preview', 'save', 'approve', 'publish'].includes(action) || Object.keys(req.body).some(key => !['action', 'material', 'draftId', 'requestId', 'expectedRevision', 'expectedContentRevision', 'contentRevision', 'version'].includes(key))) {
      return res.status(400).json({ error: 'Åtgärden stöds inte.' })
    }
    if (Buffer.byteLength(JSON.stringify(req.body)) > 150000) return res.status(413).json({ error: 'Materialet är för stort.' })
    if (action === 'publish') {
      if (auth.authSource !== 'cookie') return res.status(403).json({ error: 'Utdelning kräver lärarens inloggade granskningsvy.' })
      const state = await readMaterialDraft(auth.teacherId, req.body.draftId)
      if (!state) return res.status(404).json({ error: 'Utkastet finns inte.' })
      await assertMaterialDraftAccess(req, state)
      const result = await publishMaterialDraft(req, auth, state, req.body)
      await assertMaterialDraftAccess(req, state)
      return res.status(200).json({ ...result, assigned: result.dispatch.status === 'complete' })
    }
    if (action === 'approve') {
      if (auth.authSource !== 'cookie') return res.status(403).json({ error: 'Godkännande kräver lärarens inloggade granskningsvy.' })
      const state = await readMaterialDraft(auth.teacherId, req.body.draftId)
      if (!state) return res.status(404).json({ error: 'Utkastet finns inte.' })
      await assertMaterialDraftAccess(req, state)
      const preview = await previewTeacherMaterial(req, auth, state.versions.at(-1).input)
      const approved = await approveMaterialDraft(state, req.body, preview)
      await assertMaterialDraftAccess(req, approved.state)
      const dispatch = await readMaterialDispatch(approved.state, req.body.version)
      return res.status(200).json({ draftId: state.draftId, revision: approved.state.revision, approval: approved.approval,
        assigned: dispatch?.status === 'complete', ...(dispatch ? { dispatch } : {}) })
    }
    const preview = await previewTeacherMaterial(req, auth, req.body.material)
    if (action === 'preview') return res.status(200).json(preview)
    if (req.body.draftId) {
      const previous = await readMaterialDraft(auth.teacherId, req.body.draftId)
      if (!previous) return res.status(404).json({ error: 'Utkastet finns inte.' })
      await assertMaterialDraftAccess(req, previous)
    }
    const { state, savedVersion } = await saveMaterialDraft(auth.teacherId, req.body, preview)
    await assertMaterialDraftAccess(req, state)
    const dispatch = await readMaterialDispatch(state, savedVersion)
    return res.status(200).json({ draftId: state.draftId, revision: state.revision, savedVersion,
      contentRevision: preview.contentRevision, saved: true, assigned: dispatch?.status === 'complete', assignmentCreated: false, approval: 'not_requested',
      reviewPath: `/teacher/material/${state.draftId}?version=${savedVersion}` })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Materialåtgärden kunde inte bekräftas.', ...(error.code ? { code: error.code } : {}) })
  }
}
