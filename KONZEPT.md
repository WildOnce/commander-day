# COMMAND//ZONE — Konzept („Rezept“)

Eine minimalistische Web-App (PWA) für einen entspannten Magic-the-Gathering-Commander-Tag
mit 12 Spieler:innen in 4er-Pods. Look & Feel v2: **Pixel-Game-Kern** (Pixel-Sprites, Dot-Matrix-Schrift,
Pixel-Balken, Terminal-Microcopy) in **übersichtlichen Widget-Kacheln** (Nothing-OS / Teenage-Engineering-Anmutung):
Punktraster-Hintergrund, Bento-Tiles, Orange als Akzent, feste **Spielerfarben pro Platz** – auf einen Blick lesbar.

---

## 1. Ziele

| Ziel | Umsetzung |
|---|---|
| Jede/r spielt mal mit jede/m | Zufalls-Pairing mit „Neue-Konstellation“-Optimierung |
| Möglichst viele Runden | 80 min Spielzeit + 10 min Overtime, globaler Timer vom Host |
| Kein Stress, kein Turnier | Ergebnisse sind Spaß-Statistik, kein Ranking-Druck |
| Null Kosten | GitHub Pages (Hosting) + öffentliche MQTT-Broker (Echtzeit-Sync) |
| Am Handy wie eine App | PWA: „Zum Home-Bildschirm“ auf iOS & Android |

## 2. Rollen & Zugang

* **Event-Code** (z. B. `ZONE-4040`) – ohne Code kommt niemand rein. Der Code ist gleichzeitig
  der kryptografische Schlüssel für den Datenkanal (SHA-256 → Topic). Wer den Code nicht kennt,
  sieht die Daten nicht einmal.
* **Host-PIN** – zusätzlich nötig für das Host-Interface (`#/host`).
* **Spieler:in** – meldet sich per Link + Event-Code an, wählt Namen und Commander-Decks.
  Gerät merkt sich die Identität (localStorage), kein Passwort nötig.

## 3. Zwei Interfaces

### 3.1 Spieler-App (`/#/`)
1. **Login** – Event-Code eingeben.
2. **Anmeldung** – Name, Commander/Decks (Scryfall-Suche nur Commander, Farbidentität + Art automatisch), bis zu **15 Decks**, jederzeit editierbar.
3. **Home / Status** – Tisch-**Nummer** + „Du spielst mit …“ immer sichtbar, Popup + Vibration bei jeder neuen Zuweisung, Rundentimer live.
4. **Life Counter** – startbar von *einem* Gerät pro Tisch; Tisch ist automatisch mit den
   ausgelosten Spieler:innen belegt. Andere Geräte am Tisch können live zuschauen oder übernehmen.
5. **LIVE** – Live-Ticker („Mira kommt ins Schwitzen 💦 · Tisch 2“), alle laufenden Spiele, Kennzahlen, Rundenhistorie. Wer ausgeschieden ist, bekommt den Ticker prominent auf dem Home-Screen.
6. **Stats** – Live-Statistiken des Tages (siehe §7).
7. **Wrapped** – erscheint, sobald der Host es pusht (Story-Slides wie Spotify Wrapped).

### 3.2 Host-App (`/#/host`)
1. **Setup** – Eventname, Event-Code, Host-PIN, Spielzeit (80) + Overtime (10), Tischgröße (4).
2. **Spieler:innen** – Liste, an-/abwesend schalten, umbenennen, entfernen, Decks sehen.
3. **Runde würfeln** – Zufallsgenerator mit Wiederholungs-Minimierung, Vorschau, Neu würfeln,
   Spieler:innen manuell zwischen Tischen tauschen, dann „Runde veröffentlichen“.
4. **Timer** – Start / Pause / +5 min / Stopp. Der Timer läuft synchron auf allen Life Countern.
5. **Live-Auswertung** – Kennzahlen (laufend / beendet / K.O.s / an der Bar), Live-Ticker, alle Tische mit
   Lebenspunkten, Commander-Schaden, Gift, Ergebnissen, Leaderboard, Awards und Historie aller Runden.
5b. **ICH** – der Host spielt selbst mit: eigener Tisch, Life Counter, Decks – direkt in der Host-App.
5c. **Matching-Schalter** – Intelligentes Matching an/aus, Auto-Tische an/aus.
6. **Wrapped pushen** – am Ende des Tages.
7. **Backup** – Export/Import als JSON (Sicherheitsnetz).

## 4. Rundenablauf

