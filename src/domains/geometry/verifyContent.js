import { SHAPES_2D, SOLIDS, QUADRILATERAL_RELATIONS, objectNameWithArticle } from './geometryModel'

const LEVEL_KINDS = {
  geometry_2d_objects: ['line_primitive', 'polygon_sides', 'shape_identity', 'quadrilateral_relation', 'circle_part', ['quadrilateral_properties', 'quadrilateral_extension', 'quadrilateral_names']],
  geometry_3d_objects: ['solid_identity', 'solid_identity', 'solid_count', 'solid_face_shapes', 'solid_clues']
}

const REPRESENTATIONS = {
  line_primitive: ['diagram', 'description'], polygon_sides: ['diagram', 'side_count'],
  shape_identity: ['outline', 'filled_grid'], quadrilateral_relation: ['question_text', 'category_table'],
  circle_part: ['marked_diagram', 'description'], quadrilateral_properties: ['clue_text', 'property_table'],
  quadrilateral_extension: ['clue_text', 'property_table'],
  quadrilateral_names: ['clue_text', 'property_table'],
  solid_count: ['wireframe_count', 'count_description'], solid_face_shapes: ['face_clue_text', 'face_clue_table'],
  solid_clues: ['multi_clue_text', 'multi_clue_table']
}

function validSubject(kind, subject, representation, level) {
  if (!subject || typeof subject !== 'object') return false
  if (kind === 'line_primitive') return ['line', 'ray', 'segment'].includes(subject.kind)
  if (kind === 'polygon_sides') return [3, 4, 5, 6].includes(subject.sides)
  if (kind === 'shape_identity') return ['triangle', 'quadrilateral', 'circle', 'pentagon', 'hexagon'].includes(subject.kind)
    && [0, 15, 30, 45].includes(subject.rotation) && [0.75, 1, 1.25].includes(subject.stretch)
  if (kind === 'quadrilateral_relation') return Object.hasOwn(QUADRILATERAL_RELATIONS, `${subject.from}_${subject.to}`)
  if (kind === 'circle_part') return ['center', 'radius', 'diameter'].includes(subject.part)
  if (kind === 'quadrilateral_properties') return typeof subject.equalSides === 'boolean' && typeof subject.rightAngles === 'boolean'
  if (kind === 'quadrilateral_extension') return ['rhombus', 'rectangle'].includes(subject.kind)
  if (kind === 'quadrilateral_names') return ['square', 'rectangle', 'rhombus', 'parallelogram'].includes(subject.kind)
  if (kind === 'solid_identity') return Object.hasOwn(SOLIDS, subject.kind)
    && (level === 1 ? ['wireframe', 'silhouette'].includes(representation) : ['cube', 'cuboid'].includes(subject.kind) && ['wireframe', 'face_properties'].includes(representation) && (representation === 'face_properties' ? subject.view === 'faces' : ['front', 'tilted_left', 'tilted_right'].includes(subject.view)))
  if (kind === 'solid_count') return ['cube', 'cuboid', 'pyramid'].includes(subject.kind) && ['faces', 'edges', 'vertices'].includes(subject.property)
  if (kind === 'solid_face_shapes') return Object.hasOwn(SOLIDS, subject.kind) && subject.faceShape === SOLIDS[subject.kind].faceShape
  if (kind === 'solid_clues') {
    const solid = SOLIDS[subject.kind]
    return Boolean(solid && subject.faces === solid.faces && subject.edges === solid.edges
      && subject.vertices === solid.vertices && subject.faceShape === solid.faceShape)
  }
  return false
}

function expectedAnswer(kind, subject) {
  if (kind === 'line_primitive') return subject.kind
  if (kind === 'polygon_sides') return Object.keys(SHAPES_2D).find(key => SHAPES_2D[key].sides === subject.sides && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(key))
  if (kind === 'shape_identity') return subject.kind
  if (kind === 'quadrilateral_relation') return QUADRILATERAL_RELATIONS[`${subject.from}_${subject.to}`] ? 'yes' : 'no'
  if (kind === 'circle_part') return subject.part
  if (kind === 'quadrilateral_properties') {
    if (subject.equalSides && subject.rightAngles) return 'square'
    if (subject.rightAngles) return 'rectangle'
    if (subject.equalSides) return 'rhombus'
    return 'parallelogram'
  }
  if (kind === 'quadrilateral_extension') return subject.kind === 'rhombus' ? 'right_angles' : 'equal_sides'
  if (kind === 'quadrilateral_names') return { square: 'all_three', rectangle: 'parallelogram_only', rhombus: 'parallelogram_only', parallelogram: 'none' }[subject.kind]
  if (kind === 'solid_identity' || kind === 'solid_face_shapes' || kind === 'solid_clues') return subject.kind
  if (kind === 'solid_count') return String(SOLIDS[subject.kind][subject.property])
  return ''
}

function expectedTemplate(kind, subject, level) {
  if (kind === 'line_primitive') return `primitive_${subject.kind}`
  if (kind === 'polygon_sides') return `polygon_${subject.sides}`
  if (kind === 'shape_identity') return `recognize_${subject.kind}`
  if (kind === 'quadrilateral_relation') return `relation_${subject.from}_${subject.to}`
  if (kind === 'circle_part') return `circle_${subject.part}`
  if (kind === 'quadrilateral_properties') return `properties_${expectedAnswer(kind, subject)}`
  if (kind === 'quadrilateral_extension') return `extension_${subject.kind}`
  if (kind === 'quadrilateral_names') return `names_${subject.kind}`
  if (kind === 'solid_identity') return level === 1 ? `recognize_${subject.kind}` : `cube_cuboid_${subject.kind}_${subject.view}`
  if (kind === 'solid_count') return `count_${subject.kind}_${subject.property}`
  if (kind === 'solid_face_shapes') return `faces_${subject.kind}`
  if (kind === 'solid_clues') return `infer_${subject.kind}`
  return ''
}

