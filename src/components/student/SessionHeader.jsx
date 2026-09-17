function SessionHeader({
  profileName,
  sessionCount,
  streak,
  onExit
}) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-8 sm:pr-44">
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{profileName}</p>
        <p className="text-xs text-gray-400">
          {sessionCount} denna session
        </p>
      </div>

      {streak >= 3 && (
        <div className="bg-yellow-100 px-3 py-1 rounded-full">
          <span className="text-yellow-700 font-semibold">
            &#128293; {streak} i rad!
          </span>
        </div>
      )}

      <button
        onClick={onExit}
        className="text-gray-400 hover:text-gray-600"
      >
        Startsida
      </button>
    </div>
  )
}

export default SessionHeader
