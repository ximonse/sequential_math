// Choices after a finished round or level sit at the top of the screen, away from
// the answer keys, so a pupil still tapping answers does not pick one by accident.
function CompletionChoices({ choices }) {
  return (
    <nav aria-label="Vad vill du göra nu?" className="w-full max-w-lg pt-4 pb-6">
      <p className="mb-2 text-center text-sm font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
        Vad vill du göra nu?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {choices.map(choice => (
          <button
            key={choice.label}
            type="button"
            onClick={choice.onClick}
            className={`rounded-lg px-4 py-2 font-semibold shadow ${choice.primary
              ? 'bg-white text-gray-900 hover:bg-gray-100'
              : 'bg-white/80 text-gray-700 hover:bg-white'}`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default CompletionChoices
