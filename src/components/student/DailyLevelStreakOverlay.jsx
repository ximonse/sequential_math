import CompletionChoices from './CompletionChoices'

const LEVEL_STREAK_VIDEO_URL = 'https://www.youtube.com/watch?v=ZbZSe6N_BXs'

function DailyLevelStreakOverlay({ milestone, onContinue, onGoHome }) {
  if (!milestone) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-gradient-to-br from-violet-600 to-fuchsia-700 px-6 pointer-events-auto">
      <CompletionChoices choices={[
        { label: 'Fortsätt', onClick: onContinue, primary: true },
        ...(onGoHome ? [{ label: 'Till startsidan', onClick: onGoHome }] : [])
      ]} />
      <div className="text-center">
        <div className="text-7xl mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">🔥</div>
        <h2 className="text-5xl font-extrabold text-yellow-200 mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">
          Epic-level!
        </h2>
        <p className="text-xl text-white mb-6 drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]">
          Du är en nivå-maskin. Dags för belöningslåt!
        </p>
        <a
          href={LEVEL_STREAK_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-violet-700 font-bold shadow-lg hover:bg-violet-50 text-lg"
        >
          ▶ Öppna belöningsvideo
        </a>
      </div>
    </div>
  )
}

export default DailyLevelStreakOverlay
