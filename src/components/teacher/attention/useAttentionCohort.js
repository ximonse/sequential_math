import { useEffect, useState } from 'react'
import useAttentionGroup from './useAttentionGroup'

export default function useAttentionCohort(students) {
  const key = students.map(student => student.studentId).sort().join(',')
  const [snapshot, setSnapshot] = useState({ key: '', students: [], asOf: null })
  // Freeze the roster and read results until explicit refresh. Dashboard polls
  // and class/group filters must not silently change the comparison population.
  useEffect(() => {
    if (key !== snapshot.key) setSnapshot({ key, students: [...students], asOf: Date.now() })
  }, [key, snapshot.key, students])
  const { records } = useAttentionGroup(snapshot.students)
  const current = snapshot.key === key
  const ready = current && snapshot.students.length > 0 && snapshot.students.every(student => records[student.studentId]?.status === 'ready')
  return { records: current ? records : {}, roster: current ? snapshot.students : [], ready, asOf: snapshot.asOf,
    refresh: () => setSnapshot({ key, students: [...students], asOf: Date.now() }) }
}
