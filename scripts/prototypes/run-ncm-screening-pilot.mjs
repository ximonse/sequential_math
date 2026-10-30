// Emits a synthetic audit trail to stdout. No network, database or app writes.
import { decidePilot, RULE_VERSION } from './ncm-screening-pilot.mjs'
import { cases } from './ncm-screening-pilot.fixtures.mjs'

const results = cases.map(fixture => {
  const responses = [], trace = []
  let decision = decidePilot({ ...fixture, responses })
  trace.push(decision)
  for (const answer of fixture.answers) {
    if (decision.action !== 'ask' || decision.task.id !== answer.taskId) throw Error(`Unexpected path in ${fixture.id}`)
    responses.push(answer)
    decision = decidePilot({ ...fixture, responses })
    trace.push(decision)
  }
  const signatures = trace.map(step => `${step.action}:${step.task?.id || step.outcome || step.reasonCode}`)
  if (JSON.stringify(signatures) !== JSON.stringify(fixture.expected)) throw Error(`Decision regression: ${fixture.id}`)
  return { id: fixture.id, title: fixture.title, synthetic: true,
    history: fixture.history || [], responses, trace }
})
console.log(JSON.stringify({ ruleVersion: RULE_VERSION, coverage: 'M02/N2 within the full NCM backbone',
  limitations: ['Synthetic only; not integrated in the app', 'Method flags and history eligibility are simulated reviewer judgements',
    'Two examples and five questions are pilot rules, not validated diagnostic thresholds',
    'No inference about untested subskills, no mastery writes, no autonomous dispatch'], results }, null, 2))
