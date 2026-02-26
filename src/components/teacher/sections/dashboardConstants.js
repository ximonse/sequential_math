export const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'arithmetic_expressions', 'fractions']
export const SUPPORT_THRESHOLD = 45
export const DEFAULT_WEEKLY_GOAL = 20
export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
export const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)
export const DETAIL_LEVEL_ERROR_MIN_ATTEMPTS = 8
export const TEACHER_AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000
export const PASSWORD_RESET_SECTION_ID = 'teacher-password-reset-section'

export const RESULT_HEADER_HELP = {
  today_attempts: 'Antal uppgifter eleven har svarat pa idag.',
  today_wrong: 'Visar ratt/fel idag. Ouppmarksamhetsfel raknas som fel har.',
  today_engaged: 'Tid pa uppgift = fokus + interaktion, inte bara oppen flik.',
  today_struggle: 'Skill med tydligast kunskapsfel i dagens underlag.',
  today_answer_length: 'Medel antal tecken i elevsvar idag. Tolkas tillsammans med andra matt.',
  week_attempts: 'Antal uppgifter sedan veckostart (mandag 00:00).',
  week_active_time: 'Aktiv tid (svar) summerar speed-tider pa loggade svar.',
  week_engaged: 'Tid pa uppgift = fokus + interaktion senaste 7 dagar.',
  week_wrong: 'Visar ratt/fel under veckan. Se ocksa kunskapsfel/ouppmarksamhet i andra vyer.',
  week_struggle: 'Skill med tydligast kunskapsfel i veckans underlag.',
  week_answer_length: 'Medel antal tecken i elevsvar denna vecka.',
  success_rate: 'Andel ratt av total antal forsok.',
  reasonable_rate: 'Andel svar inom rimlighetstolerans for respektive uppgift.',
  avg_relative_error: 'Genomsnittlig relativ avvikelse pa kunskapsfel.',
  trend: 'Skillnad i traff mellan senaste 10 och foregaende 10 svar.'
}

export const DETAIL_LEVEL_ERROR_HELP = {
  operation: 'Raknesatt som nivan tillhor.',
  level: 'Konceptuell niva (1-12) inom raknesattet.',
  attempts: `Antal forsok pa nivan. Minst ${DETAIL_LEVEL_ERROR_MIN_ATTEMPTS} kravs for visning.`,
  correct: 'Antal korrekta svar pa nivan.',
  wrong: 'Antal felaktiga svar pa nivan.',
  error_share: 'Felandel = Fel/Forsok pa nivan. Jamfor inom samma raknesatt + niva.',
  knowledge_wrong: 'Fel som klassats som kunskapsfel.',
  inattention_wrong: 'Fel som klassats som ouppmarksamhet.'
}

export const SUPPORT_HEADER_HELP = {
  status: 'Aktivitetsstatus: gron/orange/svart/rod utifran fokus och senaste interaktion.',
  risk: 'Riskniva byggs av regelbaserade signaler som inaktivitet, lag traff och liknande.',
  support_score: 'Stodscore (0-100) sammanvager risksignaler for prioritering av insats.',
  today_wrong: 'Ratt/fel idag. Tolka tillsammans med mangd och feltyp.',
  week_success: 'Andel ratt under veckan.',
  struggle: 'Skill dar eleven visar tydligast kunskapskamp i aktuellt underlag.',
  flags: 'Korta riskkoder som forklarar varfor eleven prioriteras.'
}
