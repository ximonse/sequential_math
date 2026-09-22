# Datalagringskontrakt

Servern är den enda auktoritativa källan för verksamhetsdata.

| Data | Auktoritativ lagring | Klientens roll |
| --- | --- | --- |
| Skolor, klasser och läsår | Vercel KV | Kort minnescache under en öppen vy |
| Elevmedlemskap och klasshistorik | Vercel KV | Kort minnescache under en öppen vy |
| Elevprofiler, resultat, statistik och träningshistorik | Vercel KV | Kort minnescache under en öppen session |
| Uppdrag, aktivt uppdrag, ticketmallar och utskick | Vercel KV per lärarkonto | Kort minnescache under en öppen lärarvy |
| Tema, kontrast, vald dashboardflik och panelernas öppna/stängda läge | localStorage | Små UI-preferenser med kvotfelhantering |

`localStorage` får aldrig användas för klasslistor, elevprofiler, resultat, historik, uppdrag eller tickets. Det tidigare formatet `mathapp_classes_v1` och andra äldre klientnycklar läses endast för export eller en kontrollerad engångsimport; de skrivs aldrig i det nya flödet.

## Säker migration

1. Exportera äldre klientdata med `collectLegacyBusinessStorage()` eller `downloadLegacyBusinessStorage()`.
2. Kontrollera att serverns skolor, klasser, elever och lärararbetsytor är kompletta.
3. Starta om sidan och verifiera att uppgifter, statistik och historik hämtas från servern.
4. Radera inte äldre webbläsardata förrän exporten och serverkontrollen är godkända.

Klassens stabila `class.id` och elevens `studentId` ändras aldrig när klassnamn eller läsår ändras. Arkivering och årsskifte utförs på servern, så historiska uppdrag och försök behåller sin klasskoppling via `classIdAtAttempt`.

## Läraråtkomst

`GET /api/teacher-students/:studentId` kräver en levande lärar- eller adminsession och kontrollerar på servern att kontot får se minst en av elevens klasser. Superadmin har global åtkomst. Lösenordshashar och salter lämnar aldrig API:t.
