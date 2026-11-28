import { geometryQuestions } from '../domains/geometry/questions.js'

const operations = [
  ['addition', 'Addition', 'Räknesättet där tal läggs ihop.'],
  ['subtraction', 'Subtraktion', 'Räknesättet där ett tal dras bort från ett annat.'],
  ['multiplication', 'Multiplikation', 'Räknesättet som ger en produkt. I 3 · 4 finns tre grupper med fyra i varje.'],
  ['division', 'Division', 'Räknesättet som ger en kvot. Talet kan delas i lika stora delar.'],
  ['term', 'Term', 'Ett tal eller uttryck som adderas eller subtraheras. I 8 + 3 är både 8 och 3 termer.'],
  ['sum', 'Summa', 'Resultatet av en addition. I 8 + 3 = 11 är 11 summan.'],
  ['difference', 'Differens', 'Resultatet av en subtraktion. I 9 − 2 = 7 är 7 differensen.'],
  ['factor', 'Faktor', 'Ett tal som multipliceras med ett annat. I 4 · 6 är både 4 och 6 faktorer.'],
  ['product', 'Produkt', 'Resultatet av en multiplikation. I 4 · 6 = 24 är 24 produkten.'],
  ['numerator', 'Täljare', 'Talet över bråkstrecket. I 3/5 är 3 täljaren.'],
  ['denominator', 'Nämnare', 'Talet under bråkstrecket. I 3/5 är 5 nämnaren.'],
  ['quotient', 'Kvot', 'Resultatet av en division. I 24 ÷ 6 = 4 är 4 kvoten.']
].map(([id, title, explanation]) => ({ id, title, explanation }))

const sortingTask = (id, prompt, fields, items) => ({
  id, prompt, fields,
  objects: items.map(([text, field], index) => ({ id: String(index + 1), text, field }))
})

const lineExplanations = {
  line: 'En rak linje fortsätter åt båda hållen utan slutpunkter.',
  ray: 'En stråle har en startpunkt och fortsätter åt ett håll.',
  segment: 'En sträcka går mellan två ändpunkter.',
  diagonal: 'En diagonal är en sträcka mellan två hörn som inte ligger bredvid varandra.'
}
const geometryTasks = geometryQuestions.geometry_lines
const lines = geometryTasks.filter(task => task.minimumLevel === 1).map(task => ({
  id: task.concept,
  title: { line: 'Linje', ray: 'Stråle', segment: 'Sträcka', diagonal: 'Diagonal' }[task.concept],
  explanation: lineExplanations[task.concept],
  image: task.options.find(option => task.correctOptionIds.includes(option.id))?.image
}))

export const conceptDecks = Object.freeze({
  operations: {
    id: 'operations', version: 1, title: 'Räknesättens språk', cards: operations,
    exercises: [
      sortingTask('operations', 'Till vilket räknesätt hör varje uttryck?', ['addition', 'subtraction', 'multiplication', 'division'],
        [['18 ÷ 3', 'division'], ['8 + 3', 'addition'], ['5 · 2', 'multiplication'], ['13 − 6', 'subtraction']]),
      sortingTask('terms', 'Vad heter det markerade talet?', ['term', 'sum', 'difference'],
        [['[7] + 5 = 12', 'term'], ['9 − 6 = [3]', 'difference'], ['6 + 4 = [10]', 'sum'], ['11 − [4] = 7', 'term']]),
      sortingTask('factors', 'Vad heter det markerade talet?', ['factor', 'product'],
        [['2 · 7 = [14]', 'product'], ['[5] · 3 = 15', 'factor'], ['6 · [2] = 12', 'factor']]),
      sortingTask('division', 'Vad heter det markerade talet?', ['numerator', 'denominator', 'quotient'],
        [['[5]/2 = 2,5', 'numerator'], ['9/[3] = 3', 'denominator'], ['21/7 = [3]', 'quotient']]),
      sortingTask('contrast', 'Vad heter det markerade talet?', ['term', 'factor', 'product', 'quotient'],
        [['[4] + 3 = 7', 'term'], ['[4] · 3 = 12', 'factor'], ['3 · 4 = [12]', 'product'], ['48 ÷ 4 = [12]', 'quotient']])
    ]
  },
  'geometry-lines': {
    id: 'geometry-lines', version: 1, title: 'Linje, stråle, sträcka och diagonal', cards: lines,
    exercises: geometryTasks.map(task => ({ id: task.taskId, prompt: task.promptSv, task }))
  }
})

export function getConceptDeck(id) {
  return Object.hasOwn(conceptDecks, id) ? conceptDecks[id] : null
}

const validId = (value, max = 100) => typeof value === 'string' && value.length <= max && /^[a-zA-Z0-9_-]+$/u.test(value)

