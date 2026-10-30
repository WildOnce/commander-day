# COMMAND//ZONE – Betriebsanleitung für Claude (Event-Support)

Kevins App für den Commander-Tag am **Sa 31.10.2026, Ranch 58, ab 12 Uhr**. Live auf GitHub Pages.
Vor Ort zählt: **schnell, klein, sicher fixen** – nie das laufende Event gefährden.

## Links
- Spieler: https://wildonce.github.io/commander-day/  · Host: …/host.html  · TV: …/tv.html?c=CODE  · Testspiel: …/?demo
- Echtes Event-Code: `ZONE-4040` · Test-Event: `TEST-4040` (Host-PIN der Test-Instanz: 1234, Demo-Spieler-PIN 0000)
- Host-PIN des echten Events kennt Kevin – **nie** ins Repo schreiben (Repo ist öffentlich).

## Architektur (kein Build-Step, Vanilla-JS-Module)
| Datei | Inhalt |
|---|---|
| `js/app.js` | Routing, alle Views (Spieler + Host), Actions (`data-act` → `actions{}`), Tick-Loop (500 ms) |
| `js/lc.js` | Life Counter: Kacheln, Sheets (⋯/☰), Tap/Hold, K.O., Siegerscreen, Sperre bis Timer läuft |
| `js/logic.js` | Pairing, Timer (`timerInfo`), Spielregeln (`settle`, `placements`, `endGame`), Stats/Awards, Auto-Tische |
| `js/sync.js` | MQTT-Sync über `broker.emqx.io` + `broker.hivemq.com` (gespiegelt), retained `{v,t,by,d}`, Last-Write-Wins, Healing |
| `js/demo.js`, `js/demo-store.js` | Testspiel `?demo`: Offline-Store, Bots, Testmission |
| `js/wrapped.js`, `js/sprites.js`, `js/art.js` | Wrapped-Slides, Pixel-Sprites, Scryfall + Pixel-Commander-Art |
| `css/style.css` | Design v2 (Pixel-Widgets, Spielerfarben `--p0..5`, Querformat-Regeln am Ende) |
| `tv.html` | TV-Dashboard (`MODE === 'tv'`, `tvView()` in app.js): nur lesen, 960×540-Layout per zoom skaliert |
| `sw.js` | Service Worker, network-first, Cache-Name `cz-vN` |

Datenmodell (Topic = `czday/<sha256("czday-v1:"+CODE)[:32]>/<key>`):
`config`, `player/<id>`, `round/<id>` (Tische, Timer – **nur Host schreibt**), `xtable/<round>/<id>` (Auto-Tische),
`game/<round>-<table>` (nur das steuernde Gerät schreibt; `controller` = Device-ID).

## Deploy (= live in ~1 Min)
1. Änderung machen, `node --check js/*.js`.
2. **Cache-Version hochzählen** (sonst sehen Handys alte Dateien):
   `sed -i 's/?v=N/?v=N+1/g' index.html host.html sw.js` und `cz-vN` → `cz-vN+1` in `sw.js`.
3. `git commit` + `git push` auf `main` → GitHub Pages deployed automatisch.
4. Prüfen: `curl -s https://wildonce.github.io/commander-day/js/<datei>.js | grep <neuer-code>`.
5. Spielern sagen: App einmal schließen/neu öffnen (oder Seite neu laden).

**Rollback:** `git revert <commit>` + Version hochzählen + push.

## Updates während laufender Spiele (oberste Priorität)
Ein Push darf **niemals** Spielstände, Runden, Timer oder Spieler verändern. Das ist garantiert, solange gilt:
- **Code ≠ Daten.** Ein Deploy tauscht nur Dateien. Daten liegen auf den Brokern (retained) + lokal (`cz.cache.*`).
  Neuer Code darf diese Daten **nie** beim Start umschreiben, migrieren, löschen oder zurücksetzen.
