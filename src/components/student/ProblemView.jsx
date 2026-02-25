import ProblemDisplay from './ProblemDisplay'
import { getDefaultDomainId, getDomain } from '../../domains/registry'

function ProblemView(props) {
  const domainId = String(props?.problem?.domain || getDefaultDomainId())
  const domain = getDomain(domainId)
  const DisplayComponent = domain?.Display || ProblemDisplay
  return <DisplayComponent {...props} />
}

export default ProblemView
