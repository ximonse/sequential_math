const rotationStore = new Map()

function shuffle(values) {
  const items = [...values]
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }
  return items
}

function pickFirstWithoutRepeat(queue, lastValue) {
  if (!Array.isArray(queue) || queue.length <= 1) return queue
  if (lastValue === undefined || lastValue === null) return queue
  if (queue[0] !== lastValue) return queue

  const replacementIndex = queue.findIndex(item => item !== lastValue)
  if (replacementIndex <= 0) return queue

  const next = [...queue]
  const first = next[0]
  next[0] = next[replacementIndex]
  next[replacementIndex] = first
  return next
}

export function pickFromRotation(key, values) {
  const list = Array.isArray(values) ? values : []
  if (list.length === 0) return undefined
  if (list.length === 1) return list[0]

  const signature = String(key || '')
  const existing = rotationStore.get(signature)
  const isValid = existing
    && Array.isArray(existing.values)
    && existing.values.length === list.length
    && existing.values.every((item, index) => item === list[index])
    && Array.isArray(existing.queue)

  let bucket = isValid
    ? existing
    : {
      values: [...list],
      queue: [],
      lastValue: undefined
    }

  if (bucket.queue.length === 0) {
    const shuffled = shuffle(list)
    bucket.queue = pickFirstWithoutRepeat(shuffled, bucket.lastValue)
  }

  const nextValue = bucket.queue.shift()
  bucket.lastValue = nextValue
  rotationStore.set(signature, bucket)
  return nextValue
}

export function resetRotationStore() {
  rotationStore.clear()
}