```
HOST: Runde würfeln ─► veröffentlichen ─► Tische erscheinen bei allen
SPIELER: Life Counter am Tisch starten (1 Gerät) ─► Commander je Platz wählen
HOST: Timer starten ─► 80:00 läuft überall runter
  · 0:00  → OVERTIME (10 min) – rotes Banner
  · +10   → SPIEL ENDET → Unentschieden für alle Überlebenden
  · vorher nur noch 1 übrig → Sieg, Tisch fertig („ab an die Bar 🍺“)
ERGEBNIS: Platz 1–4 auf jedem Life Counter (Eliminationsreihenfolge)
```

**Platzierung:** Wer zuerst ausscheidet = 4., dann 3., 2. Letzte:r Überlebende:r = 1. (Sieg).
Bei Zeitablauf teilen sich alle Überlebenden Platz 1 als **Unentschieden** (Anzeige sortiert nach
Leben, aber gewertet als Draw).

## 5. Pairing-Algorithmus („neue Konstellationen“) – vom Host ein-/ausschaltbar

* Anwesende Spieler:innen → Tische mit 4 (bei Rest automatisch 3er/5er-Tische).
* Für jedes Paar (A,B) wird gezählt, wie oft sie schon zusammen saßen.
* 400 Zufallsstarts + Tausch-Hill-Climbing, Kosten = Σ (gemeinsame Spiele)² je Paar am Tisch.
  Die günstigste gewinnt → maximale Durchmischung, trotzdem zufällig. (Ab Runde 2 sind bei 12 Spielern
  mindestens 3 Wiederholungen mathematisch unvermeidbar – der Algorithmus findet dieses Optimum.)
* **Aus** = purer Zufall.

### 5b. Auto-Tische („rollende Pods“)
* Sobald 4 Spieler frei sind (ausgeschieden oder Tisch fertig), entsteht automatisch ein neuer **Bar-Tisch**
  mit nächster Tischnummer – unter dem laufenden Rundentimer.
* Nie dieselben 4 vom selben Tisch; bei mehr Freien wählt das Matching die frischeste Kombination.
* Nur wenn noch ≥ 20 min Spielzeit übrig sind (einstellbar). Wer lieber an der Bar bleibt: „Ich mach Pause 🍺“.
* Host kann jederzeit manuell einen Tisch aus den Freien bilden.
* Runde 1 ist dadurch reines Los. Der Host sieht „Wiederholungen: 0“ als Qualitätsanzeige.

## 6. Life Counter (Funktionsumfang nach Lotus / Lifetap / CounterSpell)

| Funktion | Detail |
|---|---|
| Startleben 40 | Tap oben/unten ±1, Long-Press ±10 (Auto-Repeat) |
| Delta-Anzeige | „−7“ bubble, fasst schnelle Taps zusammen |
| Layout | 2×2 rund um den Tisch, Kacheln zum jeweiligen Spieler gedreht, **jede Kachel in Spielerfarbe** |
| K.O.-Animation | Pixel-Totenkopf mit Glitch → Geist steigt auf, Ursache + Verursacher + Spruch („Ab an die Bar 🍺“) |
| Sieg-Animation | Pixel-Ritter reitet durchs Bild, Pixel-Konfetti, Platz 1–4 mit Sprites |
| Commander-Schaden | Matrix je Gegner, inkl. Partner (2 Commander), zieht Leben mit ab, 21 = tot |
| Gift | 10 = tot |
| Weitere Counter | Energie, Erfahrung, Rad, Commander-Tax (Cast-Zähler) |
| Status | Monarch 👑, Initiative, Tag/Nacht |
| Tools | W20/W6, Münzwurf, zufälliger Startspieler |
| Verlauf & Undo | Jede Änderung mit Zeitstempel, letzter Schritt rückgängig |
| K.O. | automatisch (Leben ≤ 0, Gift ≥ 10, Cmd-Dmg ≥ 21) oder manuell („aufgeben“), mit „Wer war’s?“ |
| Timer | Rundentimer vom Host oben in der Mitte, Overtime-Modus, Ergebnis-Screen |
| Commander-Wahl | pro Platz aus den angemeldeten Decks der Person |
| Wake-Lock | Display bleibt an |

## 7. Statistiken (live) & Wrapped

Erfasst wird pro Spiel: Teilnehmer, Commander, jede Lebensänderung (Zeit, Delta),
Commander-Schaden (wer→wer), K.O.-Zeit, Ursache und Verursacher, Platzierung, Dauer.

