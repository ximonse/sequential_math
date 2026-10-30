---
name: teacher-data
description: Hämta och analysera elevernas frågor och svar (felsvar, klass eller elev, datumintervall, Excel) från matteappen. Använd när Simon ber om "kolla Kerstin i klass 6", resultat denna vecka, felsvarsanalys eller export till Excel.
---

Läs `docs/teacher-data.md` och följ den. Kort version:

1. Kör `node scripts/teacher-data.mjs --class <klass> [--pupil <namn>] [--from ÅÅÅÅ-MM-DD] [--to ÅÅÅÅ-MM-DD]`
   (`--list` visar vad kontot ser). Skriptet är skrivskyddat.
2. Läs JSON-filen som skriptet skriver ut, analysera felsvaren (vad eleven svarade mot
   rätt svar, `Felkategori`, `Felmönster`) och skriv Excel vid behov.
3. Skriv aldrig ut `MATH_TEACHER_PASS`, lägg inte elevdata i repot och skicka den inte
   till externa tjänster.
