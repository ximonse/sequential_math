function SessionHeader({
  profileName,
  sessionCount,
  streak,
  onExit
}) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
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
        Avsluta
      </button>
    </div>
  )
}

export default SessionHeader
