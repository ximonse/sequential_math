// The teacher chooses the order of all questions in a screening (Simon 2026-11-03).
// Each question has a stable key: bank questions by task id, own questions by a uid
// given when they are added (older drafts fall back to their position).
export const newQuestionUid = () => (globalThis.crypto?.randomUUID?.() || `q${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9_-]/gu, '').slice(0, 40)

const own = (kind, tasks) => tasks.map((task, index) => ({ key: task.uid ? `${kind}:${task.uid}` : `${kind}#${index}`, kind, task }))

// Questions in the order they are sent: bank tasks, then own questions in the
// same order as the dispatch's customTasks (written, image, text, unsaved text).
export function screeningQuestions(draft, findTask) {
  const combined = [
    ...draft.selectedTasks.map(id => ({ key: `bank:${id}`, kind: 'bank', task: findTask(id) || { taskId: id, promptSv: id } })),
    ...own('written', draft.writtenTasks || []),
    ...own('image', draft.imageTasks || []),
    ...own('text', draft.textTasks || []),
    ...(draft.customPrompt?.trim() ? [{ key: 'pending', kind: 'text', task: { promptSv: draft.customPrompt } }] : [])
  ].map((item, sendIndex) => ({ ...item, sendIndex }))
  // Without a chosen order the teacher's own questions come first.
  const rank = { written: 0, text: 1, image: 2, bank: 3 }
  const defaults = [...combined].sort((a, b) => (a.key === 'pending') - (b.key === 'pending') || rank[a.kind] - rank[b.kind] || a.sendIndex - b.sendIndex)
  const chosen = Array.isArray(draft.order) ? draft.order : []
  const position = item => { const index = chosen.indexOf(item.key); return index < 0 ? chosen.length + defaults.indexOf(item) : index }
  return [...combined].sort((a, b) => position(a) - position(b))
}

// Moves one question up or down and returns the new order of keys.
export function moveQuestion(questions, key, step) {
  const keys = questions.map(item => item.key)
  const from = keys.indexOf(key), to = from + step
  if (from < 0 || to < 0 || to >= keys.length) return keys
  ;[keys[from], keys[to]] = [keys[to], keys[from]]
  return keys
}

// The order sent to the server: positions in [...taskIds, ...customTasks].
export const dispatchOrder = questions => questions.map(item => item.sendIndex)
