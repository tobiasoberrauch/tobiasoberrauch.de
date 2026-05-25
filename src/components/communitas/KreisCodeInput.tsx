/**
 * KreisCodeInput — Phase 7 / US5 / T096.
 *
 * Member-facing form that takes the 6-word code, derives the kreis
 * symkey via Argon2id, and stores it in IndexedDB under slot
 * `kreis-<id>`. If the kreis already has messages, we attempt to
 * decrypt one to validate the code; otherwise we accept optimistically
 * (the first authored message will implicitly validate the key).
 */
import { useEffect, useState } from 'react';
import {
  deriveKey,
  decryptText,
  storeKeyInIndexedDB,
} from '../../lib/communitas/client-crypto';
import { WORDLIST_DE_512 } from '../../lib/communitas/wordlist-de-512';

interface Props {
  kreisId: number;
  onKeyReady: () => void;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function normalizeInput(s: string): string[] {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export default function KreisCodeInput({ kreisId, onKeyReady }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Pre-compute a Set for O(1) lookups.
  const [wordSet, setWordSet] = useState<Set<string> | null>(null);

  useEffect(() => {
    setWordSet(new Set(WORDLIST_DE_512));
  }, []);

  async function submit() {
    setError('');
    const words = normalizeInput(input);
    if (words.length !== 6) {
      setError('Sechs Wörter, durch Leerzeichen getrennt.');
      return;
    }
    if (!wordSet) return;
    for (const w of words) {
      if (!wordSet.has(w)) {
        setError(`Eines der Wörter ist uns unbekannt: „${w}". Prüfe die Schreibweise.`);
        return;
      }
    }

    setBusy(true);
    try {
      // 1) Get the kreis salt from the server (gated by membership).
      const saltRes = await fetch(`/api/communitas/kreis/${kreisId}/salt`);
      if (!saltRes.ok) {
        setError('Salz konnte nicht geladen werden. Bist du Mitglied dieses Kreises?');
        return;
      }
      const { salt_b64 } = (await saltRes.json()) as { salt_b64: string };

      // 2) Derive the symkey via Argon2id.
      const slot = `kreis-${kreisId}`;
      const key = await deriveKey(words.join(' '), slot, b64ToBytes(salt_b64));

      // 3) Validate against an existing message if any. If decrypt
      //    throws, the typed code is wrong — wipe and ask for retry.
      const probe = await fetch(
        `/api/communitas/kreis/${kreisId}/messages?limit=1`,
      );
      if (probe.ok) {
        const body = (await probe.json()) as {
          messages: Array<{ ciphertext_b64: string; iv_b64: string }>;
        };
        if (body.messages.length > 0) {
          const first = body.messages[0];
          try {
            await decryptText(
              b64ToBytes(first.ciphertext_b64),
              b64ToBytes(first.iv_b64),
              key,
            );
          } catch {
            setError(
              'Der Code stimmt nicht. Frag Tobias oder ein anderes Mitglied.',
            );
            return;
          }
        }
      }

      // 4) Store and signal ready.
      await storeKeyInIndexedDB(key, slot);
      onKeyReady();
    } catch (err) {
      setError((err as Error).message || 'Schlüsselableitung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article style={styles.layout}>
      <h2 style={styles.h2}>Schreibe den sechs-Wort-Code, den du per Mail bekommen hast.</h2>
      <p style={styles.muted}>
        Sechs Wörter, klein geschrieben, durch Leerzeichen getrennt. Der
        Code verlässt diesen Browser nicht — auch wir kennen ihn nicht.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="abend brot eiche … "
        style={styles.textarea}
        disabled={busy}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        rows={3}
      />
      <div style={styles.actions}>
        <button type="button" style={styles.btn} onClick={submit} disabled={busy}>
          {busy ? 'Wird abgeleitet …' : 'Aufnehmen'}
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.muted}>
        Verloren? Tobias oder ein Begleiter kann einen neuen Code für
        deinen Kreis erzeugen — dann werden aber alle bisherigen Briefe
        nicht mehr lesbar.
      </p>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    maxWidth: '38rem',
    margin: '2rem auto',
    padding: '0 1.25rem',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    color: '#1c1917',
    lineHeight: 1.6,
  },
  h2: {
    fontSize: '1.2rem',
    fontWeight: 400,
    margin: '0 0 0.75rem',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.8rem 1rem',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '1.05rem',
    letterSpacing: '0.02em',
    border: '1px solid #d6d3d1',
    background: '#fefefe',
    color: '#1c1917',
    borderRadius: 2,
    resize: 'vertical',
  },
  actions: { marginTop: '0.75rem' },
  btn: {
    padding: '0.55rem 1.2rem',
    background: '#1c1917',
    color: '#fefefe',
    border: 0,
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
  },
  muted: { color: '#78716c', fontSize: '0.92rem', marginTop: '0.75rem' },
  error: { color: '#a00', marginTop: '0.5rem' },
};
