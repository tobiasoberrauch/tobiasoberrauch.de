# Contract: HTTP API

**Base path**: `/api/communitas/`
**Content-type**: `application/json` für alle POST/PUT/DELETE, sofern nicht anders vermerkt.
**Auth**: signiertes httpOnly Session-Cookie `communitas_session`. Admin-Endpunkte zusätzlich `role IN ('companion','founder')`. Cron-Endpunkte: `Authorization: Bearer <CRON_SECRET>` Header.
**Rate-Limits**: pro IP 60 req/min auf `/apply` und `/auth/*`, 600 req/min sonst (Vercel Edge).
**CORS**: Same-origin only. Keine `Access-Control-Allow-Origin: *`.

Alle Endpunkte sind in EU-Region (fra1) konfiguriert.

---

## Öffentlich (kein Auth)

### `POST /api/communitas/apply`

Eine Bewerbung einreichen.

**Request body**:

```jsonc
{
  "name": "Erika Musterfrau",          // string, 1..120 Zeichen, Pflicht
  "email": "erika@example.de",         // RFC 5322 valide, Pflicht
  "question": "Was suche ich hier?",   // string, 1..2000 Zeichen, Pflicht
  "letter_to_self": "Liebe zukünftige Erika ...", // optional, 0..10000 Zeichen
  "desired_tier": "basis",             // 'basis' | 'voll' | 'inner_circle', default 'basis'
  "consent": true                      // bool, Pflicht, false → 400
}
```

**Responses**:
- `202 Accepted` `{ "ok": true, "message": "Bestätigung folgt per E-Mail." }`
- `400 Bad Request` `{ "ok": false, "code": "validation_error", "field": "email" }`
- `409 Conflict` `{ "ok": false, "code": "already_applied" }` (gleiche E-Mail in den letzten 30 Tagen)
- `429 Too Many Requests` `{ "ok": false, "code": "rate_limit" }`

**Side effects**:
- Insert in `applications`
- `letter_to_self` wird vor Speicherung mit `LETTER_ENCRYPTION_KEY` AES-GCM-verschlüsselt; Klartext erscheint nie auf Disk
- `return_letter_at` auf `current_date + INTERVAL '1 year'` gesetzt
- Bestätigungs-E-Mail an `applicant_email` (Resend, kein Tracking)
- Notification per E-Mail an Tobias (interne Mailing-Adresse)

---

## Authentifizierung

### `POST /api/communitas/auth/magic-link`

Magic-Link anfordern.

**Request body**:

```jsonc
{
  "email": "erika@example.de"
}
```

**Responses**:
- `204 No Content` — wir antworten immer mit 204, auch wenn die E-Mail nicht bekannt ist (kein Account-Enumeration)
- `429 Too Many Requests` — max 5 Anfragen pro 15 Minuten pro E-Mail

**Side effects** (nur wenn E-Mail einem aktiven Mitglied zugeordnet ist):
- Token (32 Byte random) generiert; SHA-256-Hash in `magic_links` gespeichert, Klartext in E-Mail-Link
- Link: `https://tobiasoberrauch.de/communitas-mitglied/login?t=<token>`, gültig 10 Minuten

### `GET /communitas-mitglied/login?t=<token>` (Astro-Page, nicht JSON)

Verifiziert Token, erstellt Session-Cookie, redirect zu `/communitas-mitglied/`.

### `POST /api/communitas/auth/logout`

Aktuelle Session beenden. `204 No Content`. Cookie wird gelöscht.

---

## Mitglied (Auth: aktive Session)

### `GET /api/communitas/me`

Eigenes Profil + heutige Anker-Übersicht.

**Response 200**:

```jsonc
{
  "member": {
    "display_name": "Erika",
    "tier": "voll",
    "current_schale": { "key": "rota", "german_name": "Die Wiederholung innerer Muster" },
    "in_threshold_until": null,
    "kreis_id": 3,
    "joined_on": "2026-03-22"
  },
  "today": {
    "weekday": "spur",        // 'spiegel' | 'stille' | 'spur' | 'begegnung' | 'versöhnung' | 'werk' | 'sammlung'
    "anchors_received": ["morning"],
    "anchors_pending": ["evening"]   // 'noon' fehlt bei Di/Do
  }
}
```

### `GET /api/communitas/cell/list`

Liste eigener Zell-Einträge — nur Metadaten, **kein** Chiffrat (das holt der Client beim Öffnen).

**Response 200**:

```jsonc
{
  "entries": [
    { "id": 1234, "written_on": "2026-05-20", "byte_length": 2048, "updated_at": "2026-05-20T21:14:00Z" },
    { "id": 1233, "written_on": "2026-05-19", "byte_length": 1023, "updated_at": "..." }
  ]
}
```

### `GET /api/communitas/cell/:id`

Einzelnes Chiffrat. Auth-Check: `member_id` muss dem aufrufenden Member matchen.

**Response 200**:

