# MCP-klienter och kontoval, 2026-10-29

Simon väljer Codex som primär klient och Claude som ytterligare klient.
Gemini/Antigravity ingår inte i fortsatt konfiguration. Tidigare syntetiska
modellprov är historiska belägg, inte en aktiv Gemini-anslutning.

## Verifierade lokala demoanslutningar

`sequential-math-demo` är registrerad i:

- Codex användarkonfiguration, `~/.codex/config.toml`.
- Claude Code användarkonfiguration, `~/.claude.json`.
- Claude Desktop, `~/AppData/Roaming/Claude/claude_desktop_config.json`.

Alla tre startar aktuell adapter i integrationscheckouten:
`C:/Users/ximon/.codex/worktrees/material-integration/sequential_math_fresh/mcp/sequential-math/src/stdio.mjs`
med `--demo-screening --allow-report-writes --allow-material-writes`.
Den tidigare Codex-posten pekade på äldre kod i primärcheckouten och saknade
materialsparsflaggan. Primärcheckoutens pågående arbete ändrades inte.

Varje registrerad kommandokonfiguration kördes genom faktisk SDK-stdio:
16 verktyg, aktuell syntetisk läraridentitet, materialförhandsvisning,
sparande, återfinning via listan, idempotent återförsök och ny version 2.
Version 1 behölls. Inget godkännande eller utdelning utfördes eller exponeras
som MCP-verktyg. Processerna och deras minneslagring stängdes efter proven.
Varje demoprocess har en egen isolerad databas; den delas inte mellan klienter.

Detta verifierar de sparade startinställningarna och MCP-protokollet.
Redan öppna klienter kan fortsätta använda sin äldre process/verktygslista.
Deras faktiska omladdning och nya modellsessioner är inte verifierade här;
ingen klient med pågående arbete startades om.

Claude Code har dessutom två användarskills som hänvisar till de kanoniska
projektfilerna `assignment-authoring` och `pupil-analysis`. Båda validerade.
Claude Desktop läser inte dessa lokala Code-skills genom denna registrering;
serverns analys-prompt och instruktioner är en separat MCP-yta.

## Verkligt konto är ännu inte valt

Befintliga Windows-exportuppgifter gäller **adminperson**. Den tidigare
autentiserade browserkontrollen och återställningen av privata screeningutkast
gällde **Adminsimon**. Kontona har separata privata utkast; administratörsroll
eller åtkomst till samma klasser gör inte deras utkast gemensamma.

Simon påpekade att han trodde att adminperson användes. Kontovalet behöver
fastställas före kontobindning och en verklig MCP-materialskrivning.
Ingen produktions-MCP-post, verklig AI-miljö eller ny kontobindning har
aktiverats. Inga sparade exportuppgifter ändrades eller skrev ut lösenord.
En webbläsarinloggning är inte en konfiguration av MCP-processens konto.

Nästa steg efter kontovalet: konfigurera endast den avsedda identiteten,
bekräfta den med capabilities och förhandsvisa/spara neutralt testmaterial
utan elevutdelning. Verkliga elevunderlag kräver fortsatt klarlagd AI-miljö.

## Klienternas dokumentation

[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) beskriver
användarkonfiguration och stdio-inställningar.
[Claude Code MCP](https://code.claude.com/docs/en/mcp) beskriver user scope
och dess privata konfiguration. Lokala CLI-hjälpsidor kontrollerades också.
Inga globala verktygsgodkännanden eller andra anslutningar ändrades.
