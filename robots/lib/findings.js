// Collects rule violations during a robot run. Each test attaches its
// findings; the reporter turns them into one readable report.
export const RULES = {
  R1: 'Det jag väljer är det jag får',
  R2: 'Det jag valt ligger kvar tills jag själv ändrar det',
  R3: 'Det jag trycker på händer',
  R4: 'Appen gör ingenting bakom min rygg',
  C1: 'Uppgiften är rätt och går att svara på',
  V1: 'Uppgifterna varierar',
  L1: 'Lärarvyn visar det eleverna faktiskt gjorde',
  T1: 'Texten på skärmen är hel och begriplig'
}

export function createFindings(testInfo) {
  const items = []
  const stats = {}
  return {
    add(rule, message, details = {}) {
      const key = `${rule}|${message}`
      const existing = items.find(item => item.key === key)
      if (existing) { existing.count++; if (existing.examples.length < 3) existing.examples.push(details); return }
      items.push({ key, rule, message, count: 1, examples: [details] })
    },
    stat(name, value) { stats[name] = value },
    get items() { return items },
    async attach() {
      await testInfo.attach('robot-findings', {
        body: JSON.stringify({ title: testInfo.title, items, stats }, null, 2),
        contentType: 'application/json'
      })
    }
  }
}
