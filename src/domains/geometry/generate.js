import { attachEvidenceClaim, EVIDENCE_CLASSES } from '../../lib/evidenceContract'
import { pickFromRotation } from '../../lib/rotationPicker'
import { option, SHAPES_2D, SOLIDS, QUADRILATERAL_RELATIONS } from './geometryModel'

const PHRASES = [
  'Vilket svar passar figuren?', 'Studera figuren. Vad visar den?',
  'Välj det mest precisa namnet.', 'Vad heter det markerade objektet?',
  'Vilket alternativ beskriver bilden?', 'Titta noga på egenskaperna. Vad är det?',
  'Vilket geometriskt begrepp stämmer?', 'Identifiera objektet i skissen.',
  'Vad ska stå på ritningens etikett?', 'Vilken beskrivning är korrekt?'
]

const pick = (key, values) => pickFromRotation(key, values)
const shuffledOptions = (correct, distractors) => {
  const values = [correct, ...distractors]
  const shift = Math.floor(Math.random() * values.length)
  return values.slice(shift).concat(values.slice(0, shift))
}

function makeProblem(skill, level, spec) {
  const prompt = spec.prompt || pick(`geometry:${skill}:${level}:phrase`, PHRASES)
  const problem = {
    id: `geo_${skill}_${level}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    domain: 'geometry', skill, level, type: skill,
    difficulty: { conceptual_level: level },
    display: { type: 'geometry_choice', text: prompt },
    values: { ...spec.values, options: spec.options },
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
    const kind = pick('geometry:2d:l1:kind', ['line', 'ray', 'segment'])
    return { template: `primitive_${kind}`, representation: 'diagram', values: { questionKind: 'line_primitive', subject: { kind } }, correct: kind,
      options: shuffledOptions(option(kind, { line: 'linje', ray: 'stråle', segment: 'sträcka' }[kind]), [option('line', 'linje', 'line_ray_segment_confusion'), option('ray', 'stråle', 'line_ray_segment_confusion'), option('segment', 'sträcka', 'line_ray_segment_confusion')].filter(x => x.id !== kind)) }
  }
  if (level === 2) {
    const sides = pick('geometry:2d:l2:sides', [3, 4, 5, 6])
    const correct = Object.keys(SHAPES_2D).find(key => SHAPES_2D[key].sides === sides && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(key))
    return { template: `polygon_${sides}`, representation: 'diagram', values: { questionKind: 'polygon_sides', subject: { sides } }, correct,
      options: shuffledOptions(option(correct, SHAPES_2D[correct].label), [3, 4, 5, 6].filter(n => n !== sides).map(n => { const id = Object.keys(SHAPES_2D).find(k => SHAPES_2D[k].sides === n && ['triangle', 'quadrilateral', 'pentagon', 'hexagon'].includes(k)); return option(id, SHAPES_2D[id].label, 'polygon_side_count') })) }
  }
  if (level === 3) {
    const kind = pick('geometry:2d:l3:shape', ['triangle', 'quadrilateral', 'circle', 'pentagon', 'hexagon'])
    const distractors = ['triangle', 'quadrilateral', 'circle', 'pentagon', 'hexagon'].filter(x => x !== kind).slice(0, 3).map(x => option(x, SHAPES_2D[x].label, 'visual_prototype_bias'))
    return { template: `recognize_${kind}`, representation: pick('geometry:2d:l3:rep', ['diagram_rotated', 'diagram_stretched']), values: { questionKind: 'shape_identity', subject: { kind, rotation: Math.floor(Math.random() * 4) * 15 } }, correct: kind, options: shuffledOptions(option(kind, SHAPES_2D[kind].label), distractors) }
  }
  if (level === 4) {
    const relation = pick('geometry:2d:l4:relation', Object.keys(QUADRILATERAL_RELATIONS))
    const [from, to] = relation.split('_')
    const correct = QUADRILATERAL_RELATIONS[relation] ? 'yes' : 'no'
    return { template: `relation_${relation}`, representation: 'text_property', prompt: `Är varje ${SHAPES_2D[from].label} också en ${SHAPES_2D[to].label}?`, values: { questionKind: 'quadrilateral_relation', subject: { from, to } }, correct,
      options: [option('yes', 'Ja', correct === 'no' ? 'category_overgeneralization' : ''), option('no', 'Nej', correct === 'yes' ? 'square_not_rectangle' : '')] }
  }
  if (level === 5) {
    const part = pick('geometry:2d:l5:part', ['center', 'radius', 'diameter'])
    const labels = { center: 'centrum', radius: 'radie', diameter: 'diameter' }
    return { template: `circle_${part}`, representation: 'marked_diagram', values: { questionKind: 'circle_part', subject: { part } }, correct: part,
      options: shuffledOptions(option(part, labels[part]), Object.keys(labels).filter(x => x !== part).map(x => option(x, labels[x], 'radius_diameter_confusion'))) }
  }
  const clue = pick('geometry:2d:l6:clue', [
    ['square', 'fyra lika långa sidor och fyra räta vinklar'], ['rectangle', 'fyra räta vinklar, men alla sidor behöver inte vara lika långa'],
    ['rhombus', 'fyra lika långa sidor, men vinklarna behöver inte vara räta'], ['parallelogram', 'motstående sidor är parallella']
  ])
  const correct = clue[0]
  return { template: `properties_${correct}`, representation: 'text_property', prompt: `${pick('geometry:2d:l6:phrase', PHRASES)} Ledtråd: ${clue[1]}.`, values: { questionKind: 'quadrilateral_properties', subject: { kind: correct } }, correct,
    options: ['square', 'rectangle', 'rhombus', 'parallelogram'].map(x => option(x, SHAPES_2D[x].label, x === correct ? '' : 'quadrilateral_property_confusion')) }
}

function generate3d(level) {
  const ids = Object.keys(SOLIDS)
  if (level === 1) {
    const kind = pick('geometry:3d:l1:solid', ids)
    return { template: `recognize_${kind}`, representation: pick('geometry:3d:l1:rep', ['wireframe', 'silhouette']), values: { questionKind: 'solid_identity', subject: { kind } }, correct: kind,
      options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'solid_identity_confusion'))) }
  }
  if (level === 2) {
    const kind = pick('geometry:3d:l2:kind', ['cube', 'cuboid'])
    return { template: `cube_cuboid_${kind}`, representation: pick('geometry:3d:l2:rep', ['wireframe_wide', 'wireframe_tall', 'wireframe_rotated']), values: { questionKind: 'solid_identity', subject: { kind } }, correct: kind,
      options: [option('cube', 'kub', kind === 'cuboid' ? 'cube_cuboid_confusion' : ''), option('cuboid', 'rätblock', kind === 'cube' ? 'cube_cuboid_confusion' : '')] }
  }
  if (level === 3) {
    const kind = pick('geometry:3d:l3:kind', ['cube', 'cuboid', 'pyramid'])
    const property = pick('geometry:3d:l3:property', ['faces', 'edges', 'vertices'])
    const labels = { faces: 'sidoytor', edges: 'kanter', vertices: 'hörn' }
    const correct = String(SOLIDS[kind][property])
    const nums = Array.from(new Set([correct, String(Math.max(0, Number(correct) - 1)), String(Number(correct) + 1), property === 'faces' ? '8' : '6']))
    return { template: `count_${kind}_${property}`, representation: 'wireframe_count', prompt: `Hur många ${labels[property]} har en ${SOLIDS[kind].label}?`, values: { questionKind: 'solid_count', subject: { kind, property } }, correct,
      options: nums.map(n => option(n, n, n === correct ? '' : 'faces_edges_vertices_confusion')) }
  }
  if (level === 4) {
    const kind = pick('geometry:3d:l4:kind', ids)
    const correct = kind
    return { template: `faces_${kind}`, representation: 'text_property', prompt: `${pick('geometry:3d:l4:phrase', PHRASES)} Ledtråd: ${SOLIDS[kind].faceShape}.`, values: { questionKind: 'solid_face_shapes', subject: { kind, faceShape: SOLIDS[kind].faceShape } }, correct,
      options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'face_shape_confusion'))) }
  }
  const kind = pick('geometry:3d:l5:kind', ids)
  return { template: `infer_${kind}`, representation: 'multi_clue_text', prompt: `${pick('geometry:3d:l5:phrase', PHRASES)} Jag har ${SOLIDS[kind].faces} sidoytor, ${SOLIDS[kind].edges} kanter, ${SOLIDS[kind].vertices} hörn och ${SOLIDS[kind].faceShape}.`, values: { questionKind: 'solid_clues', subject: { kind, faces: SOLIDS[kind].faces, edges: SOLIDS[kind].edges, vertices: SOLIDS[kind].vertices, faceShape: SOLIDS[kind].faceShape } }, correct: kind,
    options: shuffledOptions(option(kind, SOLIDS[kind].label), ids.filter(x => x !== kind).slice(0, 3).map(x => option(x, SOLIDS[x].label, 'faces_edges_vertices_confusion'))) }
}

export function generateGeometryProblem(skill, level) {
  const max = skill === 'geometry_2d_objects' ? 6 : 5
  const normalizedLevel = Math.max(1, Math.min(max, Math.round(Number(level) || 1)))
  return makeProblem(skill, normalizedLevel, skill === 'geometry_2d_objects' ? generate2d(normalizedLevel) : generate3d(normalizedLevel))
}
