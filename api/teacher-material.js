import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { previewTeacherMaterial } from './_teacherMaterialPreview.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
  try {
    if (req.body?.action !== 'preview' || Object.keys(req.body).some(key => !['action', 'material'].includes(key))) {
      return res.status(400).json({ error: 'Endast förhandsvisning utan lagring stöds.' })
    }
    if (Buffer.byteLength(JSON.stringify(req.body)) > 150000) return res.status(413).json({ error: 'Materialet är för stort.' })
    return res.status(200).json(await previewTeacherMaterial(req, auth, req.body.material))
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Materialet kunde inte förhandsvisas.' })
  }
}
