# Communitas Cotidiana — Operations Runbook

Audience: Tobias and the three Begleiter (companion-role members).

This document describes the day-to-day operations of the Communitas platform.
For architecture, see `specs/001-communitas-cotidiana/`. For data policy and
DSGVO, see `data-policy.md`.

The platform is intentionally sober: there is no notification feed, no
inbox, no badges. You check the admin pages when you have time to read
carefully. None of the workflows below are time-pressed — the longest
deadline (14 days for application reply, per SC-002) is a comfortable
human pace.

---

## 1. Reading incoming applications

URL: `/communitas-mitglied/admin/bewerbungen`

Each application carries:
- the applicant's name and email
- their free-text answer to the entry question (max 2000 chars)
- the optional „Brief an sich selbst" (encrypted; not opened by the system)
- the desired tier (basis / voll / inner_circle)
- IP country (for context, not for filtering)

**What to look for:** an answer that takes the question seriously. Length is
not the marker; honesty is. Reject anything that reads as marketing copy or
a request for free coaching. Inner-Circle applications additionally require
a 90–120-minute Aufnahmegespräch with Tobias before acceptance — the
platform cannot automate that step.

**Letter-to-self stays sealed.** The system encrypts it on receipt. Three
months after acceptance the cron at `/api/communitas/cron/return-letters`
returns it to the writer unread, then deletes the ciphertext. **No one
opens it. Not even Tobias.**

---

## 2. Accepting / declining

In the admin UI:
- „In Gespräch" → marks status, sends template 2 (Aufnahmegespräch-Anschluss)
- „Annehmen" → creates a `members` row, sends template 3 (Wir nehmen dich auf),
  and starts a 14-day window for the applicant to choose a tier and pay
- „Ablehnen" → sends template 4 (Brief an die, die nicht aufgenommen wurden)

These transitions are one-way; reversing them requires a manual SQL update.

---

## 3. Assigning a Kreis

URL: `/communitas-mitglied/admin/kreise` (Phase 6 admin page)
or via API: `POST /api/communitas/admin/kreise` with `{ member_ids: [...] }`.

A Kreis is 3–5 members. The system does **not** suggest groupings — that's
a Begleiter judgment call. Once created, all members receive template 6
(Kreis-Einleitung) with the initial inner question.

The Kreis interior is end-to-end encrypted; the server cannot read the
content. If a member needs to leave a Kreis (and rejoin another), this is
a manual ops step: insert/delete `kreis_memberships` rows.

---

## 4. Setting a Schale (Schwellenritus)

Endpoint: `PATCH /api/communitas/admin/members/[id]/schale`

Body:
```json
{
  "new_schale_key": "speculum|silentium|rota|velum|logos|vox|vestigium",
  "transition_days": 3,
  "transition_letter": "Liebe(r) ...\n\n[between 50 and 2000 characters,\nwritten personally by the companion]"
}
```

What happens:
- the member's `current_schale_key` is updated
- `in_threshold_until = today + transition_days`
- the morning-anchor cron switches to a verse-only mail for `transition_days`
- the member receives a single email with the transition letter and one
  verse from the new Schale's tradition

Move Schalen rarely. A typical member stays in one for several months.
Never automate this step. The Schale represents the inner room the
member is currently in, and only a Begleiter has the context to know
when that has shifted.

---

## 5. Sending a Vollmond-Brief

URL: `/communitas-mitglied/admin/vollmond`

1. Pick a date (the actual astronomical Vollmond if possible)
2. Pick an author — Tobias OR one of the three Begleiter
3. Write the letter in Markdown (the editor accepts H1/H2/H3, paragraphs,
   bold, italic, lists, links)
4. Save as draft, review it once more after a night's sleep
5. Click „verschicken" — the system re-checks the Vier-Stimmen-Constraint
   at send time and refuses if Tobias has authored 7+ of the last 12 letters

The Vier-Stimmen-Constraint (Spec FR-029) is the hard guard against
personenkult. If the UI warns „eine andere Stimme ist dran", honour it.
Ask Veronika, Christoph, or Anna to write the next one.

---

## 6. Sending a Stille-Versammlung-Einladung

Same admin page (`/communitas-mitglied/admin/vollmond`), top section.

