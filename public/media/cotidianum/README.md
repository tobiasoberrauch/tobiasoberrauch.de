Cotidianum — Mittagsspuren (Audio)
==================================

Diese Dateien sind kuratierte fünf- bis acht-minütige Audio-Spuren für das
Mittagsinnehalten (Spec FR-011). Sie werden Mo, Mi, Fr zwischen 12:00 und
14:00 lokaler Zeit per E-Mail-Link an Mitglieder verschickt — kein Player-
Embed, kein Tracking, kein iFrame.

Verzeichnis-Struktur
--------------------

    public/media/cotidianum/
      ├── <schale>/<communitas-weekday>.mp3
      └── README.md

Wo `<schale>` einer von `speculum`, `silentium`, `rota`, `velum`,
`logos`, `vox`, `vestigium` ist, und `<communitas-weekday>` einer von
`spiegel` (Mo), `spur` (Mi), `versoehnung` (Fr). Di/Do/Sa/So bekommen
keinen Mittag — Stille gehört zur Architektur.

Status der Dateien
------------------

Die derzeit eingecheckten MP3s sind **Platzhalter** — fünf Sekunden
Stille, erzeugt mit:

    ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 \
           -t 5 -q:a 9 -acodec libmp3lame <ziel>.mp3

Tobias ersetzt sie durch die echten Aufnahmen, sobald die Spuren
verfügbar sind. Die Platzhalter dienen lediglich dazu, dass die
Mail-Templates beim Versand auf eine existierende URL verlinken können.

Die vier zunächst aktiven Schalen (`speculum`, `silentium`, `rota`,
`velum`) haben jeweils drei Spuren (Mo/Mi/Fr) — zwölf Dateien
insgesamt. `logos`, `vox` und `vestigium` werden ergänzt, sobald
diese Schalen in Gebrauch sind.

Keine externen Audio-Services
-----------------------------

Keine Spotify-, Apple- oder SoundCloud-Embeds. Die Spuren werden
statisch von der eigenen Domain ausgeliefert. Das ist die
ethische Konsequenz der „keine Tracker"-Regel.
