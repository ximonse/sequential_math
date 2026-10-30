// Invented observations only. Method flags simulate a separate human review;
// the prototype does not infer written methods from answers or images.
export const response = (taskId, answer, options = {}) => ({
  id: `synthetic-${taskId}`, taskId, answer, status: 'answered',
  method: 'consistent', saved: true, ...options
})
export const reviewedHistory = (taskId, answer, options = {}) => response(taskId, answer, {
  id: `synthetic-history-${taskId}`, selectedForScope: true,
  selectionReason: 'Synthetic reviewer selected a comparable current example.',
  snapshotRevision: 'synthetic-snapshot-1', ...options
})
export const cases = [
  { id: 'new-pupil', title: 'Ingen historik: baslinje, två kontraster, sedan stopp',
    answers: [response('sub-no-exchange-001', 533), response('sub-exchange-001', 425), response('sub-exchange-002', 325)],
    expected: ['ask:sub-no-exchange-001', 'ask:sub-exchange-001', 'ask:sub-exchange-002', 'stop:supported'] },
  { id: 'history-confirmation', title: 'Relevant tidigare arbete: en ny bekräftelse räcker',
    history: [reviewedHistory('sub-exchange-001', 425)], answers: [response('sub-exchange-002', 325)],
    expected: ['ask:sub-exchange-002', 'stop:supported'] },
  { id: 'column-error', title: 'Modellförenligt felsvar: AG3-kontroll och annan skriftlig kontrast',
    answers: [response('sub-no-exchange-001', 533), response('sub-exchange-001', 435), response('pilot-ag3-a', 5), response('sub-exchange-002', 335)],
    expected: ['ask:sub-no-exchange-001', 'ask:sub-exchange-001', 'ask:pilot-ag3-a', 'ask:sub-exchange-002', 'stop:needs_review'] },
  { id: 'zero-column-error', title: 'Noll i omöjlig kolumn: ingen automatisk orsaksdiagnos',
    answers: [response('sub-no-exchange-001', 533), response('sub-exchange-001', 430), response('pilot-ag3-a', 5), response('sub-exchange-002', 330)],
    expected: ['ask:sub-no-exchange-001', 'ask:sub-exchange-001', 'ask:pilot-ag3-a', 'ask:sub-exchange-002', 'stop:needs_review'] },
  { id: 'weak-prerequisite', title: 'Osäker AG3: pröva förkunskap utan att följa place_value_error',
    answers: [response('sub-no-exchange-001', 533), response('sub-exchange-001', 435), response('pilot-ag3-a', 2, { patterns: ['place_value_error'] }), response('pilot-ag3-b', 3)],
    expected: ['ask:sub-no-exchange-001', 'ask:sub-exchange-001', 'ask:pilot-ag3-a', 'ask:pilot-ag3-b', 'stop:needs_review'] },
  { id: 'contradictory-method', title: 'Rätt slutsvar men felaktigt granskat resonemang',
    history: [reviewedHistory('sub-exchange-001', 425)], answers: [response('sub-exchange-002', 325, { method: 'contradictory' })],
    expected: ['ask:sub-exchange-002', 'stop:needs_review'] },
  { id: 'blank-work', title: 'Sparat arbete utan slutsvar ger inget kunskapsbesked',
    answers: [response('sub-no-exchange-001', '', { status: 'blank', hasWork: true })],
    expected: ['ask:sub-no-exchange-001', 'stop:insufficient'] },
  { id: 'interruption', title: 'Avbrott: inget nästa diagnostiskt steg',
    answers: [response('sub-no-exchange-001', '', { status: 'interrupted' })],
    expected: ['ask:sub-no-exchange-001', 'stop:insufficient'] },
  { id: 'unsaved-answer', title: 'Sparbekräftelse saknas: håll kvar frågan',
    answers: [response('sub-no-exchange-001', 533, { saved: false })],
    expected: ['ask:sub-no-exchange-001', 'wait:save_pending'] },
  { id: 'unreviewed-method', title: 'Två rätta kontraster utan metodgranskning är inte säker förståelse',
    answers: [response('sub-no-exchange-001', 533), response('sub-exchange-001', 425, { method: 'unreviewed' }), response('sub-exchange-002', 325, { method: 'unreviewed' })],
    expected: ['ask:sub-no-exchange-001', 'ask:sub-exchange-001', 'ask:sub-exchange-002', 'stop:needs_review'] },
  { id: 'through-zero', title: 'Genom noll har eget delmoment och egen bekräftelse', scope: 'through_zero',
    history: [reviewedHistory('sub-through-zero-001', 224)], answers: [response('sub-through-zero-002', 236)],
    expected: ['ask:sub-through-zero-002', 'stop:supported'] }
]