function optionLabel(kind, id) {
  if (kind === 'line_primitive') return { line: 'linje', ray: 'stråle', segment: 'sträcka' }[id]
  if (kind === 'polygon_sides' || kind === 'shape_identity' || kind === 'quadrilateral_properties') return SHAPES_2D[id]?.label
  if (kind === 'quadrilateral_relation') return { yes: 'Ja', no: 'Nej' }[id]
  if (kind === 'circle_part') return { center: 'centrum', radius: 'radie', diameter: 'diameter' }[id]
  if (kind === 'quadrilateral_extension') return { right_angles: 'fyra räta vinklar', equal_sides: 'fyra lika långa sidor', parallel_sides: 'två par parallella sidor' }[id]
  if (kind === 'quadrilateral_names') return { all_three: 'rektangel, romb och parallellogram', parallelogram_only: 'parallellogram', rectangle_only: 'rektangel', rhombus_only: 'romb', none: 'inga andra namn' }[id]
  if (kind === 'solid_identity' || kind === 'solid_face_shapes' || kind === 'solid_clues') return SOLIDS[id]?.label
  if (kind === 'solid_count' && /^\d+$/.test(id)) return id
  return undefined
}

export function verifyGeometryContent(problem) {
  const values = problem?.values || {}
  const kind = values.questionKind
  const level = Number(problem?.level)
  const representation = values.representation
  const expectedKinds = LEVEL_KINDS[problem?.skill]?.[level - 1]
  if (!Number.isInteger(level) || !(Array.isArray(expectedKinds) ? expectedKinds.includes(kind) : expectedKinds === kind)) return { valid: false, reason: 'unexpected geometry level or question type' }
  if (problem?.domain !== 'geometry' || problem?.metadata?.representation !== representation) return { valid: false, reason: 'geometry representation mismatch' }
  const allowed = kind === 'solid_identity' ? (level === 1 ? ['wireframe', 'silhouette'] : ['wireframe', 'face_properties']) : REPRESENTATIONS[kind]
  if (!allowed?.includes(representation) || !validSubject(kind, values.subject, representation, level)) return { valid: false, reason: 'invalid or unsupported geometry subject' }
  if (problem?.metadata?.varietyTemplate !== expectedTemplate(kind, values.subject, level)) return { valid: false, reason: 'geometry template disagrees with subject' }
  const fixedPrompts = {
    line_primitive: 'Vad heter det geometriska objektet?',
    polygon_sides: 'Vad heter figuren?',
    shape_identity: 'Vad heter figuren?',
    quadrilateral_properties: 'Vilket är det mest specifika namnet på fyrhörningen?',
    solid_face_shapes: 'Vilken kropp har dessa ytformer?',
    solid_clues: 'Vilken kropp har dessa egenskaper?'
  }
  if (fixedPrompts[kind] && problem?.display?.text !== fixedPrompts[kind]) return { valid: false, reason: 'geometry prompt disagrees with task' }
  if (kind === 'circle_part' && problem?.display?.text !== (representation === 'marked_diagram' ? 'Vad heter den färgmarkerade delen av cirkeln?' : 'Vad heter delen av cirkeln som beskrivs?')) return { valid: false, reason: 'circle prompt disagrees with representation' }
  if (kind === 'quadrilateral_extension' && problem?.display?.text !== `Vilken ytterligare egenskap måste ${objectNameWithArticle(values.subject.kind)} ha för att också vara en kvadrat?`) return { valid: false, reason: 'quadrilateral extension prompt disagrees with subject' }
  if (kind === 'quadrilateral_names' && problem?.display?.text !== `Figuren är ${objectNameWithArticle(values.subject.kind)}. Vilket alternativ räknar upp alla andra namn bland kvadrat, rektangel, romb och parallellogram som alltid stämmer?`) return { valid: false, reason: 'quadrilateral names prompt disagrees with subject' }
  if (kind === 'quadrilateral_relation' && problem?.display?.text !== `Är varje ${SHAPES_2D[values.subject.from].label} också ${objectNameWithArticle(values.subject.to)}?`) return { valid: false, reason: 'relation text disagrees with subject' }
  if (kind === 'solid_identity' && problem?.display?.text !== 'Vad heter kroppen?') return { valid: false, reason: 'solid prompt is ambiguous' }
  if (kind === 'solid_count') {
    const labels = { faces: 'ytor', edges: 'kanter', vertices: 'hörn' }
    if (problem?.display?.text !== `Hur många ${labels[values.subject.property]} har ${objectNameWithArticle(values.subject.kind)}?`) return { valid: false, reason: 'solid count text disagrees with subject' }
  }
  const options = values.options
  if (!Array.isArray(options) || options.length < 2) return { valid: false, reason: 'missing answer options' }
  const ids = options.map(item => String(item?.id || ''))
  if (ids.some(id => !id) || new Set(ids).size !== ids.length || options.some(item => item?.label !== optionLabel(kind, String(item?.id || '')))) return { valid: false, reason: 'invalid answer options' }
  const expected = String(expectedAnswer(kind, values.subject) || '')
  if (!expected || ids.filter(id => id === expected).length !== 1) return { valid: false, reason: 'content has no unique derived answer' }
  if (String(problem?.answer?.correct || '') !== expected) return { valid: false, reason: 'stored answer disagrees with geometry facts' }
  return { valid: true, reason: '' }
}
