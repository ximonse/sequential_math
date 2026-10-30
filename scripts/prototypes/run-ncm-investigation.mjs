// Deterministic synthetic report only. No app import, credentials, fetch or file writes.
import { decideInvestigation, INVESTIGATION_RULE_VERSION } from './ncm-investigation.mjs'
import { investigationTrace } from './ncm-investigation.fixtures.mjs'

const results = ['single_exchange', 'fraction_comparison'].map(scope => ({ scope, synthetic: true,
  trace: investigationTrace(scope).map(input => ({ input, decision: decideInvestigation(input) })) }))
console.log(JSON.stringify({ ruleVersion: INVESTIGATION_RULE_VERSION,
  limitations: ['Simulated reviewer and teaching notes', 'No automatic handwriting or method interpretation',
    'No validated question counts, follow-up interval or pedagogical effect', 'No app/API integration or pupil writes'], results }, null, 2))
