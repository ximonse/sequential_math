// Writes robots/report/latest.md: every rule violation the robots found,
// grouped by rule, with a few concrete examples each.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES } from './findings.js'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../report')

export default class RobotReporter {
  constructor() { this.results = [] }
  onTestEnd(test, result) {
    const attachment = result.attachments.find(a => a.name === 'robot-findings')
    const data = attachment?.body ? JSON.parse(attachment.body.toString()) : { items: [], stats: {} }
    this.results.push({ title: test.title, file: path.basename(test.location.file), status: result.status, error: result.error?.message, ...data })
  }
  onEnd() {
    fs.mkdirSync(outDir, { recursive: true })
    const lines = [`# Robotrapport`, '', `Körd ${new Date().toISOString()}`, '']
    const all = this.results.flatMap(r => r.items.map(item => ({ ...item, test: r.title })))
    lines.push(`**${all.length} olika regelbrott** i ${this.results.length} robotkörningar.`, '')
    for (const [rule, title] of Object.entries(RULES)) {
      const hits = all.filter(item => item.rule === rule)
      lines.push(`## ${rule} — ${title}`, '')
      if (hits.length === 0) { lines.push('Inga brott hittade.', ''); continue }
      for (const hit of hits) {
        lines.push(`- **${hit.message}** (${hit.count} ggr, robot: ${hit.test})`)
        for (const example of hit.examples) lines.push(`  - \`${JSON.stringify(example).slice(0, 400)}\``)
      }
      lines.push('')
    }
    lines.push('## Körningar', '', '| Robot | Status | Statistik |', '| --- | --- | --- |')
    for (const r of this.results) {
      const stats = Object.entries(r.stats || {}).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ')
      lines.push(`| ${r.title} | ${r.status}${r.error ? ` (${r.error.split('\n')[0].slice(0, 120)})` : ''} | ${stats.replace(/\|/g, '/')} |`)
    }
    fs.writeFileSync(path.join(outDir, 'latest.md'), lines.join('\n') + '\n')
    fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(this.results, null, 2))
    console.log(`\nRobotrapport: robots/report/latest.md (${all.length} regelbrott)`)
  }
}
