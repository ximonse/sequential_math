import { describe, expect, it } from 'vitest'
import { authorizeQuestionImages, listScreeningImages, saveScreeningImage, teacherImageAction } from './_screeningImages.js'
import { figureRef } from '../src/domains/arithmetic/screeningFigures.js'

function storage() {
  const data = new Map(), sets = new Map()
  return { data, get: async key => structuredClone(data.get(key)), set: async (key, value) => data.set(key, structuredClone(value)),
    sadd: async (key, id) => sets.set(key, [...(sets.get(key) || []), id]), smembers: async key => sets.get(key) || [] }
}
const png = (width = 1) => {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  if (width !== 1) { bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(0x05c57f80, 29) }
  return `data:image/png;base64,${bytes.toString('base64')}`
}
const response = () => ({ status(value) { this.code = value; return this }, json(value) { this.body = value; return this } })
describe('private screening image library', () => {
  it('validates content, dimensions, name and upload size', async () => {
    const store = storage()
    for (const input of [{ nameSv: '', dataUrl: png() }, { nameSv: 'x', dataUrl: png(1025) }, { nameSv: 'x', dataUrl: 'data:image/svg+xml;base64,xxx' }, { nameSv: 'x', dataUrl: `data:image/png;base64,${'A'.repeat(710000)}` }]) {
      await expect(saveScreeningImage('owner', input, { store })).rejects.toMatchObject({ status: 400 })
    }
  })
  it('rejects a truncated image and corrupt pixel checksums', async () => {
    const store = storage(), bytes = Buffer.from(png().split(',')[1], 'base64')
    await expect(saveScreeningImage('owner', { nameSv: 'x', dataUrl: `data:image/png;base64,${bytes.subarray(0, 33).toString('base64')}` }, { store })).rejects.toMatchObject({ status: 400 })
    bytes[45] ^= 1
    await expect(saveScreeningImage('owner', { nameSv: 'x', dataUrl: `data:image/png;base64,${bytes.toString('base64')}` }, { store })).rejects.toMatchObject({ status: 400 })
  })
  it('keeps immutable image content when hidden and prevents other teachers using it for new questions', async () => {
    const store = storage(), image = await saveScreeningImage('owner', { nameSv: 'Triangel', dataUrl: png() }, { store })
    const task = { images: [image, figureRef('triangle-standard')] }
    await authorizeQuestionImages(task, 'owner', { store })
    await expect(authorizeQuestionImages(task, 'other', { store })).rejects.toMatchObject({ status: 403 })
    expect(await listScreeningImages('other', { store })).toEqual([])
    await teacherImageAction({ method: 'PATCH', body: { action: 'hide_image', id: image.id } }, response(), 'owner', { store })
    expect(await listScreeningImages('owner', { store })).toEqual([])
    expect(store.data.get(`screening_image:${image.id}`).dataUrl).toBe(png())
    await expect(authorizeQuestionImages(task, 'owner', { store })).rejects.toMatchObject({ status: 403 })
  })
  it('permits assignment-scoped viewing but never private metadata from another library', async () => {
    const store = storage(), image = await saveScreeningImage('owner', { nameSv: 'Min figur', dataUrl: png() }, { store })
    const req = { method: 'GET', query: { resource: 'images', id: image.id } }
    await expect(teacherImageAction(req, response(), 'other', { store })).rejects.toMatchObject({ status: 403 })
    store.data.set('diagnostic_assignment:assignment', { classId: 'class', items: [{ taskSnapshot: { images: [image] } }] })
    const res = response()
    await teacherImageAction({ ...req, query: { ...req.query, assignmentId: 'assignment', classId: 'class' } }, res, 'other', { store })
    expect(res.body.image.dataUrl).toBe(png())
  })
})
