import {
  ALL_LEVELS as LEVELS,
  ALL_OPERATIONS,
  ALL_TABLES as TABLES,
  MASTERY_MIN_ATTEMPTS,
  MASTERY_MIN_SUCCESS_RATE
} from '../../../lib/operations'

export { ALL_OPERATIONS, LEVELS, TABLES, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE }
export const DEFAULT_WEEKLY_GOAL = 20
export const DETAIL_LEVEL_ERROR_MIN_ATTEMPTS = 8
export const TEACHER_AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000
export const PASSWORD_RESET_SECTION_ID = 'teacher-password-reset-section'

export const RESULT_HEADER_HELP = {
  today_attempts: 'Antal uppgifter eleven har svarat på idag.',
  today_wrong: 'Visar rätt/fel idag. Ouppmärksamhetsfel räknas som fel här.',
  today_engaged: 'Tid på uppgift = fokus + interaktion, inte bara öppen flik.',
  today_struggle: 'Skill med tydligast kunskapsfel i dagens underlag.',
  today_answer_length: 'Medelantal tecken i elevsvar idag. Tolkas tillsammans med andra mått.',
  week_attempts: 'Antal uppgifter sedan veckostart (måndag 00:00).',
  week_active_time: 'Aktiv tid (svar) summerar svarstiderna på loggade svar.',
  week_engaged: 'Tid på uppgift = fokus + interaktion senaste 7 dagarna.',
  week_wrong: 'Visar rätt/fel under veckan. Se också kunskapsfel/ouppmärksamhet i andra vyer.',
  week_struggle: 'Skill med tydligast kunskapsfel i veckans underlag.',
  week_answer_length: 'Medel antal tecken i elevsvar denna vecka.',
  success_rate: 'Andel rätt av totalt antal försök.',
  reasonable_rate: 'Andel svar inom rimlighetstolerans för respektive uppgift.',
  avg_relative_error: 'Genomsnittlig relativ avvikelse på kunskapsfel.',
  trend: 'Skillnad i träff mellan senaste 10 och föregående 10 svar.'
}

export const DETAIL_LEVEL_ERROR_HELP = {
  operation: 'Räknesätt som nivån tillhör.',
  level: 'Konceptuell nivå (1–12) inom räknesättet.',
  attempts: `Antal försök på nivån. Minst ${DETAIL_LEVEL_ERROR_MIN_ATTEMPTS} krävs för visning.`,
  correct: 'Antal korrekta svar på nivån.',
  wrong: 'Antal felaktiga svar på nivån.',
  error_share: 'Felandel = fel/försök på nivån. Jämför inom samma räknesätt och nivå.',
  knowledge_wrong: 'Fel som klassats som kunskapsfel.',
  inattention_wrong: 'Fel som klassats som ouppmärksamhet.'
}

export const SUPPORT_HEADER_HELP = {
  status: 'Aktivitetsstatus: grön/orange/svart/röd utifrån fokus och senaste interaktion.',
  risk: 'Signal visas bara när en tydlig aktivitetsregel eller minst sex svar ger underlag.',
  evidence: 'Visar antal svar och om historiken är komplett eller begränsad.',
  today_wrong: 'Rätt/fel idag. Tolka tillsammans med mängd och feltyp.',
  week_success: 'Andel rätt under veckan.',
  struggle: 'Skill där eleven visar tydligast kunskapskamp i aktuellt underlag.',
  flags: 'Korta riskkoder som förklarar varför eleven prioriteras.'
}
