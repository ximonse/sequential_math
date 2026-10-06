# Elevlivscykel: radera eller anonymisera

Beslut förtydligat av Simon 2026-10-05. Åtgärderna ligger under Elever på
`/teacher/admin` och kräver en levande huvudadminsession samt bekräftelse.

## Permanent radering

Tar bort elevprofil, namn och lärartilltalsnamn, inloggningskoder, sessioner,
träningshistorik, highscores, NCM-försök och händelser samt elevens referenser
i klasser, grupper, uppdrag och lärararbetsytor. Andra elever i samma
resurser behålls. Inget statistikarkiv skapas.

## Anonymisering

Tar bort samma konto, referenser och original men bevarar en fryst serie
under en slumpmässig arkivnyckel. Ingen koppling till det tidigare elev-ID:t
eller framtida konton sparas efter slutförd städning.

Arkivet innehåller validerade matematiska träningssvar med ursprungliga tider,
årskurs, svårighetsnivåer, tabellavslut och numeriska träningstotaler. Flaggan
`historyComplete` anger om sparade svar motsvarar hela träningshistoriken.
Det innehåller också versionsmärkta NCM-arkivpunkter: uppgift/version,
startmånad, inlämning och härledda fakta om arbetsytan. Råa rutor och
händelser, namn, alias, elev-/klass-/lärar-ID och inloggningsuppgifter ingår inte.

Huvudadmin kan visa och exportera JSON eller uttryckligen radera serien i
panelen **Statistik utan elevnamn**. Arkivet har ingen automatisk gallring.
Individuella serier kan fortfarande kännas igen med annan kunskap;
namnborttagningen är ingen garanti för full anonymitet.

## Avbrott och lokala kopior

Första servertransaktionen spärrar kontot och fryser profilen i ett temporärt
återställningsjobb. Arkivet visas först när sista transaktionen har städat
original och referenser. Ett avbrott visas som väntande städning och kan
återupptas med samma åtgärd. Jobbet innehåller originaluppgifter tills det
slutförts och raderas då. Saknat/korrupt diagnostikunderlag stoppar
anonymisering i stället för att tyst utelämna statistik.

En minimal hashbaserad spärrmarkör behålls för att gamla klienter inte ska
återskapa kontot. Referensskrivningar kontrollerar spärren atomiskt.
Elevens krypterade IndexedDB-vault raderas när klienten nästa gång når
servern och får bekräftat att kontot upphört. Offlineenheter kan inte
fjärrrensas; tidigare nedladdade exportfiler påverkas inte.

## Verifieringsgräns

Enhets- och webbläsarkontroller använder syntetiska elever och en
lagringsdubbel. De täcker borttagning, anonymisering, behörigheter,
avbrott/retry, samtidiga delade poster, äldre NCM-poster och lokal vault.
Redis-Lua mot en riktig Redis-instans och verklig produktionsdata har inte
provats i detta arbete. Ingen produktionspublicering ingår.
