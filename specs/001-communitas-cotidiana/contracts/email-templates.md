# Contract: E-Mail Templates

Alle Templates sind inline-CSS, schwarz auf weiß, ohne Logo, ohne Bilder, ohne Tracking-Pixel. Resend wird mit `tracking: { opens: false, clicks: false }` aufgerufen. Keine UTM-Parameter in Links.

Schriftarten: System-Serifen-Stack `Georgia, "Times New Roman", Times, serif` für Body, gleich für Headlines (kein Sans-Serif-Bruch). Maximalbreite 580 px für Mail-Client-Kompatibilität.

## Common Footer

Jede Mail endet mit:

```html
<hr style="border: 0; border-top: 1px solid #d6d3d1; margin: 2rem 0 1rem;" />
<p style="color: #78716c; font-size: 0.78rem; line-height: 1.5;">
  Communitas Cotidiana · <a href="https://tobiasoberrauch.de/communitas/" style="color: #78716c;">tobiasoberrauch.de/communitas</a>
</p>
<p style="color: #78716c; font-size: 0.72rem;">
  <a href="https://tobiasoberrauch.de/communitas-mitglied/abmelden?t=<unsub_token>" style="color: #78716c;">Abmelden</a>
</p>
```

Ein-Klick-Abmelde-Link gemäß RFC 8058 (`List-Unsubscribe-Post: List-Unsubscribe=One-Click` Header gesetzt).

---

## 1. Aufnahme-Bestätigung

**Trigger**: `POST /api/communitas/apply` erfolgreich
**Subject**: `Deine Bewerbung ist eingegangen.`
**Body** (Markdown, gerendert zu HTML):

```text
Liebe(r) {name},

deine Bewerbung ist angekommen. Tobias oder ein Begleiter meldet sich
innerhalb von vierzehn Tagen.

Du kannst diesen Brief unbeantwortet lassen. Wir antworten nur, wenn wir
mit dir sprechen wollen — oder wenn wir gemeinsam zu dem Schluss kommen,
dass du anderswo besser aufgehoben bist.

Bis dahin: nimm dir Zeit. Niemand wartet auf eine Reaktion von dir.

In Stille,
Tobias
```

## 2. Aufnahme-Annahme + Checkout

**Trigger**: Admin setzt `application.status = 'accepted'`
**Subject**: `Du bist eingeladen.`
**Body**:

```text
Liebe(r) {name},

wir haben dein Gespräch gelesen und freuen uns, dich in die Versammlung
aufzunehmen.

Der nächste Schritt ist die Verbindlichkeit: wähle deine Stufe und schließe
sie ab. Dieser Link gilt sieben Tage:

{checkout_url}

— Communitas Basis: €960 / Jahr
— Communitas Voll: €3.600 / Jahr

Sobald die Verbindlichkeit getragen ist, beginnt am nächsten Morgen das
Cotidianum.

Wiederkehr ist alles.

In Stille,
Tobias
```

## 3. Aufnahme-Ablehnung

**Trigger**: Admin setzt `application.status = 'declined'`
**Subject**: `Eine andere Tür.`
**Body**:

```text
Liebe(r) {name},

wir haben deine Frage gelesen und überlegt. Diesmal nehmen wir dich nicht
auf.

Das ist keine Wertung deiner Person. Es ist eine Wertung des Augenblicks —
ob das, was du suchst, hier seinen Ort hat. Wir glauben, es liegt anderswo.

Wenn du in akuter seelischer Not bist, hier sind Hände:

- Telefonseelsorge: 0800 111 0 111 oder 0800 111 0 222 (rund um die Uhr,
  kostenlos, anonym)
- Notruf: 112

Wir wünschen dir Frieden.

Tobias
```

## 4. Magic-Link

**Subject**: `Dein Schlüssel zur Communitas.`
**Body**:

```text
{name},

dein Anmelde-Link, gültig zehn Minuten:

{magic_link_url}

Wenn du diese Mail nicht angefordert hast, ignoriere sie.
```

## 5. Morgensammlung (Anker)

**Subject**: `{question_excerpt}` (die Frage selbst, max 60 Zeichen)
**Body**:

```text
{vers_or_blank_line}

{frage_des_tages}

— {weekday_in_communitas} ({date_string})
```

Beispiel:

```text
"Du musst dein Leben ändern."
                              — Rilke

Wo bist du heute nicht du selbst gewesen?

— Spiegel (Montag, 25. Mai)
```

