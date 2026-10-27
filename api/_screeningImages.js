import { randomBytes } from 'node:crypto'
import { kv } from '@vercel/kv'
import { searchScreeningFigures, screeningFigureSvg } from '../src/domains/arithmetic/screeningFigures.js'
import { imageQuestionRefs } from '../src/domains/arithmetic/screeningImageQuestions.js'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { validateScreeningPng } from './_screeningPng.js'

const fail = (status, message) => { throw new DiagnosticAppendError(status, 'image_unavailable', message) }
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(id)
const metadata = image => ({ id: image.id, version: 1, source: 'upload', nameSv: image.nameSv })
export async function readScreeningImage(id, { store = kv } = {}) {
  if (!validId(id)) fail(400, 'Ogiltigt bild-ID.')
  const image = await store.get(`screening_image:${id}`)
  if (!image) fail(404, 'Bilden saknas.')
  return image
}
export async function listScreeningImages(teacherId, { store = kv } = {}) {
  const ids = await store.smembers(`screening_images:${teacherId}`) || []
  const images = await Promise.all(ids.filter(validId).map(id => store.get(`screening_image:${id}`)))
  return images.filter(image => image?.teacherId === teacherId && !image.hidden).map(metadata)
}
export async function saveScreeningImage(teacherId, input, { store = kv } = {}) {
  if (typeof input.nameSv !== 'string' || !input.nameSv.trim() || input.nameSv.length > 100
    || typeof input.dataUrl !== 'string' || input.dataUrl.length > 700000
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/u.test(input.dataUrl)) fail(400, 'Ange namn och en PNG-bild på högst 512 KiB.')
  const bytes = Buffer.from(input.dataUrl.split(',')[1], 'base64')
  try { validateScreeningPng(bytes) } catch { fail(400, 'Bilden måste vara en giltig PNG, högst 1024 pixlar och 512 KiB.') }
  const image = { id: randomBytes(16).toString('hex'), version: 1, teacherId,
    nameSv: input.nameSv.trim(), dataUrl: input.dataUrl, createdAt: Date.now(), hidden: false }
  await store.set(`screening_image:${image.id}`, image)
  await store.sadd(`screening_images:${teacherId}`, image.id)
  return metadata(image)
}
export async function authorizeQuestionImages(task, teacherId, { store = kv } = {}) {
  for (const ref of imageQuestionRefs(task).filter(ref => ref.source === 'upload')) {
    const image = await readScreeningImage(ref.id, { store })
    if (image.teacherId !== teacherId || image.hidden || image.version !== ref.version) fail(403, 'Bilden finns inte i ditt bibliotek.')
  }
}
// Called only after the live teacher has been authorized for screening.
export async function teacherImageAction(req, res, teacherId, { store = kv } = {}) {
  if (req.method === 'GET' && req.query?.resource === 'figures') {
    return res.status(200).json({ figures: searchScreeningFigures(req.query.q || '').map(figure => ({ ...figure, svg: screeningFigureSvg(figure.id, figure.version) })) })
  }
  if (req.method === 'GET' && req.query?.resource === 'images') {
    if (!req.query.id) return res.status(200).json({ images: await listScreeningImages(teacherId, { store }) })
    const image = await readScreeningImage(req.query.id, { store })
    const assignment = req.query.assignmentId ? await store.get(`diagnostic_assignment:${req.query.assignmentId}`) : null
    // Class authorization for an assignment is checked by the route before this call.
    const assigned = Boolean(assignment && assignment.classId === req.query.classId) && assignment.items.some(item =>
      imageQuestionRefs(item.taskSnapshot).some(ref => ref.source === 'upload' && ref.id === image.id))
    if (image.teacherId !== teacherId && !assigned) fail(403, 'Bilden är inte tillgänglig.')
    return res.status(200).json({ image: { ...metadata(image), dataUrl: image.dataUrl } })
  }
  if (req.method === 'POST' && req.body?.action === 'upload_image') {
    return res.status(201).json({ image: await saveScreeningImage(teacherId, req.body, { store }) })
  }
  if (req.method === 'PATCH' && req.body?.action === 'hide_image') {
    const image = await readScreeningImage(req.body.id, { store })
    if (image.teacherId !== teacherId) fail(403, 'Bilden tillhör inte ditt bibliotek.')
    // Immutable content; hiding changes only discoverability.
    await store.set(`screening_image:${image.id}`, { ...image, hidden: true })
    return res.status(200).json({ hidden: true })
  }
  fail(400, 'Okänd bildåtgärd.')
}
