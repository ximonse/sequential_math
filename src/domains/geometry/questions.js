import { figureRef, findScreeningFigure } from '../arithmetic/screeningFigures.js'

const concepts = {
  geometry_lines: [
    ['line', 'Linje', 'line-line'], ['ray', 'Stråle', 'line-ray'],
    ['segment', 'Sträcka', 'line-segment'], ['diagonal', 'Diagonal', 'pentagon-diagonal']
  ],
  geometry_plane: [
    ['polygon', 'Månghörning', 'pentagon-irregular'], ['triangle', 'Triangel', 'triangle-rotated'],
    ['quadrilateral', 'Fyrhörning', 'quadrilateral-irregular'], ['pentagon', 'Femhörning', 'pentagon-standard'],
    ['hexagon', 'Sexhörning', 'hexagon-irregular'], ['rectangle', 'Rektangel', 'rectangle-rotated'],
    ['square', 'Kvadrat', 'square-rotated'], ['rhombus', 'Romb', 'rhombus-standard'],
    ['parallelogram', 'Parallellogram', 'parallelogram-standard'], ['trapezoid', 'Parallelltrapets', 'trapezoid-standard'],
    ['circle', 'Cirkel', 'circle-standard']
  ],
  geometry_solids: [
    ['cuboid', 'Rätblock', 'cuboid-standard'], ['cube', 'Kub', 'cube-standard'], ['pyramid', 'Pyramid', 'pyramid-standard'],
    ['cone', 'Kon', 'cone-standard'], ['sphere', 'Klot', 'sphere-standard'], ['cylinder', 'Cylinder', 'cylinder-standard']
  ]
}

export const geometryLabels = Object.fromEntries(Object.values(concepts).flat().map(([id, name]) => [id, name]))

function matchesConcept(figureId, concept) {
  const figure = findScreeningFigure(figureId)
  if (!figure) return false
  if (concept === 'polygon') return figure.dimensions === 2 && Boolean(figure.properties.sides)
  if (concept === 'cuboid' && figure.kind === 'cube') return true
  if (concept === 'segment' && figure.tags.includes('diagonal')) return true
  return figure.tags.includes(geometryLabels[concept]?.toLocaleLowerCase('sv'))
}

const picture = imageId => ({ id: imageId, image: figureRef(imageId) })
const name = id => ({ id, labelSv: geometryLabels[id] })

function imageQuestion(skill, [concept, label, figureId], group) {
  const matching = concept === 'polygon' ? [figureId, 'triangle-standard', 'hexagon-irregular']
    : concept === 'rectangle' ? [figureId, 'square-standard']
    : concept === 'rhombus' ? [figureId, 'square-rotated'] : [figureId]
  const pool = [...group.map(([, , ref]) => ref), 'circle-standard', 'line-segment']
  const wrong = [...new Set(pool)].filter(id => !matchesConcept(id, concept)).slice(0, 4 - matching.length)
  const multiple = matching.length > 1
  const prompts = {
    polygon: 'Markera alla månghörningar.', rectangle: 'Markera alla rektanglar.', rhombus: 'Markera alla romber.',
    diagonal: 'Vilken bild visar en markerad diagonal?', trapezoid: 'Vilken bild visar en fyrhörning med exakt ett par parallella sidor?'
  }
  return {
    taskId: `${concept}-image`, taskVersion: 1, concept, skill, minimumLevel: 1,
    promptSv: prompts[concept] || `Vilken bild visar ${['cuboid', 'parallelogram', 'sphere'].includes(concept) ? 'ett' : 'en'} ${label.toLocaleLowerCase('sv')}?`,
    responseMode: multiple ? 'multiple' : 'single', images: [],
    options: [...matching, ...wrong].map(picture), correctOptionIds: matching
  }
}

function nameQuestion(skill, [concept, , figureId], group) {
  const figures = concept === 'polygon' ? [figureId, 'triangle-standard', 'hexagon-irregular'] : [figureId]
  const distractors = group.map(([id]) => id).filter(id => !figures.every(figure => matchesConcept(figure, id))).slice(0, 3)
  const prompts = {
    diagonal: 'Vad heter den markerade sträckan mellan hörnen?',
    polygon: 'Vilket namn passar alla figurerna på bilderna?',
    trapezoid: 'Vad heter fyrhörningen med exakt ett par parallella sidor?'
  }
  return {
    taskId: `${concept}-name`, taskVersion: 1, concept, skill, minimumLevel: 2,
    promptSv: prompts[concept] || (skill === 'geometry_solids' ? 'Vad heter kroppen?' : 'Vad heter det som bilden visar?'),
    responseMode: 'name', images: figures.map(figureRef),
    options: [concept, ...distractors].map(name), correctOptionIds: [concept]
  }
}

const planeVariation = [
  {
    taskId: 'square-contrast-angles', concept: 'square', promptSv: 'Vilken figur är en kvadrat?',
    figureIds: ['square-standard', 'rhombus-equal-sides'], correctOptionIds: ['square-standard'],
    explanationSv: 'Båda figurerna har lika långa sidor. Kvadraten har också fyra räta vinklar.'
  },
  {
    taskId: 'square-contrast-rotation', concept: 'square', promptSv: 'Vilken figur är en kvadrat?',
    figureIds: ['square-turned-same-size', 'rhombus-equal-sides'], correctOptionIds: ['square-turned-same-size'],
    explanationSv: 'När kvadraten vrids har den fortfarande fyra lika långa sidor och fyra räta vinklar.'
  },
  {
    taskId: 'square-contrast-scale', concept: 'square', promptSv: 'Vilken figur är en kvadrat?',
    figureIds: ['square-small', 'rhombus-equal-sides'], correctOptionIds: ['square-small'],
    explanationSv: 'En liten kvadrat har fortfarande lika långa sidor och fyra räta vinklar.'
  },
  {
    taskId: 'rectangle-contrast-square', concept: 'rectangle', promptSv: 'Markera alla rektanglar.',
    figureIds: ['rectangle-standard', 'square-standard', 'rhombus-equal-sides', 'parallelogram-standard'],
    correctOptionIds: ['rectangle-standard', 'square-standard'],
    explanationSv: 'En rektangel har fyra räta vinklar. Därför är kvadraten också en rektangel.'
  }
].map(({ figureIds, ...task }) => ({
  ...task, taskVersion: 1, skill: 'geometry_plane', minimumLevel: 1, images: [],
  responseMode: task.correctOptionIds.length > 1 ? 'multiple' : 'single',
  options: figureIds.map(picture)
}))

function imageQuestions(skill, group) {
  return group.flatMap(item => {
    const question = imageQuestion(skill, item, group)
    // Introduce the contrast before the older rectangle question shows the same inclusion.
    return question.taskId === 'hexagon-image' ? [question, ...planeVariation] : [question]
  })
}

export const geometryQuestions = Object.fromEntries(Object.entries(concepts).map(([skill, group]) => [skill, [
  ...imageQuestions(skill, group),
  ...group.map(item => nameQuestion(skill, item, group))
]]))

export const geometryQuestionById = Object.fromEntries(Object.values(geometryQuestions).flat().map(task => [task.taskId, task]))

export function encodeGeometrySelection(ids) {
  return [...ids].sort().join(',')
}

export function decodeGeometrySelection(answer) {
  return typeof answer === 'string' && answer ? answer.split(',') : []
}
