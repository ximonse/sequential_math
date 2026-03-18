function FeedbackOverlay({ feedback }) {
  const isPartial = Boolean(feedback?.isPartial)
  const headingClass = !feedback
    ? ''
    : (feedback.correct
      ? (isPartial ? 'text-amber-600' : 'text-green-600')
      : 'text-red-600')
  const headingText = !feedback
    ? ''
    : (feedback.correct
      ? (isPartial ? 'Nästan rätt' : 'Rätt!')
      : 'Inte riktigt')

  return (
    <div className="mt-8 flex flex-col items-center min-h-28">
      <div className="h-10 flex items-center">
        {feedback && (
          <p className={`text-2xl font-bold ${headingClass}`}>
            {headingText}
          </p>
        )}
      </div>

      <div className="h-6 mt-2">
        {feedback && (
          <p className="text-sm text-gray-400">
            {isPartial
              ? (feedback.partialDetail || 'Skriv svaret i förenklad matematisk form.')
              : feedback.correct && feedback.hint
              ? feedback.hint
              : feedback.correct
              ? 'Enter, knappsatsknappen eller vänta...'
              : 'Tryck Enter eller knappsatsknappen när du är redo'}
          </p>
        )}
      </div>
    </div>
  )
}

export default FeedbackOverlay
