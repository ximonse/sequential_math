// These adaptive fields are persisted by their own evidence events. Repeating
// their histories in every checkpoint makes ordinary sessions exceed 32 kB.
export const EVENT_OWNED_ADAPTIVE_FIELDS = [
  'decisionHistory', 'lastDecision', 'currentNeedHistory', 'currentNeeds'
]
