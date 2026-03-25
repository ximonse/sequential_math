/**
 * Explicit merge-schema för elevprofiler.
 * Varje fält i profilen MÅSTE ha en definierad merge-strategi.
 * Om ett fält saknas i schemat → test failure → tvingar oss att tänka igenom merge.
 */

export const MERGE_SCHEMA = {
  // Identitet
  studentId:         { strategy: 'keep_existing', description: 'Normaliserat ID, ändras aldrig' },
  name:              { strategy: 'prefer_fresher', description: 'Senast uppdaterat namn vinner' },
  grade:             { strategy: 'prefer_fresher', description: 'Årskurs' },
  created_at:        { strategy: 'min', description: 'Äldsta tidsstämpel behålls' },

  // Svårighetsgrad
  currentDifficulty: { strategy: 'max_clamped', description: 'Max av alla, minimum 1' },
  highestDifficulty: { strategy: 'max', description: 'Max av alla candidates' },

  // Adaptiv motor
  adaptive:          { strategy: 'custom', handler: 'mergeAdaptive', description: 'operationAbilities tar max, skillStates tar version med flest försök' },

  // Aktivitetsspårning
  activity:          { strategy: 'custom', handler: 'mergeActivity', description: 'Senaste presence/interaction vinner' },

  // Mastery (append-only)
  masteryFacts:      { strategy: 'union_append', handler: 'mergeMasteryFacts', description: 'Union av facts, dedup per op+level, union av revokedIds' },

  // Problemlogg
  problemLog:        { strategy: 'dedup_union', limit: 5000, description: 'Dedup + union, trimmas till 5000' },
  recentProblems:    { strategy: 'dedup_union', limit: 250, description: 'Dedup + union, trimmas till 250' },

  // Statistik
  stats:             { strategy: 'derive_from_log', handler: 'mergeStats', description: 'Beräknas från mergade loggar' },

  // Cache (ignoreras vid merge)
  teacherSummary:    { strategy: 'ignore', description: 'Cache, beräknas klient-side' },
  effectiveLevels:   { strategy: 'removed', description: 'Borttagen dubblett av teacherSummary.effectiveLevels' },

  // Tabellträning
  tableDrill:        { strategy: 'custom', handler: 'mergeTableDrill', description: 'Union av completions' },

  // Telemetri
  telemetry:         { strategy: 'custom', handler: 'mergeTelemetry', description: 'Max av räknare, senaste timestamp' },

  // Biljetter (gamification)
  ticketResponses:   { strategy: 'custom', handler: 'mergeTicketResponses', description: 'Union av biljett-svar' },
  ticketRevealAll:   { strategy: 'custom', handler: 'mergeTicketRevealAll', description: 'Merge av reveal-state' },
  ticketInbox:       { strategy: 'custom', handler: 'mergeTicketInbox', description: 'Union av inbox-biljetter' },

  // Auth
  auth:              { strategy: 'custom', handler: 'mergeAuth', description: 'Hashed lösenord, föredra nyare' },

  // Klassmedlemskap
  classId:           { strategy: 'custom', handler: 'mergeClassMembership', description: 'Primär klass-ID' },
  classIds:          { strategy: 'custom', handler: 'mergeClassMembership', description: 'Alla klass-IDs (union)' },
  className:         { strategy: 'custom', handler: 'mergeClassMembership', description: 'Klassnamn' },

  // Spel-highscores
  pongHighScore:     { strategy: 'max', description: 'Högsta pong-poäng' },
  recentSelections:  { strategy: 'prefer_fresher', description: 'Senaste val i adaptiva motorn' },
}

/**
 * Hämta alla definierade profilfält.
 */
export function getSchemaFields() {
  return Object.keys(MERGE_SCHEMA)
}

/**
 * Kolla om ett fält har definierad merge-strategi.
 */
export function hasFieldStrategy(fieldName) {
  return fieldName in MERGE_SCHEMA
}

/**
 * Hitta fält som saknar merge-strategi.
 */
export function findUndefinedFields(profileKeys) {
  return profileKeys.filter(key => !hasFieldStrategy(key))
}