**Live-Stats (Spieler-App):** Siege, Spiele, Ø-Platz, eigene Ausscheide-Zeit, Nemesis
(hat dich am öftesten rausgehauen), Lieblingsopfer, Ingame-Zeit, Barzeit, Commander-Winrate,
Leaderboard des Tages.

**Wrapped (Awards):**
* 🏆 Bester Spieler (Punkte: Sieg 3, Draw 1)
* ⚔️ Stärkster Commander (Siege, dann Winrate)
* ⚡ Schnellster Sieg
* 💀 Schnellstes Aus („Speedrun zum Tresen“)
* ⏳ Längste Ingame-Zeit („Dauerbrenner“)
* 🍺 Längste Barzeit („Stammgast“)
* 🗡️ Commander-Schlächter (meister Cmd-Schaden)
* ☠️ Giftmischer (meiste Giftmarker kassiert)
* 🎯 Kopfgeldjäger (meiste K.O.s verursacht)
* ❤️ Lebenskünstler (höchstes Leben erreicht)
* 🧟 Comeback-Kid (Sieg nach ≤ 10 Leben)
* 😈 Die Nemesis-Beziehung des Tages
* Persönliche Slides: deine Siege, dein Lieblings-Commander, deine Ingame-/Barzeit, deine Nemesis.

## 8. Technik

```
GitHub Pages (statisch, kostenlos)
  └─ index.html + app.js + style.css + manifest + service worker  (kein Build-Step)
Sync: MQTT über WebSockets, gespiegelt auf 2 öffentliche Broker
  (broker.emqx.io + broker.hivemq.com) → Ausfallsicherheit
Topic: cz/<sha256(eventCode)>/<entity>/<id>   (retained)
```

**Datenmodell (je Entität eine retained Message, Last-Write-Wins über `updatedAt`):**

* `config` – Eventname, Host-PIN-Hash, Zeiten, Wrapped-Flag
* `player/<id>` – Name, Decks, anwesend
* `round/<n>` – Tische, Timer (startedAt, pausedAt, extraMs), Status
* `game/<round>-<table>` – Leben, Counter, Cmd-Schaden, Log, K.O.s, Ergebnis, Controller-Gerät

Löschen = Tombstone (`deleted: true`). Jedes Gerät cached alles lokal (offline-fähig) und
„heilt“ fehlende/ältere Einträge auf den Brokern automatisch nach (Host für alles, Tisch-Gerät
für sein Spiel). Zusätzlich JSON-Backup im Host.

**Sicherheit (bewusst „casual“):** Code-geschützt, aber kein Bank-Tresor. Für einen privaten
Spieleabend ausreichend. Upgrade-Pfad: Supabase/Firebase-Adapter (gleiches Datenmodell).

## 9. Design-System (v2)

| Token | Wert |
|---|---|
| `--bg` | `#0d0d0d` + Punktraster |
| `--tile` / `--tile2` | `#1a1a1a` / `#262626` |
| `--paper` (helle Kachel) | `#ececea` mit Tinte `#111` |
| `--accent` | `#ff6a00` (Orange) |
| `--alert` | `#ff3b30` (K.O. / Overtime) |
| `--gold` | `#ffc53d` (Sieg / Monarch) |
| Spielerfarben | Orange · Blau `#3d8bff` · Grün `#2fd27a` · Pink `#ff4fa3` · Gelb · Violett `#9b6bff` |
| Fonts | **Doto** (Dot-Matrix, Headlines/Timer), **Inter Tight 800** (Zahlen), **JetBrains Mono** (Labels) |
| Formen | Kacheln 22 px Radius, Pill-Buttons, Pill-Tabbar, Pixel-Sprites (SVG, crisp) |
| Bewegung | `steps()`-Animationen (pixelig), Konfetti, Glitch, Reiter-Lauf |

Microcopy im Terminal-Ton: `SCAN COMPLETE`, `BATTLEFIELD STATUS: SILENT`, `→ CONTINUE RIDING INTO DARK_`.

## 10. Betrieb

* **Spieler-Link:** https://wildonce.github.io/commander-day/
* **Host-Link:** https://wildonce.github.io/commander-day/host.html
* **Installieren:** iPhone → Safari → Teilen → „Zum Home-Bildschirm“ · Android → Chrome → „App installieren“.
* Code: https://github.com/WildOnce/commander-day · Design: https://www.figma.com/design/3LvXXEOQZPU7Dp0WaUeM3t
