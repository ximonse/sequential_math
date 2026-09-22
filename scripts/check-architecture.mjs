import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const REVIEW_LINE_COUNT = 600
const MAX_LINE_COUNT = 800
const roots = ['api', 'src']
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs'])

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(path))
    else if (extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path)
  }
  return files
}

const sourceFiles = (await Promise.all(roots.map(collectFiles))).flat()
const counted = await Promise.all(sourceFiles.map(async path => {
  const content = await readFile(path, 'utf8')
  return { path: relative(process.cwd(), path), lines: content ? content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0) : 0 }
}))
const review = counted.filter(file => file.lines >= REVIEW_LINE_COUNT).sort((a, b) => b.lines - a.lines)
const violations = counted.filter(file => file.lines > MAX_LINE_COUNT).sort((a, b) => b.lines - a.lines)

if (review.length) {
  console.log(`Files at or above ${REVIEW_LINE_COUNT} lines require an architecture assessment:`)
  for (const file of review) console.log(`- ${file.path}: ${file.lines}`)
} else {
  console.log(`All checked source files are below ${REVIEW_LINE_COUNT} lines.`)
}

if (violations.length) {
  console.error(`Files over the ${MAX_LINE_COUNT}-line CI limit:`)
  for (const file of violations) console.error(`- ${file.path}: ${file.lines}`)
  process.exitCode = 1
}
