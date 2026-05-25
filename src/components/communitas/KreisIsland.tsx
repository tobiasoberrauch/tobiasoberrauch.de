/**
 * KreisIsland — Phase 7 / US5.
 *
 * Client-side router between KreisCodeInput (no symkey present) and
 * KreisLetter (symkey loaded from IndexedDB). The Astro page mounts
 * this single component with `client:load`; it decides which surface
 * to render based on the presence of the IndexedDB key.
 */
import { useEffect, useState } from 'react';
import KreisCodeInput from './KreisCodeInput';
import KreisLetter from './KreisLetter';
import { loadKeyFromIndexedDB } from '../../lib/communitas/client-crypto';

interface Props {
  kreisId: number;
  currentMemberId: number;
  displayName: string;
}

export default function KreisIsland({
  kreisId,
  currentMemberId,
  displayName,
}: Props) {
  const [phase, setPhase] = useState<'loading' | 'needs-code' | 'ready'>(
    'loading',
  );

  useEffect(() => {
    void (async () => {
      try {
        const k = await loadKeyFromIndexedDB(`kreis-${kreisId}`);
        setPhase(k ? 'ready' : 'needs-code');
      } catch {
        setPhase('needs-code');
      }
    })();
  }, [kreisId]);

  if (phase === 'loading') {
    return (
      <p
        style={{
          color: '#78716c',
          fontFamily: 'Georgia, serif',
          margin: '2rem auto',
          textAlign: 'center',
        }}
      >
        Lade …
      </p>
    );
  }
  if (phase === 'needs-code') {
    return (
      <KreisCodeInput
        kreisId={kreisId}
        onKeyReady={() => setPhase('ready')}
      />
    );
  }
  return (
    <KreisLetter
      kreisId={kreisId}
      currentMemberId={currentMemberId}
      displayName={displayName}
      onNeedsCode={() => setPhase('needs-code')}
    />
  );
}
