import { generateGeometryProblem } from './generate'
import { verifyGeometryContent } from './verifyContent'
import { evaluateGeometryProblem } from './evaluate'
import { analyzeGeometryError } from './analyzeError'
import GeometryDisplay from './GeometryDisplay'

const geometryDomain = {
  id: 'geometry', label: 'Geometri',
  skills: [
    { id: 'geometry_2d_objects', label: 'Plana geometriska objekt', levels: [1, 6] },
    { id: 'geometry_3d_objects', label: 'Geometriska kroppar', levels: [1, 5] }
  ],
  generate: generateGeometryProblem,
  verifyContent: verifyGeometryContent,
  Display: GeometryDisplay,
  evaluate: evaluateGeometryProblem,
  analyzeError: analyzeGeometryError,
  normalizeLegacyProblem(problem) { return problem }
}

export default geometryDomain

