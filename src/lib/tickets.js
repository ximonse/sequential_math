const TICKET_TEMPLATES_KEY = 'mathapp_ticket_templates_v1'
const TICKET_DISPATCHES_KEY = 'mathapp_ticket_dispatches_v1'

function readJsonList(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJsonList(key, items) {
  localStorage.setItem(key, JSON.stringify(Array.isArray(items) ? items : []))
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getTicketTemplates() {
  return readJsonList(TICKET_TEMPLATES_KEY)
}

export function createTicketTemplate(input = {}) {
  const now = Date.now()
  const template = {
    id: makeId('tkt'),
    question: String(input.question || '').trim(),
    answer: String(input.answer || '').trim(),
    tags: normalizeTags(input.tags),
    kind: input.kind === 'exit' ? 'exit' : 'start',
    createdAt: now,
    updatedAt: now
  }
  if (!template.question || !template.answer) return null

  const templates = getTicketTemplates()
  templates.unshift(template)
  writeJsonList(TICKET_TEMPLATES_KEY, templates)
  return template
}

export function updateTicketTemplate(templateId, patch = {}) {
  if (!templateId) return null
  const templates = getTicketTemplates()
  const idx = templates.findIndex(item => item.id === templateId)
  if (idx < 0) return null

  const previous = templates[idx]
  const next = {
    ...previous,
    question: typeof patch.question === 'string' ? patch.question.trim() : previous.question,
    answer: typeof patch.answer === 'string' ? patch.answer.trim() : previous.answer,
    tags: patch.tags ? normalizeTags(patch.tags) : previous.tags,
    kind: patch.kind === 'exit' ? 'exit' : (patch.kind === 'start' ? 'start' : previous.kind),
    updatedAt: Date.now()
  }
  templates[idx] = next
  writeJsonList(TICKET_TEMPLATES_KEY, templates)
  return next
}

export function deleteTicketTemplate(templateId) {
  if (!templateId) return
  const next = getTicketTemplates().filter(item => item.id !== templateId)
  writeJsonList(TICKET_TEMPLATES_KEY, next)
}

export function importTicketTemplatesFromCsv(csvText, options = {}) {
  const rows = parseTicketCsvRows(csvText)
  if (rows.length === 0) {
    return { imported: 0, skipped: 0 }
  }

  const kind = options.kind === 'exit' ? 'exit' : 'start'
  const templates = getTicketTemplates()
  let imported = 0
  let skipped = 0
  const seen = new Set(templates.map(item => `${item.question}@@${item.answer}`.toLowerCase()))

  for (const row of rows) {
    const question = row.question.trim()
    const answer = row.answer.trim()
    if (!question || !answer) {
      skipped += 1
      continue
    }
    const dedupeKey = `${question}@@${answer}`.toLowerCase()
    if (seen.has(dedupeKey)) {
      skipped += 1
      continue
    }
    seen.add(dedupeKey)
    const now = Date.now()
    templates.unshift({
      id: makeId('tkt'),
      question,
      answer,
      tags: normalizeTags(row.tags),
      kind,
      createdAt: now,
      updatedAt: now
    })
    imported += 1
  }

  writeJsonList(TICKET_TEMPLATES_KEY, templates)
  return { imported, skipped }
}

export function getTicketDispatches() {
  return readJsonList(TICKET_DISPATCHES_KEY)
}

export function getTicketDispatchById(dispatchId) {
  if (!dispatchId) return null
  return getTicketDispatches().find(item => item.id === dispatchId) || null
}

export function createTicketDispatch(input = {}) {
  const question = String(input.question || '').trim()
  const answer = String(input.answer || '').trim()
  if (!question || !answer) return null

  const now = Date.now()
  const dispatch = {
    id: makeId('tdp'),
    title: String(input.title || '').trim() || `Ticket ${new Date(now).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`,
    ticketId: String(input.ticketId || ''),
    question,
    answer,
    tags: normalizeTags(input.tags),
    kind: input.kind === 'exit' ? 'exit' : 'start',
    showCorrectnessOnSubmit: input.showCorrectnessOnSubmit !== false,
    createdAt: now,
    updatedAt: now
  }

  const dispatches = getTicketDispatches()
  dispatches.unshift(dispatch)
  writeJsonList(TICKET_DISPATCHES_KEY, dispatches)
  return dispatch
}

export function deleteTicketDispatch(dispatchId) {
  if (!dispatchId) return
  const next = getTicketDispatches().filter(item => item.id !== dispatchId)
  writeJsonList(TICKET_DISPATCHES_KEY, next)
}

export function setTicketDispatchReveal(dispatchId, revealCorrectness = true) {
  if (!dispatchId) return null
  const dispatches = getTicketDispatches()
  const idx = dispatches.findIndex(item => item.id === dispatchId)
  if (idx < 0) return null

  const next = {
    ...dispatches[idx],
    revealCorrectness: revealCorrectness === true,
    revealUpdatedAt: Date.now(),
    updatedAt: Date.now()
  }
  dispatches[idx] = next
  writeJsonList(TICKET_DISPATCHES_KEY, dispatches)
  return next
}

export function recordTicketDispatchTargets(dispatchId, targetStudentIds = []) {
  if (!dispatchId) return null
  const dispatches = getTicketDispatches()
  const idx = dispatches.findIndex(item => item.id === dispatchId)
  if (idx < 0) return null

  const now = Date.now()
  const normalizedTargets = Array.from(new Set(
    (Array.isArray(targetStudentIds) ? targetStudentIds : [])
      .map(item => String(item || '').trim())
      .filter(Boolean)
  ))
  const existingTargets = Array.isArray(dispatches[idx].targetStudentIds)
    ? dispatches[idx].targetStudentIds
    : []
  const mergedTargets = Array.from(new Set([...existingTargets, ...normalizedTargets]))

  const next = {
    ...dispatches[idx],
    targetStudentIds: mergedTargets,
    lastPublishedAt: now,
    updatedAt: now
  }
  dispatches[idx] = next
  writeJsonList(TICKET_DISPATCHES_KEY, dispatches)
  return next
}

export function buildTicketLink(dispatch) {
  if (!dispatch?.id) return ''
  const encoded = encodeTicketPayload({
    dispatchId: dispatch.id,
    ticketId: dispatch.ticketId || '',
    title: dispatch.title || '',
    kind: dispatch.kind || 'start',
    question: dispatch.question || '',
    answer: dispatch.answer || '',
    showCorrectnessOnSubmit: dispatch.showCorrectnessOnSubmit !== false
  })
  const base = window.location.origin
  return `${base}/?ticket=${encodeURIComponent(dispatch.id)}&ticket_payload=${encodeURIComponent(encoded)}`
}

export function encodeTicketPayload(payload = {}) {
  const json = JSON.stringify(payload)
  return toBase64Url(json)
}

export function decodeTicketPayload(encoded) {
  if (!encoded) return null
  try {
    const json = fromBase64Url(String(encoded))
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.dispatchId || !parsed.question) return null
    return {
      dispatchId: String(parsed.dispatchId),
      ticketId: String(parsed.ticketId || ''),
      title: String(parsed.title || ''),
      kind: parsed.kind === 'exit' ? 'exit' : 'start',
      question: String(parsed.question || ''),
      answer: String(parsed.answer || ''),
      showCorrectnessOnSubmit: parsed.showCorrectnessOnSubmit !== false
    }
  } catch {
    return null
  }
}

export function getTicketResponseForDispatch(profile, dispatchId) {
  if (!profile || !dispatchId) return null
  const responses = Array.isArray(profile.ticketResponses) ? profile.ticketResponses : []
  return responses.find(item => item.dispatchId === dispatchId) || null
}

export function recordTicketResponse(profile, input = {}) {
  if (!profile || !input.dispatchId) return null
  const now = Date.now()
  if (!Array.isArray(profile.ticketResponses)) {
    profile.ticketResponses = []
  }
  if (!profile.ticketRevealAll || typeof profile.ticketRevealAll !== 'object') {
    profile.ticketRevealAll = {}
  }

  const studentAnswer = String(input.studentAnswer || '')
  const evaluation = evaluateTicketAnswer(input.answer, studentAnswer)
  const existingIdx = profile.ticketResponses.findIndex(item => item.dispatchId === input.dispatchId)
  const revealByTeacherAt = Number(profile.ticketRevealAll[input.dispatchId] || 0)

  const next = {
    dispatchId: String(input.dispatchId),
    ticketId: String(input.ticketId || ''),
    title: String(input.title || ''),
    kind: input.kind === 'exit' ? 'exit' : 'start',
    question: String(input.question || ''),
    expectedAnswer: String(input.answer || ''),
    studentAnswer,
    isCorrect: evaluation.correct,
    normalizedStudentAnswer: evaluation.normalizedActual,
    normalizedExpectedAnswer: evaluation.normalizedExpected,
    answeredAt: now,
    showCorrectnessOnSubmit: input.showCorrectnessOnSubmit !== false,
    teacherRevealAt: revealByTeacherAt > 0 ? revealByTeacherAt : null
  }

  if (existingIdx >= 0) {
    profile.ticketResponses[existingIdx] = next
  } else {
    profile.ticketResponses.unshift(next)
    if (profile.ticketResponses.length > 500) {
      profile.ticketResponses = profile.ticketResponses.slice(0, 500)
    }
  }

  return next
}

export function setTicketRevealAllForProfile(profile, dispatchId, reveal = true) {
  if (!profile || !dispatchId) return
  if (!profile.ticketRevealAll || typeof profile.ticketRevealAll !== 'object') {
    profile.ticketRevealAll = {}
  }
  const now = Date.now()
  if (reveal) {
    profile.ticketRevealAll[dispatchId] = now
  } else {
    delete profile.ticketRevealAll[dispatchId]
  }

  if (!Array.isArray(profile.ticketResponses)) return
  profile.ticketResponses = profile.ticketResponses.map(item => {
    if (item.dispatchId !== dispatchId) return item
    return {
      ...item,
      teacherRevealAt: reveal ? now : null
    }
  })
}

export function isTicketCorrectnessVisible(profile, response, dispatchPayload) {
  if (response?.showCorrectnessOnSubmit) return true
  if (response?.teacherRevealAt) return true
  const revealMap = profile?.ticketRevealAll
  if (revealMap && typeof revealMap === 'object') {
    const dispatchId = response?.dispatchId || dispatchPayload?.dispatchId
    if (dispatchId && Number(revealMap[dispatchId] || 0) > 0) return true
  }
  if (dispatchPayload?.showCorrectnessOnSubmit) return true
  return false
}

export function evaluateTicketAnswer(expectedAnswer, actualAnswer) {
  const expectedRaw = String(expectedAnswer || '').trim()
  const actualRaw = String(actualAnswer || '').trim()

  const expectedNum = parseTicketNumber(expectedRaw)
  const actualNum = parseTicketNumber(actualRaw)

  if (expectedNum !== null && actualNum !== null) {
    const correct = Math.abs(expectedNum - actualNum) < 1e-9
    return {
      correct,
      normalizedExpected: expectedNum.toString(),
      normalizedActual: actualNum.toString()
    }
  }

  const normalizedExpected = normalizeTextAnswer(expectedRaw)
  const normalizedActual = normalizeTextAnswer(actualRaw)
  return {
    correct: normalizedExpected !== '' && normalizedExpected === normalizedActual,
    normalizedExpected,
    normalizedActual
  }
}

export function normalizeTags(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(
      value
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ))
  }
  return Array.from(new Set(
    String(value || '')
      .split(/[,\n;]/)
      .map(item => item.trim())
      .filter(Boolean)
  ))
}

export function parseTicketCsvRows(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const rows = []
  for (const line of lines) {
    const parts = line.split(';')
    if (parts.length < 2) continue
    const [question, answer, tags = ''] = parts
    rows.push({
      question: String(question || '').trim(),
      answer: String(answer || '').trim(),
      tags: String(tags || '').trim()
    })
  }
  return rows
}

function parseTicketNumber(value) {
  if (value === '') return null
  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function normalizeTextAnswer(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding === 2) base64 += '=='
  else if (padding === 3) base64 += '='
  else if (padding !== 0) throw new Error('Invalid base64url')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
