const body = String(process.env.PR_BODY || '')
const updated = /- \[x\] Berörda manualer, kontrakt och felsökning är uppdaterade\./i.test(body)
const noImpact = /- \[x\] Ingen dokumentation påverkas\. Förklara varför:/i.test(body)

if (updated === noImpact) {
  console.error('Markera exakt ett alternativ under Dokumentation i pull request-mallen.')
  process.exit(1)
}

if (noImpact) {
  const explanation = body.split(/- \[x\] Ingen dokumentation påverkas\. Förklara varför:/i)[1]?.trim() || ''
  if (explanation.length < 8) {
    console.error('Förklara kort varför ändringen inte påverkar dokumentation.')
    process.exit(1)
  }
}

console.log('Dokumentationschecklistan är ifylld.')
