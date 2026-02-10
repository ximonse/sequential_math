function FeedbackDisplay({ feedback, onContinue }) {
  if (!feedback) return null

  const { correct, correctAnswer, studentAnswer } = feedback

  return (
    <div className="mt-8 text-center">
      {correct ? (
        <div className="animate-bounce">
          <div className="text-6xl mb-4">&#10004;</div>
          <p className="text-3xl font-bold text-green-600">Rätt!</p>
        </div>
      ) : (
        <div>
          <div className="text-6xl mb-4 text-red-500">&#10006;</div>
          <p className="text-2xl font-bold text-red-600 mb-2">
            Inte riktigt
          </p>
          <p className="text-xl text-gray-600">
            Rätt svar: <span className="font-bold text-gray-800">{correctAnswer}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Du svarade: {studentAnswer}
          </p>
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-6 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-xl transition-colors"
      >
        Nästa uppgift
      </button>
    </div>
  )
}

export default FeedbackDisplay
