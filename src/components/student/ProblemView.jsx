import ProblemDisplay from './ProblemDisplay'
import GeometryProblemView from './GeometryProblemView.jsx'
import { getDefaultDomainId, getDomain } from '../../domains/registry'

function ProblemView(props) {
  if (props.problem?.domain === 'geometry') return <GeometryProblemView {...props} />
  const domainId = String(props?.problem?.domain || getDefaultDomainId())
  const domain = getDomain(domainId)
  const DisplayComponent = domain?.Display || ProblemDisplay
  return <DisplayComponent {...props} />
}

export default ProblemView
