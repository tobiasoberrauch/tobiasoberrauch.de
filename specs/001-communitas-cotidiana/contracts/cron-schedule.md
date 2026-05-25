# Contract: Cron Schedule

Konfiguriert in `vercel.json` unter `crons[]`. Alle Zeiten in UTC. Auth via `Authorization: Bearer ${CRON_SECRET}` Header (Vercel setzt diesen automatisch für eigene Cron-Triggers, externe Calls erhalten 401).

```jsonc
{
  "crons": [
    { "path": "/api/communitas/cron/morning",            "schedule": "0 4 * * *" },
    { "path": "/api/communitas/cron/noon",               "schedule": "0 10 * * 1,3,5" },
    { "path": "/api/communitas/cron/evening",            "schedule": "0 19 * * *" },
    { "path": "/api/communitas/cron/three-month-check",  "schedule": "0 12 * * 0" },
    { "path": "/api/communitas/cron/return-letters",     "schedule": "0 9 * * *" },
    { "path": "/api/communitas/cron/scholarship-cycle",  "schedule": "0 12 1 11 *" }
  ]
}
```

## Zeitachsen-Logik

### `morning` — Morgensammlung

- Globaler Trigger: 04:00 UTC.
- Endpoint berechnet pro Mitglied lokale Uhrzeit. Versendet nur, wenn lokal aktuell zwischen 06:00 und 08:00 UND noch nicht heute morgen versandt (`anker_sent_log`-Lookup).
- Bei Mitgliedern in Zeitzonen, die diesen Slot nicht abdecken (z. B. US/Pacific, lokal 21:00 vom Vortag): nächster Cron-Lauf erwischt sie nicht; Phase-1-Scope ist DACH (UTC+1 / UTC+2). Internationaler Versand wird in Phase 2 mit zusätzlichem 14:00 UTC Cron ergänzt.
- Wenn Mitglied im Schwellenritus (`in_threshold_until ≥ today`): reduzierter Inhalt (nur Vers, keine Frage).

### `noon` — Mittagsinnehalten

- Cron läuft nur Mo (1), Mi (3), Fr (5). Di/Do hat keinen Cron-Eintrag — Stille gehört zur Architektur (siehe Spec FR-011).
- 10:00 UTC = 12:00 lokal (Berlin Sommerzeit) / 11:00 (Winterzeit).
- Eine kleine UTC-Drift im Winter ist akzeptabel; Spec-Toleranz ist „zwischen 12:00 und 14:00" (FR-011), Cron deckt das ab.

### `evening` — Abendrückblick

- 19:00 UTC = 21:00 lokal Sommerzeit / 20:00 Winterzeit.
- Spec-Toleranz „ab 21:00" — im Winter etwas früher (20:00), akzeptabel und einheitlich.

### `three-month-check` — Sanfte Wiederfrage

- Sonntag 12:00 UTC.
- Query: Mitglieder, deren letzte Aktivitäts-Signale (`anker_sent_log.sent_at` als Proxy für Mail-Geöffnet ist NICHT verfügbar — wir tracken nicht. Statt dessen: existiert ein `cell_entries.created_at > 90d ago` ODER `kreis_messages.sent_at > 90d ago` ODER `retreat_bookings.booked_at > 90d ago` ODER `subscriptions.status_change in last 90d`?).
- Wenn keines: Wiederfrage senden, `members.last_quiet_check_at` setzen (in `006_anchor_log.sql` als zusätzliche Spalte), nicht häufiger als alle 6 Monate pro Mitglied.

### `return-letters` — Briefe zurücksenden

- Täglich 09:00 UTC.
- Selektiert `applications` mit `return_letter_at = today` AND `letter_returned_at IS NULL`.
- Entschlüsselt `letter_to_self` mit `LETTER_ENCRYPTION_KEY`, fügt als E-Mail-Anhang (PDF mit Klartext) bei.
- Setzt `letter_returned_at = now()`.
- Kein Wiederholungsversuch bei Bounce — Mitglied hat dann eben den Brief nicht zurück, das ist tragisch aber kein Plattformversagen.

### `scholarship-cycle` — Stipendien-Jahresvergabe

- Einmal pro Jahr: 1. November um 12:00 UTC.
- Berechnet Pool-Saldo: `SUM(scholarship_pool_contributions.amount_cents) - SUM(scholarship_grants × 360000 cents per Vollmitgliedschaft)`.
- Sendet Vergabe-Trigger-Mail an die drei Begleiter (Members mit role='companion'), mit anonymisiertem PDF aller Stipendien-Briefe (separate Tabelle `scholarship_applications`, hier nicht modelliert, wird später ergänzt).

## Idempotenz-Garantie

Jeder Cron-Endpunkt MUSS idempotent sein:

- Vor Versand: `INSERT INTO anker_sent_log (..) ON CONFLICT (member_id, anker_type, scheduled_for) DO NOTHING RETURNING id`
- Nur wenn `RETURNING id` einen Wert liefert → versenden.
- Bei Resend-Fehlern: `anker_sent_log`-Row wird gelöscht, damit nächster Cron-Lauf erneut versucht.

## Beobachtbarkeit

Vercel-Logs zeigen Cron-Ausführungen. Wir loggen:

- `[cron:morning] candidates=200 sent=187 skipped=13 elapsed=8.4s`
- Keine personenbezogenen Daten in Logs.
- Bei Fehlerrate > 5 % wird eine technische Mail an Tobias gesendet (separat von der ruhigen Mitglieder-Kommunikation).

## Konsequenz für Vercel-Tier

Hobby-Tier erlaubt nur 2 Cron-Jobs. Wir brauchen 6. **Vercel Pro ist Voraussetzung** ab Launch ($20/Monat). Das ist in der Wirtschaftsrechnung der Spec (Ziel: 40 Mitglieder × Ø €200 in Year 1 = €80k) trivial getragen.