```jsonc
{
  "id": 1234,
  "ciphertext_b64": "...",
  "iv_b64": "...",
  "written_on": "2026-05-20"
}
```

**Response 403** wenn `member_id` nicht stimmt.

### `POST /api/communitas/cell/save`

Eintrag speichern oder aktualisieren.

**Request body**:

```jsonc
{
  "id": 1234,                 // optional; ohne id wird neuer Eintrag erzeugt
  "written_on": "2026-05-20",
  "ciphertext_b64": "...",    // base64-encoded AES-GCM-Output inkl. AuthTag
  "iv_b64": "..."             // 12 bytes nonce, base64
}
```

**Validation**:
- `byte_length(ciphertext_b64)` ≤ 256 KB (Cell-Einträge sind Texte, nicht Anhänge)
- `iv_b64` muss genau 12 Bytes dekodieren

**Response 200**: `{ "id": 1234, "updated_at": "..." }`

### `DELETE /api/communitas/cell/:id`

Eintrag löschen. `204 No Content`.

### `POST /api/communitas/kreis/send`

Brief an den eigenen Kreis senden.

**Request body**:

```jsonc
{
  "kreis_id": 3,
  "ciphertext_b64": "...",    // mit Kreis-Symkey verschlüsselt (Client-Side)
  "iv_b64": "..."
}
```

**Response 201**: `{ "message_id": 5678 }`

**Validation**:
- Caller muss Mitglied des Kreises sein (`kreis_members` lookup)
- Wenn `kreis_members.left_at IS NOT NULL` → 403

### `GET /api/communitas/kreis/:id/messages?since=<iso8601>`

Kreis-Nachrichten abrufen. Chiffrate, Client entschlüsselt.

**Response 200**:

```jsonc
{
  "kreis": { "id": 3, "name": "Kreis I — Herbst 2026" },
  "messages": [
    { "id": 5678, "author_display_name": "Tobias", "ciphertext_b64": "...", "iv_b64": "...", "sent_at": "..." }
  ]
}
```

### `GET /api/communitas/retreats`

Verfügbare Reisen mit Stand der Plätze.

**Response 200**:

```jsonc
{
  "retreats": [
    {
      "id": 1,
      "kind": "spring",
      "title": "Frühlingsschwelle — Kloster Müstair",
      "location": "Kloster Müstair, CH",
      "start_date": "2027-03-21",
      "end_date": "2027-03-24",
      "max_participants": 8,
      "booked_count": 3,
      "price_for_member_cents": 0,    // für InnerCircle inkl.; 180000 für Voll, 320000 für Basis
      "already_booked": false
    }
  ]
}
```

### `POST /api/communitas/retreats/:id/book`

Reise buchen → Stripe-Checkout-Link (außer für Inner Circle).

**Request**: leer

**Response 200**:

```jsonc
{
  "stripe_checkout_url": "https://checkout.stripe.com/c/pay/cs_...",
  "expires_at": "2026-05-20T15:30:00Z"
}
```

Oder bei kostenfreier Inkludierung (Inner Circle, NORDSTERN):

```jsonc
{ "booked": true, "retreat_booking_id": 99 }
```

---

## Zahlung

### `POST /api/communitas/stripe/checkout`

Stripe-Checkout-Session für Mitgliedschaft erstellen.

**Request body**:

```jsonc
{ "tier": "voll" }    // 'basis' | 'voll' | 'inner_circle' (Inner Circle nur wenn application approved für IC)
```

**Response 200**: `{ "url": "https://checkout.stripe.com/c/pay/cs_..." }`

### `POST /api/communitas/stripe/webhook`

Stripe Webhook-Empfang. Signatur via `STRIPE_WEBHOOK_SECRET` verifiziert.

**Events verarbeitet**:
- `checkout.session.completed` → Subscription aktivieren, „Du bist da. Willkommen."-Mail senden
- `invoice.payment_failed` → Status `past_due`, sachliche Erinnerungs-Mail (genau eine)
- `customer.subscription.deleted` → Status `cancelled`, kein Re-Engagement
- `customer.subscription.updated` → Status-Sync

Wir verarbeiten KEINE Events für: `customer.created` (Profil-Pflege), `payment_intent.succeeded` (Marketing-Telemetrie).

---

## Admin (Auth: role IN ('companion','founder'))

### `GET /api/communitas/admin/applications`

Liste eingegangener Bewerbungen, sortiert nach `received_at DESC`.

**Response 200**:

```jsonc
{
  "applications": [
    {
      "id": 1,
      "applicant_name": "Erika M.",
      "applicant_email": "erika@example.de",
      "question_text": "...",
      "letter_to_self_present": true,    // bool, nicht der Inhalt
      "desired_tier": "voll",
      "status": "received",
      "received_at": "...",
      "ip_country": "DE"
    }
  ]
}
```

**Wichtig**: `letter_to_self`-Inhalt wird NIE in Admin-API zurückgegeben. Nur die Existenz.

