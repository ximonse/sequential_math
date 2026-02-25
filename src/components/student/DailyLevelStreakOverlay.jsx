const LEVEL_STREAK_VIDEO_URL = 'https://www.youtube.com/watch?v=ZbZSe6N_BXs'

function DailyLevelStreakOverlay({ milestone, onContinue }) {
  if (!milestone) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-700 cursor-pointer pointer-events-auto"
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onContinue() }
      }}
    >
      <div className="text-center px-6" onClick={(e) => e.stopPropagation()}>
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
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-violet-700 font-bold shadow-lg hover:bg-violet-50 text-lg mb-6"
        >
          ▶ Öppna belöningsvideo
        </a>
        <p className="text-sm text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          Tryck var som helst för att fortsätta
        </p>
      </div>
    </div>
  )
}

export default DailyLevelStreakOverlay
