/**
 * Phase 6 / US4 / T094 — End-to-end Zelle round-trip (skipped).
 *
 * This test requires:
 *   - a running Astro dev server,
 *   - a Neon (or local) Postgres reachable via COMMUNITAS_DATABASE_URL,
 *   - a test member with magic-link auth bypassed (or a session helper).
 *
 * It is marked .skip until the e2e harness is wired up in CI.
 */
import { test } from '@playwright/test';

test.skip('cell roundtrip — server never sees plaintext', async () => {
  // Intended steps:
  //
  // 1. Log in as a test member (magic-link helper bypasses email).
  // 2. page.goto('/communitas-mitglied/zelle/')
  // 3. Set passphrase „Heute schwer aber nötig" via PassphraseSetup.
  // 4. Click „Heute schreiben", fill textarea with the marker string
  //    „Mein geheimer Satz xyz_unique_123" and save.
  // 5. Reload the page, click the entry in the sidebar, assert the
  //    plaintext is back in the textarea after client-side decrypt.
  // 6. Open a direct DB connection (postgres.js) using the test DSN
  //    and SELECT ciphertext FROM cell_entries WHERE member_id = $1.
  // 7. Assert that the ciphertext bytes do NOT contain the substring
  //    "xyz_unique_123" — proving the server never persisted the
  //    plaintext.
  //
  // This is the strongest possible assertion of the server-blind
  // architecture, complementary to the static-analysis guard in
  // tests/communitas/unit/server-blindness.test.ts.
});
