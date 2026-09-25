// Scans the text a person can actually see (screen-reader-only text is
// skipped) for things that should never reach the screen: leaked values
// such as undefined/NaN, internal codes, and Swedish words spelt without
// å, ä and ö.

// Swedish words that only look like this when å/ä/ö have been dropped.
const ASCII_SWEDISH = [
  'ratt', 'fel ratt', 'nivan', 'nivaer', 'tranad', 'tranat', 'traning', 'oversikt', 'klassoversikt', 'elevoversikt',
  'forsok', 'nasta', 'larare', 'lararen', 'larar', 'sakerhet', 'traffsakerhet', 'uppfoljning', 'hjalp', 'pa nivan',
  'morkt', 'gulgron', 'fardig', 'borja', 'losenord', 'svarighet', 'manad', 'vecka for', 'rakna', 'raknesatt', 'battre',
  'hamta', 'ga till', 'sa har', 'fran', 'forst', 'lage', 'uppgiften ar', 'du ar', 'det ar', 'har ar', 'och sa'
]
const LEAKS = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\bnull\b/, /\bInfinity\b/]
const INTERNAL = /\b[a-z]+(?:_[a-z0-9]+){1,}\b/ // snake_case identifiers such as cloud_merged
const EPOCH = /\b1[6-9]\d{11}\b/ // raw millisecond timestamps

export async function visibleText(page) {
  return page.evaluate(() => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = node.textContent.replace(/\s+/g, ' ').trim()
      if (!text) continue
      const el = node.parentElement
      if (!el || el.closest('script,style,noscript,[aria-hidden="true"]')) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const rect = el.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) continue
      out.push(text)
    }
    for (const el of document.querySelectorAll('option, [placeholder], [title]')) {
      const text = el.tagName === 'OPTION' ? el.textContent : (el.getAttribute('placeholder') || el.getAttribute('title'))
      if (text) out.push(text.trim())
    }
    return out
  })
}

export async function checkScreenText(page, findings, where) {
  const texts = await visibleText(page)
  for (const text of texts) {
    const lower = text.toLowerCase()
    for (const leak of LEAKS) if (leak.test(text)) findings.add('T1', `Ett tekniskt värde syns på skärmen (${leak.source.replace(/\\b/g, '')})`, { var: where, text: text.slice(0, 120) })
    const internal = text.match(INTERNAL)
    if (internal && !/https?:|@/.test(text)) findings.add('T1', 'En intern kod syns på skärmen', { var: where, kod: internal[0], text: text.slice(0, 120) })
    if (EPOCH.test(text)) findings.add('T1', 'En rå tidsstämpel syns på skärmen', { var: where, text: text.slice(0, 120) })
    for (const word of ASCII_SWEDISH) {
      if (new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, 'u').test(lower)) {
        findings.add('T1', `Svensk text saknar å/ä/ö: "${word}"`, { var: where, text: text.slice(0, 120) })
      }
    }
  }
}
