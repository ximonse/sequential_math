import { attachEvidenceClaim, EVIDENCE_CLASSES } from '../../lib/evidenceContract'
import { pickFromRotation } from '../../lib/rotationPicker'
import { option, SHAPES_2D, SOLIDS, QUADRILATERAL_RELATIONS, objectNameWithArticle } from './geometryModel'

const QUADRILATERAL_BANK = Object.freeze([
  ...['square', 'rectangle', 'rhombus', 'parallelogram'].flatMap(shape =>
    ['clue_text', 'property_table'].map(representation => ({ kind: 'properties', shape, representation }))),
  ...['rhombus', 'rectangle'].flatMap(shape =>
    ['clue_text', 'property_table'].map(representation => ({ kind: 'extension', shape, representation }))),
  ...['square', 'rectangle', 'rhombus', 'parallelogram'].flatMap(shape =>
    ['clue_text', 'property_table'].map(representation => ({ kind: 'names', shape, representation })))
])

const pick = (key, values) => pickFromRotation(key, values)
function pickCombination(key, ...axes) {
  const total = axes.reduce((size, axis) => size * axis.length, 1)
  let index = pick(key, Array.from({ length: total }, (_, value) => value))
  return axes.map(axis => {
    const value = axis[index % axis.length]
    index = Math.floor(index / axis.length)
    return value
  })
}
const shuffledOptions = (correct, distractors) => {
  const values = [correct, ...distractors]
  const shift = Math.floor(Math.random() * values.length)
  return values.slice(shift).concat(values.slice(0, shift))
}

