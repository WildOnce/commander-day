# COMMAND//ZONE – Commander Day App

Minimalistische PWA für einen entspannten Magic-Commander-Tag: Anmeldung per Event-Code, Decks (bis 15, Scryfall-Suche),
Tisch-Auslosung mit intelligentem Matching, Auto-Tische aus Ausgeschiedenen, Life Counter (Commander-Schaden, Gift, Counter,
Monarch/Initiative, Würfel, Verlauf, Undo), synchroner Rundentimer (80 + 10 min), Live-Ticker, Statistiken und Wrapped.

* Spieler: `index.html` · Host: `host.html`
* Kein Build-Step, statisch gehostet (GitHub Pages). Echtzeit-Sync über öffentliche MQTT-Broker (EMQX + HiveMQ, gespiegelt).
* Konzept: [KONZEPT.md](KONZEPT.md)
