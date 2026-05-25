/**
 * PassphraseSetup — first-time setup OR destructive reset of the Zell-Passphrase.
 *
 * Phase 6 / US4 / T085.
 *
 * The passphrase NEVER leaves the browser. We derive a non-extractable
 * AES-GCM CryptoKey via Argon2id, then store the key + salt locally in
 * IndexedDB, and post the salt (only the salt — public input) to the
 * server so the user can re-derive the same key on a new device.
 *
 * If the user forgets their passphrase: there is no recovery path other
 * than the destructive reset. This is by design (Spec assumption:
 * „Passwortverlust = Datenverlust ist akzeptiert").
 */
import { useState } from 'react';
import {
  deriveKey,
  storeKeyInIndexedDB,
  wipeKeys,
} from '../../lib/communitas/client-crypto';

const SALT_BYTES = 16;
const MIN_PASSPHRASE = 16;

interface Props {
  mode: 'first-time' | 'reset';
  onComplete?: () => void;
}

function bytesToB64(b: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin);
}

export default function PassphraseSetup({ mode, onComplete }: Props) {
  const [phase1, setPhase1] = useState<'intro' | 'pass' | 'done'>(
    mode === 'reset' ? 'intro' : 'pass',
  );
  const [confirmedReset, setConfirmedReset] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passphrase2, setPassphrase2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function performReset(): Promise<boolean> {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/communitas/cell/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmation: 'Ich verstehe' }),
      });
      if (!res.ok) {
        setError('Zurücksetzen hat nicht geklappt. Bitte später noch einmal.');
        return false;
      }
      await wipeKeys();
      return true;
    } catch {
      setError('Verbindung verloren.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function performSetup() {
    setError('');
    if (passphrase.length < MIN_PASSPHRASE) {
      setError('Mindestens 16 Zeichen.');
      return;
    }
    if (passphrase !== passphrase2) {
      setError('Die beiden Eingaben stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
      // Derive key with random per-member extraSalt.
      const key = await deriveKey(passphrase, 'cell', salt);
      // Persist key + salt locally.
      await storeKeyInIndexedDB(key, 'cell');
      // Store salt as a raw Uint8Array in the same store under 'cell-salt'.
      // Re-use the same module's openDb via storeKeyInIndexedDB — but it
      // typed the second arg as CryptoKey. We piggy-back: IndexedDB accepts
      // any structured-cloneable value. Cast via unknown.
      await storeKeyInIndexedDB(
        salt as unknown as CryptoKey,
        'cell-salt',
      );
      // POST salt to server so other devices can fetch it.
      const res = await fetch('/api/communitas/cell/salt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ salt_b64: bytesToB64(salt) }),
      });
      if (!res.ok) {
        // 409 means the salt is already set on the server (cross-device
        // edge case where the user just performed a reset on another
        // device but didn't refresh here). We surface this clearly.
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError(
            'Auf dem Server ist bereits ein anderer Salt hinterlegt. Bitte hole zuerst die bestehende Konfiguration ab oder setze die Zelle zurück.',
          );
        } else {
          setError(
            'Salt konnte nicht gespeichert werden. Bitte später noch einmal.',
          );
        }
        // We still keep the local key for now; user can retry.
        setBusy(false);
        return;
      }
      setPhase1('done');
      onComplete?.();
    } catch (err) {
      setError((err as Error).message || 'Etwas ist schiefgegangen.');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'reset' && phase1 === 'intro') {
    return (
      <article style={styles.wrap}>
        <h2 style={styles.h2}>Zelle zurücksetzen</h2>
        <p>
          Beim Zurücksetzen verlierst du alle bisherigen Einträge. Das System
          kann sie nicht entschlüsseln — sie sind weg, sobald du eine neue
          Passphrase setzt.
        </p>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={confirmedReset}
            onChange={(e) => setConfirmedReset(e.target.checked)}
            disabled={busy}
          />
          <span>Ich habe verstanden. Ich akzeptiere den Verlust.</span>
        </label>
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.btn}
            disabled={!confirmedReset || busy}
            onClick={async () => {
              const ok = await performReset();
              if (ok) setPhase1('pass');
            }}
          >
            Zelle zurücksetzen
          </button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </article>
    );
  }

  if (phase1 === 'done') {
    return (
      <article style={styles.wrap}>
        <h2 style={styles.h2}>Bereit.</h2>
        <p>Die Zelle ist eingerichtet.</p>
        <p>
          <a href="/communitas-mitglied/zelle/">Zur Zelle</a>
        </p>
      </article>
    );
  }

  return (
    <article style={styles.wrap}>
      <h2 style={styles.h2}>Zell-Passphrase einrichten</h2>
      <p>
        Die Zelle ist ein privater Raum. Niemand außer dir liest, was du hier
        schreibst — auch wir nicht. Damit das technisch garantiert ist,
        brauchst du eine Zell-Passphrase, die nur in deinem Browser bleibt.
      </p>
      <p style={styles.warn}>
        Wir können dir diese Passphrase nicht zurücksetzen. Wenn du sie
        verlierst, sind deine Einträge verloren. Notiere sie woanders, falls
        du sie für später brauchst.
      </p>
      <label style={styles.label}>
        <span>Passphrase</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          disabled={busy}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        <span>Passphrase wiederholen</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passphrase2}
          onChange={(e) => setPassphrase2(e.target.value)}
          disabled={busy}
          style={styles.input}
        />
      </label>
      <p style={styles.muted}>Mindestens 16 Zeichen, idealerweise ein Satz.</p>
      <div style={styles.actions}>
        <button
          type="button"
          style={styles.btn}
          onClick={performSetup}
          disabled={busy}
        >
          {busy ? 'Schlüssel wird erstellt …' : 'Passphrase einrichten'}
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: '38rem',
    margin: '2rem auto',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    color: '#1c1917',
    lineHeight: 1.6,
  },
  h2: { fontSize: '1.3rem', fontWeight: 400, fontStyle: 'italic' },
  warn: { color: '#1c1917', fontStyle: 'italic' },
  muted: { color: '#78716c', fontSize: '0.92rem' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    margin: '1rem 0',
  },
  input: {
    font: 'inherit',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d6d3d1',
    background: '#fefefe',
    color: '#1c1917',
    borderRadius: 2,
  },
  checkbox: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    margin: '1rem 0',
  },
  actions: { marginTop: '1.5rem' },
  btn: {
    padding: '0.55rem 1.2rem',
    background: '#1c1917',
    color: '#fefefe',
    border: 0,
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
  },
  error: { color: '#a00', marginTop: '1rem' },
};