### `PATCH /api/communitas/admin/applications/:id`

Status ändern.

**Request body**:

```jsonc
{
  "status": "accepted",       // 'in_conversation' | 'accepted' | 'declined' | 'withdrawn'
  "status_note": "Im Gespräch entschieden."
}
```

Bei `status = 'accepted'`:
- Erzeugt `members`-Row
- Versendet Checkout-Link für gewählte Stufe per E-Mail
- Antwortet `200 { "member_id": 17 }`

### `POST /api/communitas/admin/kreise`

Neuen Kreis erstellen.

```jsonc
{
  "name": "Kreis II — Frühling 2026",
  "introductory_question": "Was hat dich in diese Stille gerufen?",
  "member_ids": [17, 22, 31, 44]   // 3..5
}
```

`201 { "kreis_id": 4 }`. Versendet Einführungs-Mail an alle Kreismitglieder.

### `PATCH /api/communitas/admin/members/:id/schale`

Schalen-Übergang einleiten.

```jsonc
{
  "new_schale_key": "rota",
  "transition_days": 5,         // 3..7
  "transition_letter": "Liebe Erika, du wechselst nun ..."
}
```

`200`. Setzt `in_threshold_until`, versendet Übergangsbrief, aktiviert reduzierten Anker-Modus.

---

## Cron (Auth: Bearer CRON_SECRET)

Alle Cron-Endpunkte sind GET (Vercel-Cron-Konvention) und idempotent.

### `GET /api/communitas/cron/morning`

**Schedule**: täglich um 04:00 UTC (07:00 / 06:00 / 05:00 lokale Mitgliedszeit abdeckt)
**Action**:
1. Selektiert aktive Mitglieder pro Zeitzone, wo `local_time` aktuell zwischen 06:00 und 08:00 liegt UND noch kein Eintrag in `anker_sent_log` für heute Morgen
2. Wählt Anker-Content pro `current_schale_key` + `weekday`
3. Sendet via Resend Batch (max 100 pro Call)
4. Schreibt `anker_sent_log` Zeilen
5. Antwortet `{ "sent": N, "skipped": M }`

### `GET /api/communitas/cron/noon`

**Schedule**: Mo/Mi/Fr um 10:00 UTC
**Action**: Wie morning, aber für Mittagsanker. Nur falls Wochentag in `{monday, wednesday, friday}`. An Di/Do explizit `204` ohne Versand.

### `GET /api/communitas/cron/evening`

**Schedule**: täglich um 19:00 UTC
**Action**: Wie morning, aber für Abendrückblick. Inhalt sind die drei festen Fragen + ein Link zur Zelle (für Voll+InnerCircle).

### `GET /api/communitas/cron/three-month-check`

**Schedule**: wöchentlich Sonntag um 12:00 UTC
**Action**: Selektiert Mitglieder, die seit 90 Tagen `anker_sent_log.sent_at` haben aber null `cell_entries` insertions UND null `kreis_messages` UND null `retreat_bookings` in dem Zeitraum. Sendet sanfte Wiederfrage in dem festen Wortlaut.

### `GET /api/communitas/cron/scholarship-cycle`

**Schedule**: jährlich am 1. November um 12:00 UTC
**Action**: Berechnet aktuellen Pool-Saldo. Versendet Vergabe-Trigger an die drei Begleiter (nicht Tobias) mit der Aufforderung, anonym über die zwölf Stipendien zu entscheiden. Vergabe selbst erfolgt manuell via Admin-Endpunkt `POST /api/communitas/admin/scholarships/grant`.

### `GET /api/communitas/cron/return-letters`

**Schedule**: täglich um 09:00 UTC
**Action**: Selektiert `applications` mit `return_letter_at = today` UND `letter_returned_at IS NULL`. Entschlüsselt `letter_to_self`, versendet als Anhang an `applicant_email` mit Begleittext „Du hast diesen Brief vor einem Jahr geschrieben.", setzt `letter_returned_at = now()`.

---

## Error Codes (Konsistente Liste)

| Code | HTTP | Bedeutung |
|---|---|---|
| `validation_error` | 400 | Body validation fehlgeschlagen; `field` zeigt das Problem |
| `unauthorized` | 401 | Keine gültige Session |
| `forbidden` | 403 | Session vorhanden, aber Rolle/Besitz fehlt |
| `not_found` | 404 | Resource existiert nicht oder gehört anderem Mitglied |
| `already_applied` | 409 | Bewerbung in den letzten 30 Tagen vorhanden |
| `rate_limit` | 429 | Rate-Limit getroffen |
| `not_configured` | 503 | Backend-Setup unvollständig (z.B. Stripe-Keys fehlen) |
| `upstream_error` | 502 | Stripe/Resend/DB Fehler |

Alle Fehler-Responses sind JSON mit Schema `{ "ok": false, "code": "...", "field"?: "...", "detail"?: "..." }`.
