function FeedbackOverlay({ feedback }) {
  return (
    <div className="mt-8 flex flex-col items-center min-h-28">
      <div className="h-10 flex items-center">
        {feedback && (
          <p className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.correct ? 'Rätt!' : 'Inte riktigt'}
          </p>
        )}
      </div>

      <div className="h-6 mt-2">
        {feedback && (
          <p className="text-sm text-gray-400">
            {feedback.correct
              ? 'Enter, knappsatsknappen eller vänta...'
              : 'Tryck Enter eller knappsatsknappen när du är redo'}
          </p>
        )}
      </div>
    </div>
  )
}

export default FeedbackOverlay
