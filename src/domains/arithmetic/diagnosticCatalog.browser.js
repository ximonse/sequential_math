import writtenManifest from './diagnosticTasks.v1.json'
import writtenPacks from './diagnosticTaskPacks.v1.json'
import ncmManifest from './ncmScreeningTasks.v1.json'
import { buildDiagnosticCatalog } from './diagnosticCatalog.js'

export const diagnosticCatalog = buildDiagnosticCatalog({ writtenManifest, writtenPacks, ncmManifest })