function makeProblem(skill, level, spec) {
  const prompt = spec.prompt
  const problem = {
    id: `geo_${skill}_${level}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    domain: 'geometry', skill, level, type: skill,
    difficulty: { conceptual_level: level },
    display: { type: 'geometry_choice', text: prompt },
    values: { ...spec.values, representation: spec.representation, options: spec.options },
    answer: { type: 'single_choice', correct: spec.correct },
    metadata: {
      promptText: prompt,
      varietyTemplate: spec.template,
      representation: spec.representation,
      contentContractVersion: 'geometry-v1',
      skillTag: `${skill}_l${level}_${spec.template}`
    },
    generated_at: Date.now()
  }
  return attachEvidenceClaim(problem, { class: EVIDENCE_CLASSES.MASTERY_ELIGIBLE })
}

function generate2d(level) {
  if (level === 1) {
    const [kind, representation] = pickCombination('geometry:2d:l1:bank', ['line', 'ray', 'segment'], ['diagram', 'description'])
    return { template: `primitive_${kind}`, representation, prompt: 'Vad heter det geometriska objektet?', values: { questionKind: 'line_primitive', subject: { kind } }, correct: kind,
      options: shuffledOptions(option(kind, { line: 'linje', ray: 'stråle', segment: 'sträcka' }[kind]), [option('line', 'linje', 'line_ray_segment_confusion'), option('ray', 'stråle', 'line_ray_segment_confusion'), option('segment', 'sträcka', 'line_ray_segment_confusion')].filter(x => x.id !== kind)) }
  }
  if (level === 2) {
    const [sides, representation] = pickCombination('geometry:2d:l2:bank', [3, 4, 5, 6], ['diagram', 'side_count'])
    const correct = Object.keys(SHAPES_2D).find(key => SHAPES_2D[key].sides === sides && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(key))
    return { template: `polygon_${sides}`, representation, prompt: 'Vad heter figuren?', values: { questionKind: 'polygon_sides', subject: { sides } }, correct,
      options: shuffledOptions(option(correct, SHAPES_2D[correct].label), [3, 4, 5, 6].filter(n => n !== sides).map(n => { const id = Object.keys(SHAPES_2D).find(k => SHAPES_2D[k].sides === n && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(k)); return option(id, SHAPES_2D[id].label, 'polygon_side_count') })) }
  }
  if (level === 3) {
    const [kind, representation] = pickCombination('geometry:2d:l3:bank', ['triangle', 'quadrilateral', 'circle', 'pentagon', 'hexagon'], ['outline', 'filled_grid'])
    const distractors = ['triangle', 'quadrilateral', 'circle', 'pentagon', 'hexagon'].filter(x => x !== kind).slice(0, 3).map(x => option(x, SHAPES_2D[x].label, 'shape_name_confusion'))
    return { template: `recognize_${kind}`, representation, prompt: 'Vad heter figuren?', values: { questionKind: 'shape_identity', subject: { kind, rotation: pick('geometry:2d:l3:rotation', [0, 15, 30, 45]), stretch: pick('geometry:2d:l3:stretch', [0.75, 1, 1.25]) } }, correct: kind, options: shuffledOptions(option(kind, SHAPES_2D[kind].label), distractors) }
  }
  if (level === 4) {
    const [relation, representation] = pickCombination('geometry:2d:l4:bank', Object.keys(QUADRILATERAL_RELATIONS), ['question_text', 'category_table'])
    const [from, to] = relation.split('_')
    const correct = QUADRILATERAL_RELATIONS[relation] ? 'yes' : 'no'
    return { template: `relation_${relation}`, representation, prompt: `Är varje ${SHAPES_2D[from].label} också ${objectNameWithArticle(to)}?`, values: { questionKind: 'quadrilateral_relation', subject: { from, to } }, correct,
      options: [option('yes', 'Ja', correct === 'no' ? 'category_overgeneralization' : ''), option('no', 'Nej', correct === 'yes' ? 'square_not_rectangle' : '')] }
  }
  if (level === 5) {
    const [part, representation] = pickCombination('geometry:2d:l5:bank', ['center', 'radius', 'diameter'], ['marked_diagram', 'description'])
    const labels = { center: 'centrum', radius: 'radie', diameter: 'diameter' }
    return { template: `circle_${part}`, representation, prompt: representation === 'marked_diagram' ? 'Vad heter den färgmarkerade delen av cirkeln?' : 'Vad heter delen av cirkeln som beskrivs?', values: { questionKind: 'circle_part', subject: { part } }, correct: part,
      options: shuffledOptions(option(part, labels[part]), Object.keys(labels).filter(x => x !== part).map(x => option(x, labels[x], part !== 'center' && x !== 'center' ? 'radius_diameter_confusion' : 'center_line_confusion'))) }
  }
  const card = pick('geometry:2d:l6:card', QUADRILATERAL_BANK)
  if (card.kind === 'extension') {
    const correct = card.shape === 'rhombus' ? 'right_angles' : 'equal_sides'
    return { template: `extension_${card.shape}`, representation: card.representation,
      prompt: `Vilken ytterligare egenskap måste ${objectNameWithArticle(card.shape)} ha för att också vara en kvadrat?`,
      values: { questionKind: 'quadrilateral_extension', subject: { kind: card.shape } }, correct,
      options: [option('right_angles', 'fyra räta vinklar', correct === 'right_angles' ? '' : 'quadrilateral_property_confusion'), option('equal_sides', 'fyra lika långa sidor', correct === 'equal_sides' ? '' : 'quadrilateral_property_confusion'), option('parallel_sides', 'två par parallella sidor', 'quadrilateral_property_confusion')] }
  }
  if (card.kind === 'names') {
    const correct = { square: 'all_three', rectangle: 'parallelogram_only', rhombus: 'parallelogram_only', parallelogram: 'none' }[card.shape]
    const labels = { all_three: 'rektangel, romb och parallellogram', parallelogram_only: 'parallellogram', rectangle_only: 'rektangel', rhombus_only: 'romb', none: 'inga andra namn' }
    return { template: `names_${card.shape}`, representation: card.representation,
      prompt: `Figuren är ${objectNameWithArticle(card.shape)}. Vilket alternativ räknar upp alla andra namn bland kvadrat, rektangel, romb och parallellogram som alltid stämmer?`,
      values: { questionKind: 'quadrilateral_names', subject: { kind: card.shape } }, correct,
      options: Object.keys(labels).map(id => option(id, labels[id], id === correct ? '' : correct === 'all_three' && ['rectangle_only', 'rhombus_only', 'parallelogram_only'].includes(id) ? 'quadrilateral_underclassification' : 'quadrilateral_category_confusion')) }
  }
  const correct = card.shape
  const properties = {
    square: { equalSides: true, rightAngles: true }, rectangle: { equalSides: false, rightAngles: true },
    rhombus: { equalSides: true, rightAngles: false }, parallelogram: { equalSides: false, rightAngles: false }
  }
  return { template: `properties_${correct}`, representation: card.representation, prompt: 'Vilket är det mest specifika namnet på fyrhörningen?', values: { questionKind: 'quadrilateral_properties', subject: properties[correct] }, correct,
    options: ['square', 'rectangle', 'rhombus', 'parallelogram'].map(x => option(x, SHAPES_2D[x].label, x === correct ? '' : 'quadrilateral_property_confusion')) }
}

function generate3d(level) {
  const ids = Object.keys(SOLIDS)
  if (level === 1) {
    const [kind, representation] = pickCombination('geometry:3d:l1:bank', ids, ['wireframe', 'silhouette'])
    return { template: `recognize_${kind}`, representation, prompt: 'Vad heter kroppen?', values: { questionKind: 'solid_identity', subject: { kind } }, correct: kind,
      options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'solid_identity_confusion'))) }
  }
  if (level === 2) {
    const [kind, representation] = pickCombination('geometry:3d:l2:bank', ['cube', 'cuboid'], ['wireframe', 'face_properties'])
    const view = representation === 'wireframe' ? pick('geometry:3d:l2:view', ['front', 'tilted_left', 'tilted_right']) : 'faces'
    return { template: `cube_cuboid_${kind}_${view}`, representation, prompt: 'Vad heter kroppen?', values: { questionKind: 'solid_identity', subject: { kind, view } }, correct: kind,
      options: [option('cube', 'kub', kind === 'cuboid' ? 'cube_cuboid_confusion' : ''), option('cuboid', 'rätblock', kind === 'cube' ? 'cube_cuboid_confusion' : '')] }
  }
  if (level === 3) {
    const [kind, property, representation] = pickCombination('geometry:3d:l3:bank', ['cube', 'cuboid', 'pyramid'], ['faces', 'edges', 'vertices'], ['wireframe_count', 'count_description'])
    const labels = { faces: 'ytor', edges: 'kanter', vertices: 'hörn' }
    const correct = String(SOLIDS[kind][property])
    const nums = Array.from(new Set([correct, String(Math.max(0, Number(correct) - 1)), String(Number(correct) + 1), property === 'faces' ? '8' : '6']))
    return { template: `count_${kind}_${property}`, representation, prompt: `Hur många ${labels[property]} har ${objectNameWithArticle(kind)}?`, values: { questionKind: 'solid_count', subject: { kind, property } }, correct,
      options: nums.map(n => option(n, n, n === correct ? '' : 'faces_edges_vertices_confusion')) }
  }
  if (level === 4) {
    const [kind, representation] = pickCombination('geometry:3d:l4:bank', ids, ['face_clue_text', 'face_clue_table'])
    const correct = kind
    return { template: `faces_${kind}`, representation, prompt: 'Vilken kropp har dessa ytformer?', values: { questionKind: 'solid_face_shapes', subject: { kind, faceShape: SOLIDS[kind].faceShape } }, correct,
      options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'face_shape_confusion'))) }
  }
  const [kind, representation] = pickCombination('geometry:3d:l5:bank', ids, ['multi_clue_text', 'multi_clue_table'])
  return { template: `infer_${kind}`, representation, prompt: 'Vilken kropp har dessa egenskaper?', values: { questionKind: 'solid_clues', subject: { kind, faces: SOLIDS[kind].faces, edges: SOLIDS[kind].edges, vertices: SOLIDS[kind].vertices, faceShape: SOLIDS[kind].faceShape } }, correct: kind,
    options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'faces_edges_vertices_confusion'))) }
}

export function generateGeometryProblem(skill, level) {
  const max = skill === 'geometry_2d_objects' ? 6 : 5
  const normalizedLevel = Math.max(1, Math.min(max, Math.round(Number(level) || 1)))
  return makeProblem(skill, normalizedLevel, skill === 'geometry_2d_objects' ? generate2d(normalizedLevel) : generate3d(normalizedLevel))
}
