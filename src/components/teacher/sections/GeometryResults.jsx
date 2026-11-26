import { useMemo } from 'react'
import { summarizeGeometry } from '../../../domains/geometry/statistics.js'

export default function GeometryResults({ students, classIds }) {
  const rows = useMemo(() => summarizeGeometry(students || [], classIds), [students, classIds])
  if (!rows.length) return null
  return <section className="mb-4 rounded-lg bg-white p-3 shadow" aria-label="Geometriresultat">
    <h2 className="text-lg font-semibold text-gray-800">Geometri</h2>
    <p className="mb-2 text-sm text-gray-600">Senaste svaren i valt urval, sorterade efter antal fel.</p>
    <table className="w-full text-left text-sm">
      <thead><tr className="border-b"><th scope="col">Begrepp</th><th scope="col">Fel</th><th scope="col">Svar</th><th scope="col">Andel fel</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.concept} className="border-b last:border-0">
        <th scope="row" className="py-1 font-medium">{row.label}</th>
        <td>{row.wrong}</td><td>{row.answers}</td><td>{Math.round(100 * row.wrong / row.answers)} %</td>
      </tr>)}</tbody>
    </table>
  </section>
}
