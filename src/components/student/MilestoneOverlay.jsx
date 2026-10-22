import CompletionChoices from './CompletionChoices'

function getMilestoneIcon(milestone) {
  if (!milestone) return '🎉'
  if (milestone.masteredAllTablesToday) return '👑'
  if (milestone.finalCelebration) return '🏆'
  if (milestone.boss) return '😎'
  return '🎉'
}

function getMilestoneTitle(milestone) {
  if (!milestone) return ''
  if (milestone.masteredAllTablesToday) return 'ALLA TABELLER!'
  if (milestone.masteredTwoToNineToday) return 'TABELL-BOSS!'
  if (milestone.finalCelebration) return 'Lysande!'
  if (milestone.boss) return 'Like a boss'
  return `${milestone.table}:an klar!`
}

function getMilestoneText(milestone) {
  if (!milestone) return ''

  const message = milestone.masteredAllTablesToday
    ? 'Du har klarat ALLA tabeller idag — 2:an till 12:an! Dags för belöningsvideo!'
    : milestone.masteredTwoToNineToday
      ? 'Du har klarat 2:an till 9:an idag. Dags för boss-låt!'
      : milestone.finalCelebration
      ? 'Du klarade alla valda tabeller.'
      : milestone.boss
        ? `${milestone.table}:an klar ${milestone.completionCountToday} gånger idag.`
        : 'Grymt jobbat!'

  const suffix = milestone.remainingTablesCount > 0
    ? `${milestone.remainingTablesCount} tabell(er) kvar.`
    : milestone.finalCelebration
      ? ''
      : 'Klar för slutfirning!'

  return `${message} ${suffix}`.trim()
}

function MilestoneOverlay({
  milestone,
  tableBossUrl,
  allTablesBossUrl,
  onContinue,
  onGoHome
}) {
  if (!milestone) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center px-4 pointer-events-auto">
      <CompletionChoices choices={[
        { label: 'Fortsätt', onClick: onContinue, primary: true },
        ...(onGoHome ? [{ label: 'Till startsidan', onClick: onGoHome }] : [])
      ]} />
      <div className="text-center">
        <div className="text-7xl mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">
          {getMilestoneIcon(milestone)}
        </div>
        <h2 className={`text-6xl font-extrabold mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] ${
          milestone.finalCelebration ? 'text-emerald-200' : 'text-yellow-200'
        }`}
        >
          {getMilestoneTitle(milestone)}
        </h2>
        <p className="text-xl text-white mb-6 drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]">
          {getMilestoneText(milestone)}
        </p>
        {(milestone.masteredAllTablesToday || milestone.masteredTwoToNineToday) && (
          <a
            href={milestone.masteredAllTablesToday ? allTablesBossUrl : tableBossUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold shadow hover:bg-blue-50"
          >
            {milestone.masteredAllTablesToday ? 'Öppna belöningsvideo' : 'Öppna boss-video'}
          </a>
        )}
      </div>
    </div>
  )
}

export default MilestoneOverlay
