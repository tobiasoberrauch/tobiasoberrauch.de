/**
 * Template 10 — Stille Versammlung, Einladung.
 *
 * Monatlich, erster Donnerstag (Spec FR-027). Kein Chat, keine Aufzeichnung,
 * keine Q&A. Mitglied klickt einmal — Link öffnet sich im Browser.
 *
 * Wording per contracts/email-templates.md §10.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface SilentAssemblyInvitationProps {
  date_label: string;     // z. B. "Donnerstag, 5. März 2026"
  time_local: string;     // z. B. "20:00 Uhr (Berlin)"
  jitsi_url: string;
}

export default function silentAssemblyInvitation(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as SilentAssemblyInvitationProps;
  const date = escapeHtml(p.date_label);
  const time = escapeHtml(p.time_local);
  const url = p.jitsi_url;

  const inner = `
    <p style="margin: 0 0 1em;">Stille Versammlung</p>
    <p style="margin: 0 0 1em;">${date} · ${time}</p>
    <p style="margin: 0 0 1em;">
      <a href="${url}" style="color: #1c1917;">${url}</a>
    </p>
    <p style="margin: 0 0 1em;">
      Wir treffen uns für 25 Minuten Stille. Kamera an, Mikrofon aus.
      Keine Aufzeichnung. Keine Tagesordnung.
    </p>
    <p style="margin: 0 0 1em;">
      Komm fünf Minuten vorher. Wir beginnen pünktlich.
    </p>
  `;
  return communitasShell(inner);
}
