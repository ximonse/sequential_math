import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ADAPTIVE_QA_STUDENT_ID, installAdaptiveQaFixture } from './adaptiveQaFixture'

function AdaptiveQaBootstrap() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      installAdaptiveQaFixture({ reset: searchParams.get('reset') === '1' })
      navigate(`/student/${ADAPTIVE_QA_STUDENT_ID}/practice?mode=addition`, { replace: true })
    } catch (fixtureError) {
      setError(String(fixtureError?.message || 'QA-fixturen kunde inte startas.'))
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className={error ? 'text-red-700' : 'text-slate-600'}>
        {error || 'Startar isolerad adaptivitetskontroll...'}
      </p>
    </div>
  )
}

export default AdaptiveQaBootstrap
