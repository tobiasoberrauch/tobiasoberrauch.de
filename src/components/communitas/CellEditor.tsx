/**
 * CellEditor — the actual writing surface.
 *
 * Phase 6 / US4 / T084.
 *
 * Loads the key from IndexedDB. If absent OR if the server has a salt and
 * the local IndexedDB does not, the editor renders <PassphraseSetup /> so
 * the user can re-derive the key on this device.
 *
 * No likes. No share buttons. No character count. No streak. No autosave.
 * Manual save only — schweigen ist auch erlaubt.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  decryptText,
  encryptText,
  loadKeyFromIndexedDB,
  storeKeyInIndexedDB,
  deriveKey,
} from '../../lib/communitas/client-crypto';
import PassphraseSetup from './PassphraseSetup';

interface EntryMeta {
  id: number;
  written_on: string;
  byte_length: number;
  updated_at: string;
}

interface Props {
  memberId: number;
  displayName: string;
}

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

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

type KeyState =
  | { phase: 'loading' }
  | { phase: 'needs-setup' }
  | { phase: 'needs-passphrase'; saltB64: string }
  | { phase: 'ready'; key: CryptoKey }
  | { phase: 'error'; message: string };

export default function CellEditor({ memberId, displayName }: Props) {
  void memberId;
  const [keyState, setKeyState] = useState<KeyState>({ phase: 'loading' });
  const [entries, setEntries] = useState<EntryMeta[] | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [currentWrittenOn, setCurrentWrittenOn] = useState<string>(
    todayIsoLocal(),
  );
  const [editorText, setEditorText] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reEnterPass, setReEnterPass] = useState('');

  // --- key bootstrap -------------------------------------------------------

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const localKey = await loadKeyFromIndexedDB('cell');
      if (localKey) {
        setKeyState({ phase: 'ready', key: localKey });
        return;
      }
      // No local key — ask server whether a salt exists.
      const res = await fetch('/api/communitas/cell/salt');
      if (!res.ok) {
        setKeyState({
          phase: 'error',
          message: 'Kann Schlüsselstatus nicht laden.',
        });
        return;
      }
      const body = (await res.json()) as { salt_b64: string | null };
      if (!body.salt_b64) {
        setKeyState({ phase: 'needs-setup' });
      } else {
        setKeyState({ phase: 'needs-passphrase', saltB64: body.salt_b64 });
      }
    } catch (err) {
      setKeyState({
        phase: 'error',
        message: (err as Error).message || 'Schlüsselstatus unklar.',
      });
    }
  }

  // --- list ----------------------------------------------------------------

  useEffect(() => {
    if (keyState.phase === 'ready' && entries === null) {
      void loadEntries();
    }
  }, [keyState.phase]);

  async function loadEntries() {
    try {
      const res = await fetch('/api/communitas/cell/list');
      if (!res.ok) {
        setError('Die Liste der Einträge konnte nicht geladen werden.');
        return;
      }
      const body = (await res.json()) as { entries: EntryMeta[] };
      setEntries(body.entries);
    } catch {
      setError('Verbindung verloren.');
    }
  }

  async function openEntry(id: number) {
    if (keyState.phase !== 'ready') return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/communitas/cell/${id}`);
      if (!res.ok) {
        setError('Eintrag konnte nicht geladen werden.');
        return;
      }
      const body = (await res.json()) as {
        id: number;
        ciphertext_b64: string;
        iv_b64: string;
        written_on: string;
      };
      try {
        const plain = await decryptText(
          b64ToBytes(body.ciphertext_b64),
          b64ToBytes(body.iv_b64),
          keyState.key,
        );
        setCurrentId(body.id);
        setCurrentWrittenOn(body.written_on);
        setEditorText(plain);
        setSavedAt(null);
      } catch {
        setError(
          'Eintrag konnte nicht entschlüsselt werden. Möglicherweise wurde er auf einem anderen Gerät mit einer anderen Passphrase erstellt.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEntry() {
    if (keyState.phase !== 'ready') return;
    setError('');
    if (editorText.length === 0) {
      setError('Leerer Eintrag wird nicht gespeichert.');
      return;
    }
    setBusy(true);
    try {
      const { ciphertext, iv } = await encryptText(editorText, keyState.key);
      const res = await fetch('/api/communitas/cell/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: currentId ?? undefined,
          written_on: currentWrittenOn,
          ciphertext_b64: bytesToB64(ciphertext),
          iv_b64: bytesToB64(iv),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Speichern fehlgeschlagen: ${(body as { code?: string }).code ?? res.status}`);
        return;
      }
      const body = (await res.json()) as { id: number; updated_at: string };
      setCurrentId(body.id);
      setSavedAt(new Date(body.updated_at).toLocaleString('de-DE'));
      // Refresh list
      await loadEntries();
    } catch (err) {
      setError((err as Error).message || 'Verbindung verloren.');
    } finally {
      setBusy(false);
    }
  }

  function newEntry() {
    setCurrentId(null);
    setCurrentWrittenOn(todayIsoLocal());
    setEditorText('');
    setSavedAt(null);
    setError('');
  }

  async function deleteEntry() {
    if (currentId == null) return;
    if (
      !window.confirm('Diesen Eintrag löschen? Es gibt kein Zurück.')
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/communitas/cell/${currentId}/delete`, {
        method: 'DELETE',
      });
      if (res.status !== 204) {
        setError('Löschen fehlgeschlagen.');
        return;
      }
      newEntry();
      await loadEntries();
    } finally {
      setBusy(false);
    }
  }

  async function rederiveOnThisDevice() {
    if (keyState.phase !== 'needs-passphrase') return;
    setError('');
    if (reEnterPass.length < 16) {
      setError('Mindestens 16 Zeichen.');
      return;
    }
    setBusy(true);
    try {
      const salt = b64ToBytes(keyState.saltB64);
      const key = await deriveKey(reEnterPass, 'cell', salt);
      await storeKeyInIndexedDB(key, 'cell');
      await storeKeyInIndexedDB(salt as unknown as CryptoKey, 'cell-salt');
      setKeyState({ phase: 'ready', key });
      setReEnterPass('');
    } catch (err) {
      setError((err as Error).message || 'Schlüssel konnte nicht hergeleitet werden.');
    } finally {
      setBusy(false);
    }
  }

  // --- render --------------------------------------------------------------

  const firstName = useMemo(() => displayName.split(' ')[0], [displayName]);

  if (keyState.phase === 'loading') {
    return <p style={styles.muted}>Lade …</p>;
  }
  if (keyState.phase === 'error') {
    return <p style={styles.error}>{keyState.message}</p>;
  }
  if (keyState.phase === 'needs-setup') {
    return <PassphraseSetup mode="first-time" onComplete={() => bootstrap()} />;
  }
  if (keyState.phase === 'needs-passphrase') {
    return (
      <article style={styles.setup}>
        <h2 style={styles.h2}>Passphrase eingeben</h2>
        <p>
          {firstName}, deine Zelle ist auf einem anderen Gerät eingerichtet.
          Gib hier dieselbe Passphrase ein, um die Einträge zu öffnen. Sie
          verlässt diesen Browser nicht.
        </p>
        <label style={styles.label}>
          <span>Passphrase</span>
          <input
            type="password"
            autoComplete="current-password"
            value={reEnterPass}
            onChange={(e) => setReEnterPass(e.target.value)}
            disabled={busy}
            style={styles.input}
          />
        </label>
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.btn}
            onClick={rederiveOnThisDevice}
            disabled={busy}
          >
            {busy ? 'Schlüssel wird hergeleitet …' : 'Öffnen'}
          </button>
        </div>
        <p style={styles.muted}>
          Verloren? Eine Passphrase-Wiederherstellung gibt es nicht — du kannst
          nur die Zelle zurücksetzen, was alle Einträge löscht.
        </p>
        {error && <p style={styles.error}>{error}</p>}
      </article>
    );
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.h2}>Einträge</h2>
          <button
            type="button"
            style={styles.btnGhost}
            onClick={newEntry}
            disabled={busy}
          >
            Heute schreiben
          </button>
        </div>
        <ul style={styles.list}>
          {(entries ?? []).map((e) => {
            const sel = currentId === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => openEntry(e.id)}
                  disabled={busy}
                  style={{
                    ...styles.listItem,
                    ...(sel ? styles.listItemSelected : {}),
                  }}
                >
                  <span style={styles.listDate}>{e.written_on}</span>
                  <span style={styles.listSize}>{formatBytes(e.byte_length)}</span>
                </button>
              </li>
            );
          })}
          {entries !== null && entries.length === 0 && (
            <li style={styles.muted}>(noch nichts geschrieben)</li>
          )}
        </ul>
      </aside>
      <main style={styles.editorPane}>
        <div style={styles.editorMeta}>
          <label style={styles.metaLabel}>
            <span>Datum</span>
            <input
              type="date"
              value={currentWrittenOn}
              onChange={(e) => setCurrentWrittenOn(e.target.value)}
              style={styles.metaInput}
              disabled={busy}
            />
          </label>
          {savedAt && (
            <span style={styles.muted}>gespeichert {savedAt}</span>
          )}
        </div>
        <textarea
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          placeholder="Schreib, was steht."
          style={styles.textarea}
          disabled={busy}
        />
        <div style={styles.editorActions}>
          <button
            type="button"
            style={styles.btn}
            onClick={saveEntry}
            disabled={busy}
          >
            Speichern
          </button>
          {currentId != null && (
            <button
              type="button"
              style={styles.btnDanger}
              onClick={deleteEntry}
              disabled={busy}
            >
              Eintrag löschen
            </button>
          )}
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  setup: {
    maxWidth: '38rem',
    margin: '2rem auto',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    color: '#1c1917',
    lineHeight: 1.6,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(14rem, 18rem) 1fr',
    gap: '2rem',
    maxWidth: '64rem',
    margin: '2rem auto',
    padding: '0 1.25rem',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    color: '#1c1917',
  },
  sidebar: {
    borderRight: '1px solid #e7e5e4',
    paddingRight: '1.5rem',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    textAlign: 'left',
    padding: '0.4rem 0.5rem',
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    font: 'inherit',
    color: '#1c1917',
    borderRadius: 2,
  },
  listItemSelected: { background: '#f5f5f4' },
  listDate: { fontVariantNumeric: 'tabular-nums' },
  listSize: { color: '#78716c', fontSize: '0.85rem' },
  editorPane: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  editorMeta: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaLabel: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  metaInput: {
    font: 'inherit',
    padding: '0.4rem 0.5rem',
    border: '1px solid #d6d3d1',
    background: '#fefefe',
    color: '#1c1917',
    borderRadius: 2,
  },
  textarea: {
    minHeight: '24rem',
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
  editorActions: { display: 'flex', gap: '0.75rem' },
  btn: {
    padding: '0.55rem 1.2rem',
    background: '#1c1917',
    color: '#fefefe',
    border: 0,
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
  },
  btnGhost: {
    padding: '0.4rem 0.8rem',
    background: 'transparent',
    color: '#1c1917',
    border: '1px solid #1c1917',
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnDanger: {
    padding: '0.55rem 1.2rem',
    background: '#fefefe',
    color: '#1c1917',
    border: '1px solid #1c1917',
    borderRadius: 2,
    font: 'inherit',
    cursor: 'pointer',
  },
  h2: {
    fontSize: '1.1rem',
    fontWeight: 400,
    fontStyle: 'italic',
    color: '#78716c',
    margin: 0,
  },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  input: {
    font: 'inherit',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d6d3d1',
    background: '#fefefe',
    color: '#1c1917',
    borderRadius: 2,
  },
  actions: { marginTop: '1rem' },
  muted: { color: '#78716c', fontSize: '0.92rem' },
  error: { color: '#a00', marginTop: '0.5rem' },
};
