# Isolerat Redis-prov för materialflödet

## Verifierat lokalt 2026-10-28

`scripts/verify-material-redis.mjs` kör appens verkliga materiallagerfunktioner
och Lua-skript mot en separat Redis-instans. Tolv kontroller passerade på
Redis 8.2.11 byggd i WSL. Inga produktionsnycklar, konton eller elevdata användes.
Provet verifierar Redis/Lua och lagerfunktionerna, inte Upstashs REST-transport,
ett produktionskonto eller det autentiserade webbflödet mot riktig lagring.
Det syntetiska webbflödet har separata robotprov.

Kontrollerna omfattar:

- Samtidigt sparande med samma requestId ger en innehållsversion.
- Konkurrerande nya versioner har en vinnare och bevarar äldre innehåll.
- Utdelningskvitto kräver godkännande; godkännande har egen CAS och idempotens.
- Identiskt innehåll i en ny version kräver ett separat godkännandekvitto.
- Samtidiga mottagarkvitton sammanförs; fel och osäker kvittens hålls isär.
- Återförsök bevarar bekräftade uppdrags-ID:n och slutför resterande mottagare.
- Ny version mellan läsning och kvittoskrivning stoppar den gamla skrivningen.
- Elevradering mellan läsning och CAS stoppar kvittot; tombstones stoppar
  sparande/godkännande. Raderad klass stoppar nytt utkast.
- Gränsen 100 utkast per lärare upprätthålls av det verkliga Lua-skriptet.

Testkörningen skapade 22 isolerade nycklar. Samtliga verifierades borttagna.
Redis startades med `--port 0`, en separat Unix-socket med rättighet 700,
ingen RDB- eller AOF-persistens och ingen systeminstallation. Instansen
stängdes med `SHUTDOWN NOSAVE`; processen avslutades och tog bort sin socket.
Redis varnade för operativsystemets overcommit-inställning; den ändrades inte.
Provet använder varken bakgrundssparande eller replikering.

## Köra igen

CLI:t kräver uttryckliga absoluta WSL-sökvägar till `redis-cli` och en Unix-socket:

```powershell
npm run verify:material-redis -- --local-wsl /ABSOLUT/SOKVAG/redis-cli /tmp/EGEN-TESTINSTANS.sock
```

Det finns ingen standarddatabasadress, URL-parameter, automatisk inläsning av
KV-hemligheter eller automatisk start av en tjänst. Anropa bara med en egen
lokal testinstans. Samma export `verifyMaterialRedis(client)` kan anropas av
en uttryckligen tillhandahållen klient; verifieringslagret prefixar alla nycklar.

Varje körning använder `verification:material:UUID:`. Alla läsningar,
skrivningar och Lua-KEYS prefixas; endast de två material-CAS-skripten tillåts.
Testnycklar får en timmes TTL. `finally` tar bort enbart registrerade egna
nycklar och kontrollerar att de saknas. Ingen SCAN, KEYS eller FLUSHDB används.
Vid en bruten anslutning kan ett Lua-SET ha hunnit kvitteras utan efterföljande
TTL-anrop; återställ därför testanslutningen och följ upp städningen eller
stäng den egna persistensfria instansen. Ett städfel rapporteras som ett fel.

Isoleringen provas separat av `scripts/verify-material-redis.test.js`, bland
annat med en främmande elevnyckel som måste vara oförändrad, nekad godtycklig
Lua, separata körningsprefix och simulerat städfel.

## Runtime som användes

Källarkivet hämtades från [Redis officiella utgåvor](https://download.redis.io/releases/redis-8.2.11.tar.gz).
SHA256 kontrollerades mot [Redis publicerade hashregister](https://github.com/redis/redis-hashes):

```text
fba14b77c4bdcb2d5418b6741fc0cdaac4b78bc73eab9b2e5f3c255d597f16fa
```

Byggprincipen följer [Redis källkodsinstallation](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-from-source/),
men utan installationssteget. Binärer och byggfiler ligger i ignorerade
`robots/test-results/material-redis/`, inte i leveransen. Båda binärerna
byggdes med en gemensam make-process i `src`:

```sh
make -C redis-8.2.11/src -j2 MALLOC=libc OPT=-O2 redis-server redis-cli
```

Ett första bygge med två parallella rekursiva toppmål skrev samtidigt till
den genererade versionsfilen och misslyckades. Det rättade bygget och alla
databaskontroller passerade; inga produktionsinställningar ändrades.