**Wichtig**: KEIN Logo, KEIN Banner, KEIN Bild, KEIN Tracking-Pixel `<img src=trk.gif/>`.

## 6. Mittagsinnehalten

**Subject**: `Mittag.`
**Body**:

```text
Ein Augenblick.

Spur, fünf bis acht Minuten:

{audio_url}

(Wenn du das Mittagsmahl in Ruhe nehmen kannst, nimm es. Wenn nicht,
genügt ein Augenblick.)
```

`audio_url` zeigt direkt auf `https://tobiasoberrauch.de/media/cotidianum/<schale>/<weekday>.mp3`. Kein Player-Embed, kein iFrame.

## 7. Abendrückblick

**Subject**: `Drei Fragen.`
**Body**:

```text
Wo war ich heute wach?

Wo war ich heute schlafend?

Wofür danke ich?

(Wenn du schreiben möchtest:)
{cell_url}    [nur für Voll- und InnerCircle-Mitglieder; bei Basis: weggelassen]
```

## 8. Vollmond-Brief

**Subject**: `Vollmond — {month_name}.`
**Body**: Variable Länge (3.000–4.000 Worte) im Markdown vom Autor. Footer mit „Bleibe ich? Gehe ich?"-Zeile + Ein-Klick-Abmelde-Link.

## 9. Sanfte Wiederfrage (3-Monats-Schweige)

**Subject**: `Wir denken an dich.`
**Body** (exakter Wortlaut, nicht abweichend):

```text
{name},

drei Monate sind vergangen, ohne dass wir gehört oder gesehen haben, wo
du bist.

Das ist keine Mahnung. Es ist eine schlichte Frage.

Wenn du gehen willst, gehe in Frieden. Wenn du bleiben willst, bist du da.

Du musst nicht antworten.

Tobias
```

## 10. Stille Versammlung — Einladung

**Subject**: `Erster Donnerstag. Stille.`
**Body**:

```text
Am {datum} um {uhrzeit} Uhr.

Eine Stunde. Tobias eröffnet mit einem Vers. Dann sechzig Minuten Stille.
Am Ende ein zweiter Vers, ein Segen, ein Schließen.

Kamera-an oder Kamera-aus, wie du willst.

Der Raum:
{jitsi_url}

(Wenn du nicht kommst, kommt der Raum ohne dich aus.)
```

## 11. Erneuerungs-Erinnerung (4 Wochen vor Jahres-Ende)

**Subject**: `Bleibe ich? Gehe ich?`
**Body**:

```text
{name},

am {renewal_date} erneuert sich deine Mitgliedschaft. Du musst nichts tun,
wenn du bleiben willst.

Wenn du gehen willst, klicke hier — einmal genügt:

{one_click_cancel_url}

Wir tragen einander, ohne uns festzuhalten.

Tobias
```

## 12. Brief an sich selbst — Rückzustellung (1 Jahr später)

**Subject**: `Du hast diesen Brief vor einem Jahr geschrieben.`
**Body**:

```text
{name},

vor einem Jahr — am {original_date} — hast du dir selbst geschrieben.

Hier ist der Brief, ungeöffnet von uns:

—— BEGIN BRIEF ——

{decrypted_letter_content}

—— ENDE BRIEF ——

Was sagt er dir heute?
```

Dieser Brief ist die EINZIGE Stelle, an der `letter_to_self` jemals entschlüsselt wird. Server liest, sendet, vergisst (kein Caching).

## 13. „Du bist da. Willkommen."

**Trigger**: Stripe `checkout.session.completed`
**Subject**: `Du bist da.`
**Body**:

```text
{name},

du bist da. Willkommen.

Morgen früh — zwischen sechs und acht — beginnt das Cotidianum.

Bei jedem Vollmond fragt diese Versammlung dich: Bleibe ich? Gehe ich?
Du musst nicht antworten. Aber niemand kommt um die Frage herum.

Tobias
```

## 14. Stipendien-Vergabe-Trigger (an drei Begleiter)

**Trigger**: Jährlicher Cron `scholarship-cycle`
**Subject**: `Zwölf stille Stipendien — November-Vergabe.`
**Body**:

```text
Begleiter,

der Pool steht für dieses Jahr: {pool_amount_eur} Euro.
Wir können {n_grants} stille Stipendien vergeben.

Hier sind die anonymisierten Bewerbungsbriefe:

{anonymized_letters_pdf_url}

Bitte trefft eure Entscheidung einstimmig. Niemand sonst sieht eure
Diskussion. Trage deine Wahl ein:

{decision_url}

In Stille,
Tobias
```
