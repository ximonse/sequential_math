import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { DESCRIPTIONS_PENDING, ERROR_MODELS, TITLES_AWAITING_REVIEW, hasDescription } from './catalog.js'
import { getDomain } from '../registry.js'
import { predictableCandidates } from './index.js'
import examples from './catalogExamples.json' with { type: 'json' }

// Rule R-A in docs/STYRNING_FELFORSTAELSER.md: the catalogue is the only
// source for error models. These checks fail when a model is emitted without
// an entry, when an entry is incomplete, or when a new file starts to name
// model ids on its own.
const root = process.cwd()
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? (entry.name === 'node_modules' ? [] : walk(join(dir, entry.name))) : [join(dir, entry.name)])
const sources = ['src', 'api', 'mcp/sequential-math/src'].flatMap(dir => walk(join(root, dir)))
  .filter(file => /\.(?:js|jsx|mjs)$/u.test(file) && !/\.test\./u.test(file))
  .map(file => ({ file: relative(root, file).replace(/\\/gu, '/'), text: readFileSync(file, 'utf8') }))
const ids = Object.keys(ERROR_MODELS)

// Files that compute what a model predicts. An id written there is a model the engine can emit.
const ENGINE = ['src/domains/predictableErrors/arithmetic.js', 'src/domains/predictableErrors/fractions.js',
  'src/domains/predictableErrors/expressions.js', 'src/domains/predictableErrors/percentage.js',
  'src/domains/predictableErrors/algebra.js', 'src/domains/predictableErrors/fluency.js',
  'src/domains/predictableErrors/core.js', 'src/domains/arithmetic/subtractionCandidates.js',
  'src/lib/evidencePredictableAnalysis.js']
const emitted = new Set(sources.filter(source => ENGINE.includes(source.file)).flatMap(source =>
  [...source.text.matchAll(/(?:prediction|push|add)\('([a-z_0-9]+)'|\['(expression_[a-z_]+)'|modelId: '([a-z_0-9]+)'/gu)]
    .map(match => match[1] || match[2] || match[3])))

// Other files that may refer to a model by id, each with its reason. A file
// outside this list that names a model id fails the test; add it here only
// when it points at a model and does not sort, title or describe one.
const MAY_REFER = {
  'src/domains/predictableErrors/catalog.js': 'the catalogue',
  'src/domains/predictableErrors/modelDescriptions.js': 'descriptions, part of the catalogue',
  'src/domains/predictableErrors/misconceptions.js': 'misconceptions behind the models, part of the catalogue',
  'src/domains/predictableErrors/probeCatalog.js': 'advisory probe per model',
  'src/domains/arithmetic/didacticPackages.js': 'approved package bound to a model',
  'src/domains/arithmetic/decimalAdditionPackage.js': 'approved package bound to a model',
  'src/domains/arithmetic/decimalSubtractionPackage.js': 'approved package bound to a model',
  'src/domains/arithmetic/decimalMultiplicationPackage.js': 'approved package bound to a model',
  // Stored labels from the older analysis at answer time share some names with
  // models. They are history and mastery input, not the catalogue.
  'src/domains/arithmetic/analyzeError.js': 'older stored labels',
  'src/domains/arithmetic/errorHypotheses/additionHypotheses.js': 'older stored labels',
  'src/domains/arithmetic/errorHypotheses/subtractionHypotheses.js': 'older stored labels',
  'src/domains/arithmetic/errorHypotheses/multiplicationHypotheses.js': 'older stored labels',
  'src/domains/arithmetic/errorHypotheses/divisionHypotheses.js': 'older stored labels',
  'src/domains/arithmetic/errorHypotheses/commonHypotheses.js': 'older stored labels',
}

describe('error model catalogue', () => {
  it('has an entry for every model the engine can emit, and no entry without a model', () => {
    expect([...emitted].filter(id => !ERROR_MODELS[id])).toEqual([])
    expect(ids.filter(id => !emitted.has(id))).toEqual([])
  })

  it('gives every model a title, a kind and registered domains', () => {
    for (const id of ids) {
      const model = ERROR_MODELS[id]
      expect(model.titleSv?.trim(), id).toBeTruthy()
      expect(['misconception', 'observation', 'input', 'gave_up'], id).toContain(model.kind)
      expect(model.domains.length, id).toBeGreaterThan(0)
      for (const domain of model.domains) expect(getDomain(domain), `${id}: ${domain}`).toBeTruthy()
      if (model.family) expect(model.kind, id).toBe('misconception')
    }
    expect(new Set(Object.values(ERROR_MODELS).map(model => model.titleSv)).size).toBe(ids.length)
  })

  it('describes the thinking behind every model or lists it as open debt', () => {
    expect(ids.filter(id => !hasDescription(id)).sort()).toEqual([...DESCRIPTIONS_PENDING].sort())
    expect(TITLES_AWAITING_REVIEW.filter(id => !ERROR_MODELS[id])).toEqual([])
  })

  it('lets no file outside the catalogue name a model id', () => {
    const quoted = new RegExp(`['"\`](?:${ids.join('|')})['"\`]|\\b(?:${ids.join('|')}):`, 'u')
    const offenders = sources.filter(source => !ENGINE.includes(source.file) && !MAY_REFER[source.file] && quoted.test(source.text))
      .map(source => source.file)
    expect(offenders).toEqual([])
  })

  // The notebook mismatch needs a saved notebook and is covered by notebookMismatch.test.js.
  const WITHOUT_EXAMPLES = ['notebook_answer_mismatch']
  it('keeps at least three answers each model must catch and three it must not', () => {
    expect(ids.filter(id => !examples.models[id] && !WITHOUT_EXAMPLES.includes(id))).toEqual([])
    for (const [id, { hit, miss }] of Object.entries(examples.models)) {
      expect(ERROR_MODELS[id], id).toBeTruthy()
      expect(hit.length, id).toBeGreaterThanOrEqual(3)
      expect(miss.length, id).toBeGreaterThanOrEqual(3)
      const caught = example => predictableCandidates(example.problem, example.answer).matches.some(match => match.modelId === id)
      for (const example of hit) expect(caught(example), `${id} should catch ${JSON.stringify(example)}`).toBe(true)
      for (const example of miss) expect(caught(example), `${id} should not catch ${JSON.stringify(example)}`).toBe(false)
    }
  })
})
