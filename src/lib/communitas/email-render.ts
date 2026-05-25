/**
 * Email rendering for Communitas.
 *
 * Phase 2 note: the Astro Container API
 * (`experimental_AstroContainer.create()`) exists in Astro 4.9+, but its
 * stability in our Astro 6 + Vercel adapter setup is not yet verified at the
 * time of writing. Rather than couple Phase 2 to that path, we expose a
 * minimal string-template renderer here and document the upgrade route.
 *
 * When email templates are added under
 * `src/lib/communitas/email-templates/*.astro` (Phase 3), they can:
 *   (a) export a default function `(props) => string` that returns HTML, OR
 *   (b) export a default Astro component, in which case we will switch this
 *       module to use `experimental_AstroContainer` (a one-line swap).
 *
 * The anti-tracking-pixel check is applied to ALL rendered HTML regardless
 * of which path is taken.
 */

/**
 * Render an email template module to an HTML string.
 *
 * `componentPath` must be importable via `import()` from inside this file's
 * directory. We try the dynamic import; if the module exports a default
 * function it is called with `props`; otherwise we currently throw and log
 * a clear message about needing the Container API upgrade.
 */
export async function renderEmail(
  componentPath: string,
  props: Record<string, unknown>
): Promise<string> {
  let mod: unknown;
  try {
    mod = await import(/* @vite-ignore */ componentPath);
  } catch (err) {
    throw new Error(
      `renderEmail: could not import template ${componentPath}: ${(err as Error).message}`
    );
  }

  const defaultExport = (mod as { default?: unknown }).default;
  let html: string;

  if (typeof defaultExport === 'function') {
    // Path (a): templates exported as `(props) => string`. This is the
    // simplest and most testable form; we use it for Phase 3.
    const result = await Promise.resolve(
      (defaultExport as (p: Record<string, unknown>) => string | Promise<string>)(
        props
      )
    );
    html = String(result);
  } else {
    throw new Error(
      `renderEmail: template ${componentPath} does not export a default function. ` +
        'Astro Container API integration is deferred to Phase 3; templates should ' +
        'export `(props) => string` for now.'
    );
  }

  assertNoTrackingPixels(html);
  return html;
}

const TRACKING_PIXEL_RE = /<img\s+[^>]*src\s*=\s*"[^"]*trk/i;

/**
 * Reject any rendered HTML containing a likely tracking-pixel pattern.
 * Specifically: `<img ... src="...trk...">`. Tobias' rule is "no opens, no
 * clicks, no remote pixels" (Spec FR-008).
 */
export function assertNoTrackingPixels(html: string): void {
  if (TRACKING_PIXEL_RE.test(html)) {
    throw new Error(
      'Refusing to render email: contains a likely tracking-pixel <img src="…trk…">.'
    );
  }
}