- **Nur abwärtskompatibel ändern:** Keys/Topics, Feldnamen und Bedeutungen bestehender Felder bleiben gleich.
  Neue Felder nur *zusätzlich* und immer mit Fallback lesen (`x ?? default`), weil Geräte mit alter und neuer Version
  gleichzeitig spielen.
- `SALT` in `sync.js`, `DEVICE`-Logik, `meKey`, Store-Prefix, `RESULT`/`game`-Schema **nicht anfassen**.
- **Kein erzwungenes Neuladen.** Laufende Seiten arbeiten mit der alten Version weiter, bis die App neu geöffnet wird
  (SW ist network-first, ohne Auto-Reload). Das so lassen.
- Ausstehende Eingaben werden beim Schließen/Hintergrund sofort gesendet und lokal gespeichert (`store.flush()` auf
  `pagehide`/`visibilitychange`), beim Reconnect heilt `heal()` den Rest. Nicht entfernen.
- Vor jedem Deploy im QA-Event prüfen: Spiel mit **alter** Version starten, Push, neu laden → Stand muss identisch sein.
- Im Zweifel: **nicht** am Event-Tag deployen, sondern den Notfall-Handgriff unten nutzen.

## Harte Regeln
- **Nie in `ZONE-4040` oder `TEST-4040` testen.** Eigene QA-Codes nutzen (`host.html?c=QA-CLAUDE-xx`),
  danach Host → Setup → „Alles löschen“. Ein Test-Würfeln im echten Event beendet echte Runden!
- Daten nie per leerer retained Message löschen – Geräte mit Cache „heilen“ sie zurück. Nur `store.del()` (Tombstone).
- Am Event-Tag nur minimale, gezielte Fixes. Keine Refactors, keine neuen Features ohne Kevins OK.
- Keine Daten des echten Events verändern, außer Kevin bittet ausdrücklich darum.

## Schnelle Diagnose
- Im Browser-Konsole: `window.__cz.store` (Store), `window.__cz.A.snap` (aktueller Zustand: players, rounds, games, live).
- Sync-Status: Topbar „SIGNAL … STRONG/WEAK/LOST“ + zwei Punkte (EMQX/HiveMQ).
- Mitlesen von außen (Node, `npm i mqtt`): auf `czday/<hash>/#` subscriben.

## Notfall-Handgriffe (ohne Code-Änderung)
| Problem | Lösung |
|---|---|
| Counter hängt / falsches Gerät steuert | Am richtigen Handy „LIVE · … STEUERT · ÜBERNEHMEN“ |
| Life Counter gesperrt | Host hat Timer nicht gestartet / pausiert → Host: RUNDE → ▶ |
| Spieler vergisst PIN | Host → SPIELER → ⚿ (PIN zurücksetzen) |
| Falscher K.O. | ⋯ → Wiederbeleben, oder ↶ Rückgängig |
| Spieler gemillt / Self-Mill | ⋯ → „GEMILLT“ → wer war's / SELF-MILL (zählt wie K.O. für Platz, Punkte, Kills) |
| Sitzplätze falsch | Namen auf andere Kachel ziehen, oder ⋯ → „PLATZ TAUSCHEN MIT“ (↶ macht es rückgängig) |
| Auto-Tische an/aus | Host → RUNDE oder SETUP → Toggle „AUTO-TISCHE“ (Standard für neue Events: AUS) |
| Falsche Auslosung | vor Veröffentlichen: ↻ NEU / Spieler antippen = tauschen |
| Handy zeigt alte Version | App schließen & neu öffnen; notfalls Safari-Website-Daten löschen |
| Sync „LOST“ | WLAN/Mobilfunk prüfen; Daten sind lokal gecacht und heilen sich beim Reconnect |
| „CODE UNBEKANNT“ bei allen | Public Broker hat retained Daten verworfen → host.html am Host-Gerät (hat Cache) öffnen & offen lassen: heilt beim Verbinden + alle 2 Min (`store.resync()`); sonst SETUP → Import Backup |
| Backup | Host → SETUP → Export (regelmäßig am Tag) |