Enter:
- a date label (e.g. „Donnerstag, 5. März 2026")
- a time string (e.g. „20:00 Uhr (Berlin)")
- a Jitsi URL (HTTPS only)

The system sends Template 10 to all active members. There is no DB row —
this is a single-shot announcement. You re-invite each month.

Per Spec FR-027/FR-028: no chat, no recording, no Q&A. The Jitsi room is
configured externally (Jitsi self-hosted or jitsi.org) — the platform
just sends the link.

---

## 7. Handling an acute crisis disclosure

**This is the most important boundary.** The platform cannot read Zelle
entries or Kreis messages — they are end-to-end encrypted with the
member's password. If a Begleiter receives an out-of-band note (email,
phone, in person) suggesting a member is in acute distress:

1. **Do not query the database for their content.** There is nothing
   there to read.
2. **Reach out directly** via the member's `email` from the `members`
   table — a short, sober message offering to talk.
3. **Refer to professional resources.** The platform is not therapy.
   In Germany: Telefonseelsorge 0800 111 0 111 (free, 24/7). In
   Switzerland: Dargebotene Hand 143. In Austria: TelefonSeelsorge 142.
4. **Do not document the disclosure in the platform.** The DB has no
   field for it. This is intentional. If you must keep a note, keep it
   in your private records, not in shared infrastructure.

The platform is a sober rhythm-keeping infrastructure. It is **not** an
intervention system. The Communitas's role is presence over time, not
crisis response.

---

## 8. Granting a scholarship (3-of-N consensus)

URL: `/communitas-mitglied/admin/stipendien`

Three companion „ja" votes auto-grant. The system:
- inserts a `scholarship_grants` row with `approved_by_three=true`
- inserts a `subscriptions` row with `status='scholarship'`, Voll tier,
  for the calendar year
- marks the application `decision='granted'`

**Anonymity invariant:** there is no FK between `scholarship_pool_contributions`
and `scholarship_grants`. The recipient knows they received a scholarship
but not who funded it; the contributor knows their 5% Inner-Circle share
went into the pool but not who received it. This is enforced by the
schema (research.md §10), not just policy. Do not add a `donor_id` column.

For external applicants (no member account yet), auto-grant is blocked.
The 3-of-N vote signals consensus; one Begleiter then creates the member
manually (via the application acceptance flow) and re-runs the grant
once the `applicant_member_id` is set.

---

## 9. Common SQL queries

```sql
-- Active member count
SELECT COUNT(*) FROM members WHERE left_on IS NULL AND paused_until IS NULL;

-- Subscription tier breakdown
SELECT tier, COUNT(*) FROM subscriptions
WHERE status = 'active'
GROUP BY tier;

-- Pool balance (Phase 8): contributions minus grants in current year
SELECT
  (SELECT COALESCE(SUM(amount_cents), 0) FROM scholarship_pool_contributions
   WHERE contribution_year = EXTRACT(year FROM current_date)::int) AS contributions,
  (SELECT COUNT(*) * 360000 FROM scholarship_grants
   WHERE grant_year = EXTRACT(year FROM current_date)::int) AS grants_estimate;

-- Three-month silence list
SELECT m.id, m.display_name, m.email
FROM members m
WHERE m.left_on IS NULL
  AND m.paused_until IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM anker_sent_log a
    WHERE a.member_id = m.id AND a.sent_at >= now() - INTERVAL '90 days'
  );

-- Retreats with current occupancy
SELECT r.id, r.title, r.location, r.start_date,
       r.max_participants,
       (SELECT COUNT(*) FROM retreat_bookings rb
        WHERE rb.retreat_id = r.id AND rb.cancelled_at IS NULL) AS booked
FROM retreats r
WHERE r.cancelled_at IS NULL
ORDER BY r.start_date;
```

---

## 10. What does NOT need a runbook entry

- Daily anchors (morning/noon/evening): fully cron-driven.
- Return letters: cron-driven; the platform deletes the ciphertext after
  sending.
- Renewal reminders: weekly cron; one click cancel; no Are-You-Sure modal.
- Three-month-check: weekly cron; one gentle email; no follow-up.

If any cron breaks, Vercel surfaces the failure in its dashboard. Check
`vercel logs` and the cron history. Re-running a cron is safe (every
cron is idempotent via `anker_sent_log` UNIQUE constraints).
