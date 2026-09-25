// The pupil loop: read task, check it, press the keys, submit, move on.
import { answerText, fillAnswer, pressKeys, readState, submit, waitForTask } from './app.js'
import { checkAnswerKey, checkChosenContent, domainVerify, taskKey, taskLabel, taskLevel, taskOperation } from './checks.js'

function wrongAnswer(text) {
  const n = Number(String(text).replace(',', '.'))
  if (Number.isFinite(n)) return String(n + 7).replace('.', ',')
  return '9999'
}

const norm = value => String(value ?? '').replace(/\s+/g, '').replace('−', '-').replace('.', ',')

export async function answerTasks(page, findings, { count, choice, strategy = 'correct', breakChoice, onTask, stopWhen, onLeave, thinkMs = 0 } = {}) {
  const log = []
  const practiceUrl = page.url()
  for (let i = 0; i < count; i++) {
    let { state, interruptions, timedOut, text, left } = await waitForTask(page, { breakChoice })
    if (left && onLeave && await onLeave(log)) {
      ;({ state, interruptions, timedOut, text, left } = await waitForTask(page, { breakChoice }))
    }
    if (left) {
      if (!onLeave) findings.add('R4', 'Eleven hamnade utanför övningen utan att ha valt det', { efter: i, url: page.url(), start: practiceUrl })
      break
    }
    if (timedOut) {
      if (!/\/practice/.test(page.url())) findings.add('R4', 'Eleven hamnade utanför övningen utan att ha valt det', { efter: i, url: page.url(), start: practiceUrl })
      else findings.add('R3', 'Ingen ny uppgift kom fram', { efter: i, fas: state?.phase, skärm: text })
      break
    }
    const problem = state.problem
    checkChosenContent(problem, choice, findings)
    checkAnswerKey(problem, findings)
    const verdict = await domainVerify(page, problem)
    if (verdict && verdict.valid === false) findings.add('C1', 'Appens egen innehållskontroll underkänner uppgiften', { uppgift: taskLabel(problem), orsak: verdict.reason })

    const correctText = answerText(problem)
    const wantCorrect = typeof strategy === 'function' ? strategy(i, problem) : strategy !== 'wrong'
    const toType = wantCorrect ? correctText : wrongAnswer(correctText)
    if (!correctText) findings.add('C1', 'Uppgiften saknar facit', { uppgift: taskLabel(problem) })

    if (thinkMs) await page.waitForTimeout(thinkMs)
    const pressed = await pressKeys(page, toType)
    if (!pressed.typed) {
      findings.add('C1', 'Svaret går inte att skriva med knapparna på skärmen', { uppgift: taskLabel(problem), svar: toType, saknas: pressed.missing.join(' ') })
      await fillAnswer(page, toType)
    } else {
      const after = await readState(page)
      if (norm(after.inputValue) !== norm(toType)) findings.add('R3', 'Knapptrycken gav inte det som trycktes', { uppgift: taskLabel(problem), tryckte: toType, rutan: after.inputValue })
    }
    await submit(page)
    await page.waitForTimeout(30)
    const judged = await readState(page)
    if (judged.phase === 'feedback' && judged.feedback) {
      if (wantCorrect && judged.feedback.correct !== true) findings.add('C1', 'Rätt svar bedömdes som fel', { uppgift: taskLabel(problem), svar: toType })
      if (!wantCorrect && judged.feedback.correct === true) findings.add('C1', 'Fel svar bedömdes som rätt', { uppgift: taskLabel(problem), svar: toType })
    }
    const entry = { i, key: taskKey(problem), op: taskOperation(problem), type: problem.type, level: taskLevel(problem), correct: wantCorrect, answer: toType, rightAnswer: correctText, interruptions, reason: problem?.metadata?.selectionReason, purpose: problem?.metadata?.trainingPurpose }
    log.push(entry)
    if (onTask) await onTask(entry, problem)
    if (stopWhen && stopWhen(log)) break
  }
  return log
}

export async function waitForServerAnswers(request, studentId, minimum, readServerProfile, timeout = 10000) {
  const start = Date.now()
  let profile = null
  while (Date.now() - start < timeout) {
    profile = await readServerProfile(request, studentId)
    const n = (profile?.problemLog?.length ?? 0)
    if (n >= minimum) return { ok: true, count: n, profile }
    await new Promise(r => setTimeout(r, 300))
  }
  return { ok: false, count: (profile?.problemLog?.length ?? 0), profile }
}
