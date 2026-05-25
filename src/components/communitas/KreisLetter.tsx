/**
 * KreisLetter — Phase 7 / US5 / T097.
 *
 * The Briefkreis surface. Lists the past month of letters, lets the
 * member write a new one. AES-GCM encrypt/decrypt happens here, using
 * the symkey from IndexedDB slot `kreis-<id>`.
 *
 * Polling: every 5 minutes. No real-time, no read-receipts, no likes,
 * no reactions — Spec FR-024.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  decryptText,
  encryptText,
  loadKeyFromIndexedDB,
} from '../../lib/communitas/client-crypto';

interface Props {
  kreisId: number;
  currentMemberId: number;
  displayName: string;
  /** Render the KreisCodeInput surface when no key is found. */
  onNeedsCode: () => void;
}

interface KreisInfo {
  id: number;
  name: string;
  introductory_question: string;
  member_count: number;
  joined_at: string;
}

interface RawMessage {
  id: number;
  author_id: number;
  author_display_name: string;
  ciphertext_b64: string;
  iv_b64: string;
  sent_at: string;
}

interface Letter {
  id: number;
  author_id: number;
  author_display_name: string;
  sent_at: string;
  body: string | null; // null = decrypt failed
}

const POLL_MS = 5 * 60 * 1000;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(b: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function KreisLetter({
  kreisId,
  currentMemberId,
  displayName,
  onNeedsCode,
}: Props) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [info, setInfo] = useState<KreisInfo | null>(null);
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const firstName = useMemo(
    () => displayName.split(' ')[0] ?? displayName,
    [displayName],
  );
  void currentMemberId;

  useEffect(() => {
    void bootstrap();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [kreisId]);

  async function bootstrap() {
    try {
      const k = await loadKeyFromIndexedDB(`kreis-${kreisId}`);
      if (!k) {
        onNeedsCode();
        return;
      }
      setKey(k);

      const infoRes = await fetch(`/api/communitas/kreis/${kreisId}`);
      if (!infoRes.ok) {
        setError('Der Kreis konnte nicht geladen werden.');
        return;
      }
      setInfo((await infoRes.json()) as KreisInfo);
      await loadLetters(k);

      // Quiet poll.
      pollTimer.current = setInterval(() => {
        void loadLetters(k);
      }, POLL_MS);
    } catch (err) {
      setError((err as Error).message || 'Fehler beim Laden.');
    }
  }

  async function loadLetters(useKey: CryptoKey) {
    try {
      const res = await fetch(
        `/api/communitas/kreis/${kreisId}/messages?limit=100`,
      );
      if (!res.ok) {
        setError('Briefe konnten nicht geladen werden.');
        return;
      }
      const body = (await res.json()) as { messages: RawMessage[] };
      const decoded: Letter[] = [];
      for (const m of body.messages) {
        let plain: string | null = null;
        try {
          plain = await decryptText(
            b64ToBytes(m.ciphertext_b64),
            b64ToBytes(m.iv_b64),
            useKey,
          );
        } catch {
          plain = null;
        }
        decoded.push({
          id: m.id,
          author_id: m.author_id,
          author_display_name: m.author_display_name,
          sent_at: m.sent_at,
          body: plain,
        });
      }
      setLetters(decoded);
    } catch (err) {
      setError((err as Error).message || 'Verbindung verloren.');
    }
  }

  async function send() {
    if (!key) return;
    setError('');
    const text = draft.trim();
    if (text.length === 0) {
      setError('Leerer Brief wird nicht abgeschickt.');
      return;
    }
    setBusy(true);
    try {
      const { ciphertext, iv } = await encryptText(text, key);
      const res = await fetch('/api/communitas/kreis/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kreis_id: kreisId,
          ciphertext_b64: bytesToB64(ciphertext),
          iv_b64: bytesToB64(iv),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          `Senden fehlgeschlagen: ${(body as { code?: string }).code ?? res.status}`,
        );
        return;
      }
      setDraft('');
      await loadLetters(key);
    } catch (err) {
      setError((err as Error).message || 'Verbindung verloren.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !info) {
    return <p style={styles.error}>{error}</p>;
  }
  if (!info || !letters) {
    return <p style={styles.muted}>Lade …</p>;
  }

  return (
    <article style={styles.layout}>
      <header style={styles.header}>
        <h1 style={styles.h1}>{info.name}</h1>
        <p style={styles.question}>{info.introductory_question}</p>
        <p style={styles.muted}>
          {info.member_count} im Kreis — {firstName}, du gehörst dazu.
        </p>
      </header>

      <section style={styles.feed}>
        {letters.length === 0 && (
          <p style={styles.muted}>(Noch hat niemand geschrieben.)</p>
        )}
        {letters.map((l) => (
          <article key={l.id} style={styles.letter}>
            <div style={styles.letterMeta}>
              <strong>{l.author_display_name}</strong>{' '}
              <span style={styles.muted}>· {formatDateTime(l.sent_at)}</span>
            </div>
            {l.body !== null ? (
              <p style={styles.letterBody}>{l.body}</p>
            ) : (
              <p style={styles.letterBodyMissing}>
                Dieser Brief konnte nicht entschlüsselt werden.
              </p>
            )}
          </article>
        ))}
      </section>

      <section style={styles.composer}>
        <h2 style={styles.h2}>Schreiben</h2>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Was willst du den anderen sagen?"
          style={styles.textarea}
          disabled={busy}
        />
        <div style={styles.composerActions}>
          <button
            type="button"
            style={styles.btn}
            onClick={send}
            disabled={busy}
          >
            {busy ? 'Wird gesendet …' : 'Brief schicken'}
          </button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </section>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    maxWidth: '42rem',
    margin: '2rem auto',
    padding: '0 1.25rem',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    color: '#1c1917',
    lineHeight: 1.7,
  },
  header: { marginBottom: '2rem' },
  h1: { fontSize: '1.8rem', fontWeight: 400, margin: '0 0 0.5rem' },
  h2: {
    fontSize: '1.05rem',
    fontWeight: 400,
    fontStyle: 'italic',
    color: '#78716c',
    margin: '0 0 0.5rem',
  },
  question: {
    fontStyle: 'italic',
    color: '#44403c',
    margin: '0.25rem 0 0.75rem',
    paddingLeft: '1rem',
    borderLeft: '2px solid #78716c',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  letter: {
    paddingBottom: '1rem',
    borderBottom: '1px solid #e7e5e4',
  },
  letterMeta: {
    fontSize: '0.92rem',
    marginBottom: '0.4rem',
  },
  letterBody: {
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  letterBodyMissing: {
    margin: 0,
    color: '#78716c',
    fontStyle: 'italic',
  },
  composer: { marginTop: '2rem' },
  textarea: {
    minHeight: '12rem',
    width: '100%',
    boxSizing: 'border-box',
    padding: '1rem',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    fontSize: '1rem',
    lineHeight: 1.7,
    border: '1px solid #d6d3d1',
    background: '#fefefe',
    color: '#1c1917',
    borderRadius: 2,
    resize: 'vertical',
  },
  composerActions: { marginTop: '0.75rem' },
  btn: {
    padding: '0.55rem 1.2rem',
    background: '#1c1917',
    color: '#fefefe',
    border: 0,
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
  },
  muted: { color: '#78716c', fontSize: '0.92rem' },
  error: { color: '#a00', marginTop: '0.5rem' },
};
