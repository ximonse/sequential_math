"""Generate a dated planning snapshot, a Soul Canvas workspace and an HTML view.

This generator is for the initial handoff only. Never regenerate over a workspace
that has been edited in Soul Canvas; work on a copy instead.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
if (ROOT / 'soul-workspace' / 'data.json').exists():
    raise SystemExit('Refusing to overwrite an existing Soul Canvas workspace. Generate in a fresh copy.')
DATE = '2026-10-06T12:00:00Z'
cards = []


def card(id, area, title, status, purpose, next, acceptance, requires=(), affects=(), decision='', evidence='', issue='', kind='funktion'):
    cards.append(dict(id=id, area=area, title=title, status=status, purpose=purpose,
                      next=next, acceptance=acceptance, requires=list(requires),
                      affects=list(affects), decision=decision, evidence=evidence,
                      issue=issue, kind=kind))


card('direction', 'Beslut', 'Screening, inte mängdträning', 'Beslutat',
     'Förstå hur eleven räknar genom korta uppdrag och bevarade original.',
     'Använd som gräns vid varje ny funktion.', 'Ingen dold påverkan på mastery eller adaptiv progression.',
     affects=('dispatch', 'analysis', 'followup'), evidence='NCM_DIAGNOSTIK_PROJEKT.md; Simons beslut i chatten')
card('dispatch', 'Dela ut', 'Tilldela elev eller hel klass', 'Byggt',
     'Admin väljer mottagare och ett diagnostiskt uppdrag.',
     'Pröva utdelningsflödet med realistisk klass och förhandsgranskning.',
     'Exakt valda mottagare får exakt valt paket; andra får inget.',
     affects=('matrix', 'original'), evidence='dc129da; tidigare publicerat enligt denna tråd. Ingen ny produktionskontroll.')
card('packs', 'Dela ut', 'Egna additions- och subtraktionspaket', 'Byggt',
     'Tolv egna heltalsuppgifter med facit och lärarunderlag.',
     'Pröva uppgifternas diagnostiska värde med elever.', 'Varje uppgift har fryst facit, syfte och tydlig källstatus.',
     affects=('dispatch', 'analysis'), evidence='5ebf603; tidigare publicerat enligt denna tråd. Inga officiella NCM-original.')
card('dispatch-ux', 'Dela ut', 'Urval och förhandsgranskning', 'Föreslaget',
     'Läraren förstår vad som delas ut innan tilldelningen.',
     'Skissa kompakt paketöversikt och mottagarbekräftelse.', 'Innehåll, mottagare och konsekvens framgår före tilldelning.',
     requires=('dispatch', 'packs'), decision='Hur ska nya, aktiva och avslutade uppdrag visas?')
card('original', 'Elevarbete', 'Bevara uppställning och förlopp', 'Byggt',
     'Rutnät, slutsvar och händelser förblir originalunderlag.',
     'Verifiera lagring och avbrott mot riktig Redis.', 'Samma sparade revision kan återspelas utan ändrat elevoriginal.',
     affects=('matrix', 'review', 'analysis', 'lifecycle'), evidence='Diagnostisk försökslagring; versions- och kvittensskydd finns. Verklig driftverifiering separat.')
card('grid', 'Elevarbete', 'Skriv, markera och gå vidare', 'Byggt',
     'Eleven räknar i räknehäftet; överlappande streck kan tas bort och nästa fråga öppnas.',
     'Prova med elever på avsedd iPad.', 'Siffror, lån, minnessiffror och streck går att hantera utan oavsiktliga ändringar.',
     requires=('original',), evidence='5552783; tidigare publicerat enligt denna tråd.')
card('cursor', 'Elevarbete', 'Nästa ruta efter varje siffra', 'Planerat',
     'Skriv exempelvis 256 i startuppställningen utan att välja ruta tre gånger.',
     'Definiera slut på rad, korrigering och skillnad mot uträkning; implementera smalt.',
     'Varje siffra fyller vald ruta och flyttar markören ett steg i startuppställningen.',
     requires=('grid',), decision='Avgränsa till startuppställningen; pröva tangentbord och touch.',
     issue='https://github.com/ximonse/sequential_math/issues/8', kind='deluppgift')
card('ipad', 'Elevarbete', 'Elevprovning av lån och minnessiffror', 'Saknas',
     'Avgöra om den faktiska inmatningen fungerar i klassrummet.',
     'Låt några elever lösa korta heltalsuppdrag på avsedd enhet.',
     'Dokumenterade observationer av träffsäkerhet, korrigering och naturligt arbetssätt.',
     requires=('grid',), affects=('analysis', 'pilot'), kind='verifiering')
card('matrix', 'Överblick', 'Gruppmatris med faktiska svar', 'Lokalt klart',
     'En elev per rad, uppgifter i kolumner; hover visar elevsvar, facit och signaler.',
     'Pröva full klass och många uppgifter; publicera endast efter uttryckligt mandat.',
     'Rätt, fel, obesvarat och metodsignal går att skilja; touch öppnar originalet.',
     requires=('original', 'dispatch'), affects=('review',), evidence='0b1eaa8; 652 tester, build, lint, 81 robotfall. Ej pushat/publicerat.')
card('scale', 'Överblick', 'Stor klass och laddningstid', 'Saknas',
     'Matrisen läser validerad historik för varje senaste cell; kostnaden växer med klassen.',
     'Mät realistiskt antal elever, uppgifter och händelser innan optimering.',
     'Dokumenterad svarstid och läskostnad; felaktig data blir synligt fel, inte grå cell.',
     requires=('matrix', 'redis'), affects=('pilot',), kind='verifiering')
card('review', 'Genomgång', 'Original och anteckning i overlay', 'Lokalt klart',
     'Öppna elevens arbete, bläddra och spara intern läraranteckning med revisionsskydd.',
     'Utveckla sammanhållen elevgenomgång, därefter en återkopplingsfunktion åt gången.',
     'Kommentar ändrar inte original; elev- eller lärarkonflikt skriver inte över annan data.',
     requires=('original',), affects=('pupil-review', 'feedback', 'print'), evidence='fec960e + 0b1eaa8; lokalt testat. Ej pushat/publicerat.')
card('pupil-review', 'Genomgång', 'Elevens hela uppdrag och återuppta', 'Föreslaget',
     'Gå igenom en elev åt gången och återuppta där arbetet avbröts.',
     'Bestäm hur hela uppdraget, aktuell position och nästa elev visas.',
     'Ungefär 30 elevers arbeten kan granskas i följd utan tappad position.',
     requires=('review',), decision='Vilken position ska sparas och för vem? Nuvarande bläddring är inom vald uppgift.')
card('draft', 'Genomgång', 'Skydda osparad lärartext överallt', 'Saknas',
     'Nuvarande skydd täcker intern navigation och stängning men inte alla andra lärarflikar.',
     'Lägg skydd vid utträde ur hela sektionen; välj om lokal textåterhämtning behövs.',
     'Alla relevanta utträden varnar eller bevarar utkast efter uttryckligt valt beteende.',
     requires=('review',), affects=('feedback',), kind='deluppgift')
card('feedback', 'Återkoppling', 'Elevsynlig kommentar och återlämning', 'Beslut behövs',
     'Skilj intern läraranteckning från feedback som eleven får tillbaka.',
     'Besluta publiceringsögonblick och vad som händer om eleven ändrar arbetet.',
     'Eleven ser endast uttryckligen återlämnad feedback för rätt underlagsrevision.',
     requires=('review', 'feedback-policy', 'lifecycle'), affects=('followup',),
     decision='Ingen elevsynlig kommentar eller återlämning är byggd.')
card('feedback-policy', 'Beslut', 'När ser eleven vad?', 'Beslut behövs',
     'Fastställa utkast, publicerad feedback och möjlighet till fortsatt elevarbete.',
     'Välj om återlämning låser arbetet eller öppnar en ny revision.',
     'Tydligt kontrakt för utkast → återlämnat → eventuell elevändring.',
     affects=('feedback', 'print'), kind='beslut')
card('print', 'Återkoppling', 'Skriv ut granskad uppgift', 'Planerat',
     'Ge ett begripligt papper med elevens arbete och valda lärarkommentarer.',
     'Bestäm innehåll; gör utskriftsutkast före renderingsarbete.',
     'Läsbar utskrift av en bestämd revision; facit och interna anteckningar läcker inte av misstag.',
     requires=('review', 'print-policy'), decision='Word/PDF/utskriftsvy är inte byggd.')
card('print-policy', 'Beslut', 'Vad ska ingå i utskriften?', 'Beslut behövs',
     'Välj original, facit, kommentar och uppgiftssammanfattning.',
     'Bestäm lärar- respektive elevutskrift.', 'Innehåll och målgrupp är uttryckligt valda.',
     affects=('print',), kind='beslut')
card('analysis', 'Analys', 'Tre försiktiga analyssignaler', 'Byggt',
     'Observera kolumnplacering, synligt resultat kontra slutsvar och S2-mönstret 402−178→376.',
     'Kalibrera mot lärares granskning; kalla inte ett svar för säker felorsak.',
     'Varje signal pekar på underlag; otydligt arbete ger okänt.',
     requires=('original',), affects=('matrix', 'rules', 'tips'), evidence='Versionerade regler finns; signalerna i matrisen är lokala i 0b1eaa8.')
card('rules', 'Analys', 'Fler felmönster med motexempel', 'Föreslaget',
     'Utöka först när uppställning och elevunderlag stödjer en säker observation.',
     'Välj en heltalsregel, definiera matchning, motexempel och okänt; låt lärare pröva.',
     'Regeln har belägg, version och gränser. Felsvaret ensamt räcker inte.',
     requires=('analysis', 'ipad'), affects=('tips',), decision='Slarv, decimalfel och allmänna lånefel kan inte idag klassificeras automatiskt.')
card('tips', 'Analys', 'Frågor och tips för läraren', 'Föreslaget',
     'Hjälpa läraren välja en fråga som undersöker elevens tänkande.',
     'Knyt ett litet lärarstöd till befintlig signal och visa osäkerhet.',
     'Tipset är förslag, visar varför och kräver inte att läraren accepterar hypotesen.',
     requires=('analysis',), affects=('followup',))
card('followup', 'Återkoppling', 'Välj liknande uppgifter igen', 'Föreslaget',
     'Läraren väljer riktad uppföljning efter granskning.',
     'Bestäm screening eller träning; bygg därefter förhandsgranskning och explicit tilldelning.',
     'Inget skickas automatiskt. Valda uppgifter håller sig till valt syfte och talområde.',
     requires=('dispatch', 'feedback', 'tips', 'followup-policy'))
card('followup-policy', 'Beslut', 'Ny screening eller vanlig träning?', 'Beslut behövs',
     'Avgöra evidensklass, lagring och eventuell mastery-påverkan för uppföljningen.',
     'Definiera två uttryckliga vägar om båda behövs.', 'Screening kan inte tyst bli mängdträning.',
     requires=('direction',), affects=('followup',), kind='beslut')
card('lifecycle', 'Drift', 'Radera allt eller anonymisera statistik', 'Byggt',
     'Radering tar bort elevdata; anonymisering bevarar fryst statistik utan namn och råoriginal.',
     'Koppla varje ny personbunden datatyp till livscykelstädningen.',
     'Nya kommentarer, feedback och exportregler följer valt livscykelflöde.',
     affects=('feedback', 'redis'), evidence='9b9f894 tidigare publicerat; anteckningsstädning i lokal fec960e. Verklig Redis separat.')
card('redis', 'Drift', 'Riktig Redis och avbrottsprovning', 'Saknas',
     'Robotarna använder isolerad minnesdatabas och emulerar Lua-transaktioner.',
     'Pröva separat testkonto: kvittens, retry, CAS, elevändring, radering och avbrott.',
     'Samma kontrakt håller mot verklig lagring; inga riktiga elevers konton används.',
     requires=('original', 'review', 'lifecycle'), affects=('pilot',), kind='verifiering')
card('pilot', 'Drift', 'Liten klassrumspilot', 'Planerat',
     'Pröva att elev- och lärarflödet fungerar som screening i vardagen.',
     'Avgränsa grupp, uppgifter, framgångskriterier och sätt att fånga hinder.',
     'Elever kan lämna in och läraren kan granska; problem dokumenteras före expansion.',
     requires=('redis', 'ipad', 'matrix', 'review', 'scale'), affects=('expansion',), kind='verifiering')
card('expansion', 'Analys', 'Decimaler och fler räknesätt', 'Senare',
     'Utvidga först efter prövad heltalsscreening.',
     'Nytt innehålls- och analyskontrakt per uppgiftstyp.',
     'Representation, facit och osäkerhet är definierade och testade.',
     requires=('pilot', 'rules'), decision='Ingen automatisk decimaldiagnos är byggd.')
card('permissions', 'Beslut', 'Adminbehörighet ligger fast', 'Beslutat',
     'Endast admin/huvudadmin med aktuell klassåtkomst använder Screening.',
     'Kontrollera samma gräns för framtida feedback och utskrifter.',
     'Varje API läser och skriver inom uttryckligen tillåten klass.',
     affects=('dispatch', 'matrix', 'review', 'feedback'), decision='Eventuell vanlig läraråtkomst kräver nytt uttryckligt beslut.', kind='beslut')
card('issue3', 'Övriga issues', 'Inaktivitet kontra stödsignal', 'Planerat',
     'Separat arbete för vanliga lärardashboarden.', 'Prioritera separat från Screening.',
     'Inaktivitet blandas inte ihop med belagd matematisk svårighet.',
     issue='https://github.com/ximonse/sequential_math/issues/3', kind='issue')
card('issue2', 'Övriga issues', 'Räknesätt för blandad träning', 'Planerat',
     'Separat önskemål om lärarstyrning av vanlig träning.', 'Prioritera separat från Screening.',
     'Klassens träning håller sig till valda räknesätt.',
     issue='https://github.com/ximonse/sequential_math/issues/2', kind='issue')

areas = list(dict.fromkeys(c['area'] for c in cards))
edges = []
for c in cards:
    edges += [dict(source=r, target=c['id'], kind='kräver') for r in c['requires']]
    edges += [dict(source=c['id'], target=a, kind='påverkar') for a in c['affects']]
ids = {c['id'] for c in cards}
assert len(ids) == len(cards)
assert all(e['source'] in ids and e['target'] in ids for e in edges)
plan = dict(date='2026-10-06', title='Screening — projektkarta', cards=cards, edges=edges,
            note='Planeringssnapshot. Lokalt klart är inte publicerat. Tidigare publicering bygger på denna tråds verifiering; ingen ny livekontroll. Förslag är inte fattade beslut.')
(ROOT / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

colors = {'Lokalt klart':'#dbeafe', 'Byggt':'#dcfce7', 'Beslutat':'#e2e8f0', 'Beslut behövs':'#fef3c7', 'Saknas':'#fee2e2', 'Planerat':'#fef9c3', 'Föreslaget':'#f1f5f9', 'Senare':'#f3e8ff'}
nodes = []
for i, area in enumerate(areas):
    for j, c in enumerate(c for c in cards if c['area'] == area):
        relation = '\n'.join(f"{e['kind'].capitalize()}: {e['source']} → {e['target']}" for e in edges if c['id'] in (e['source'], e['target']))
        body = f"{c['title']}\n\nStatus: {c['status']} · 2026-10-06\nID: {c['id']}\nOmråde: {area}\n\nSyfte: {c['purpose']}\n\nNästa steg: {c['next']}\n\nKlart när: {c['acceptance']}\n\nÖppet beslut: {c['decision'] or 'Inget ytterligare beslut angivet.'}\n\nBelägg / publicering: {c['evidence'] or 'Ingen implementerad leverans angiven.'}\n\nRelationer:\n{relation or 'Inga angivna.'}\n\nIssue: {c['issue'] or 'Saknar separat issue.'}"
        nodes.append(dict(id=c['id'], title=c['title'], content=body, type='text', x=i*420, y=j*680,
                          z=0, width=370, height=620, tags=['Screening', area, c['status'], c['kind']],
                          createdAt=DATE, updatedAt=DATE, backgroundColor=colors[c['status']],
                          caption=c['status'], comment='Relationslinjer i Soul Canvas är generella. Riktning och typ anges i korttexten.',
                          link=f"[GitHub issue]({c['issue']})" if c['issue'] else ''))
session = dict(id='screening-2026-10-06', name='Screening · plan 2026-10-06', cardIds=[n['id'] for n in nodes],
               viewState=dict(x=30,y=30,zoom=0.28), createdAt=1791288000000,lastOpened=1791288000000)
unique = sorted({(e['source'], e['target']) for e in edges})
document = dict(schemaVersion=2, exportedAt=DATE, revision='screening-initial-2026-10-06',nodes=nodes,
                synapses=[dict(id=f'rel-{i}',sourceId=a,targetId=b,strength=1,autoGenerated=False) for i,(a,b) in enumerate(unique)],
                sessions=[session], activeSessionId=session['id'], conversations=[],trails=[],sequences=[],
                trailUi=dict(selectedTrailIds=[],showActiveTrailLine=True),omnical=dict(pendingFiles=[],ignoredNoteIds=[]),cardFiles={})
workspace = ROOT / 'soul-workspace'
workspace.mkdir(exist_ok=True)
(workspace / 'data.json').write_text(json.dumps(document, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
template = (ROOT / 'preview.template.html').read_text(encoding='utf-8')
payload = json.dumps(plan, ensure_ascii=False).replace('<', '\\u003c')
(ROOT / 'screening-map.html').write_text(template.replace('__PLAN__', payload), encoding='utf-8')
print(f'Generated {len(cards)} cards, {len(unique)} relations and standalone preview.')
