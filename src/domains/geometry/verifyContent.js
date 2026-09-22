import { SHAPES_2D, SOLIDS, QUADRILATERAL_RELATIONS } from './geometryModel'

function expectedAnswer(values) {
  const kind = values?.questionKind
  const subject = values?.subject || {}
  if (kind === 'line_primitive') return subject.kind
  if (kind === 'polygon_sides') return Object.keys(SHAPES_2D).find(key => SHAPES_2D[key].sides === subject.sides && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(key))
  if (kind === 'shape_identity' || kind === 'quadrilateral_properties' || kind === 'circle_part' || kind === 'solid_identity') return subject.kind || subject.part
  if (kind === 'quadrilateral_relation') return QUADRILATERAL_RELATIONS[`${subject.from}_${subject.to}`] ? 'yes' : 'no'
  if (kind === 'solid_count') return String(SOLIDS[subject.kind]?.[subject.property])
  if (kind === 'solid_face_shapes') return Object.keys(SOLIDS).find(key => SOLIDS[key].faceShape === subject.faceShape)
  if (kind === 'solid_clues') return Object.keys(SOLIDS).find(key => {
    const solid = SOLIDS[key]
    return solid.faces === subject.faces && solid.edges === subject.edges && solid.vertices === subject.vertices && solid.faceShape === subject.faceShape
  })
  return ''
}

export function verifyGeometryContent(problem) {
  const options = problem?.values?.options
  if (!Array.isArray(options) || options.length < 2) return { valid: false, reason: 'missing answer options' }
  const ids = options.map(item => String(item?.id || ''))
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) return { valid: false, reason: 'answer option ids must be unique' }
  const expected = String(expectedAnswer(problem?.values) || '')
  if (!expected || ids.filter(id => id === expected).length !== 1) return { valid: false, reason: 'content has no unique derived answer' }
  if (String(problem?.answer?.correct || '') !== expected) return { valid: false, reason: 'stored answer disagrees with geometry facts' }
  return { valid: true, reason: '' }
}
