export default function PracticeSpeechControls({ speech }) {
  if (!speech.available) return null
  const toggleLabel = speech.automatic ? 'Stäng av automatisk uppläsning' : 'Slå på automatisk uppläsning'
  return <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-gray-600">
    <span>Håll på texten för att lyssna.</span>
    {speech.canToggleAutomatic && <button type="button" aria-label={toggleLabel} title={toggleLabel}
      className="min-h-11 min-w-11 rounded-lg border border-gray-300 bg-white text-base hover:bg-gray-50"
      onClick={speech.toggleAutomatic}>
      <span aria-hidden="true">{speech.automatic ? '🔊' : '🔇'}</span>
    </button>}
  </div>
}