export function validConceptActivity(event) {
  const deck = getConceptDeck(event?.deckId)
  if (!deck || event.deckVersion !== deck.version || !validId(event.runId)
    || !(event.assignmentId === '' || validId(event.assignmentId)) || !Number.isSafeInteger(event.timestamp) || event.timestamp <= 0) return false
  if (event.kind === 'open' || event.kind === 'open_cards') return true
  if (event.kind === 'flip') return deck.cards.some(card => card.id === event.cardId)
  const exercise = deck.exercises.find(item => item.id === event.exerciseId)
  if (event.kind !== 'answer' || !exercise || !event.answer || typeof event.answer !== 'object') return false
  if (exercise.task) {
    const ids = event.answer
    return Array.isArray(ids) && ids.length > 0 && ids.length <= (exercise.task.responseMode === 'multiple' ? exercise.task.options.length : 1)
      && new Set(ids).size === ids.length && ids.every(id => exercise.task.options.some(option => option.id === id))
  }
  return !Array.isArray(event.answer) && Object.keys(event.answer).length === exercise.objects.length
    && exercise.objects.every(object => Object.hasOwn(event.answer, object.id) && exercise.fields.includes(event.answer[object.id]))
}

export function conceptAnswerResult(exercise, answer) {
  if (exercise.task) {
    const expected = exercise.task.correctOptionIds
    return answer.length === expected.length && expected.every(id => answer.includes(id))
  }
  return exercise.objects.every(object => answer[object.id] === object.field)
}

export function recordConceptActivity(profile, event) {
  if (!validConceptActivity(event)) return false
  const { runId, deckId, deckVersion, assignmentId, classIdAtAttempt, timestamp } = event
  const history = profile.conceptPractice || []
  const previous = history.find(run => run.runId === runId)
  if (previous && (previous.deckId !== deckId || previous.deckVersion !== deckVersion || previous.assignmentId !== assignmentId
    || previous.classIdAtAttempt !== classIdAtAttempt)) return false
  const run = previous || { runId, deckId, deckVersion, assignmentId, classIdAtAttempt, openedAt: timestamp, cards: {}, answers: {} }
  if (previous && event.kind === 'open') return false
  if (event.kind === 'open_cards' || event.kind === 'flip') run.cardsOpenedAt = Math.min(run.cardsOpenedAt || timestamp, timestamp)
  if (event.kind === 'flip' && !Object.hasOwn(run.cards, event.cardId)) run.cards[event.cardId] = timestamp
  if (event.kind === 'answer' && !Object.hasOwn(run.answers, event.exerciseId)) {
    const deck = getConceptDeck(deckId)
    const exercise = deck.exercises.find(item => item.id === event.exerciseId)
    run.answers[event.exerciseId] = { response: event.answer, correct: conceptAnswerResult(exercise, event.answer) }
    if (Object.keys(run.answers).length === deck.exercises.length && assignmentId) {
      const previousTime = profile.assignmentProgress?.[`assignment:${assignmentId}`]?.completedAt || 0
      if (timestamp >= previousTime) {
        profile.assignmentProgress ||= {}
        profile.assignmentProgress[`assignment:${assignmentId}`] = {
          kind: 'concept', assignmentId, assignmentTitle: deck.title, completedAt: timestamp, updatedAt: timestamp
        }
      }
    }
  }
  run.lastAt = Math.max(run.lastAt || 0, timestamp)
  profile.conceptPractice = [...history.filter(item => item !== previous), run].sort((a, b) => a.lastAt - b.lastAt).slice(-40)
  return true
}

export function latestConceptRun(profile, deck, assignmentId = '', classIds = []) {
  return profile?.conceptPractice?.findLast(run => run.deckId === deck.id && run.deckVersion === deck.version
    && run.assignmentId === assignmentId && (!classIds.length || classIds.includes(run.classIdAtAttempt))) ?? null
}

export function summarizeConceptProgress(profile) {
  const history = profile?.conceptPractice || []
  return Object.values(conceptDecks).map(deck => {
    // The stored history is chronological. Opening a deck alone is not completed activity.
    const run = history.findLast(run => run.deckId === deck.id && run.deckVersion === deck.version
      && (deck.cards.some(card => Object.hasOwn(run.cards || {}, card.id))
        || deck.exercises.some(exercise => typeof run.answers?.[exercise.id]?.correct === 'boolean')))
    const turned = deck.cards.filter(card => Object.hasOwn(run?.cards || {}, card.id)).length
    const answers = deck.exercises.map(exercise => run?.answers?.[exercise.id])
      .filter(answer => typeof answer?.correct === 'boolean')
    return { id: deck.id, label: deck.title, turned, cardTotal: deck.cards.length, answered: answers.length,
      exerciseTotal: deck.exercises.length, correct: answers.filter(answer => answer.correct).length }
  })
}
