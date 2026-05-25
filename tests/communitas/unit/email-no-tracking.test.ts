import { describe, it, expect } from 'vitest';
import morning from '../../../src/lib/communitas/email-templates/morning';
import noon from '../../../src/lib/communitas/email-templates/noon';
import evening from '../../../src/lib/communitas/email-templates/evening';
import magicLink from '../../../src/lib/communitas/email-templates/magic-link';
import quietCheck from '../../../src/lib/communitas/email-templates/quiet-check';
import { assertNoTrackingPixels } from '../../../src/lib/communitas/email-render';

/**
 * Anti-tracking regression guard. Every Phase 4 email template must render
 * with no images, no UTM, no Google/Meta/Facebook telemetry hooks.
 *
 * The check is per-template (so a regression in one body doesn't leak into
 * the others) and asserts both the static `<img` ban and the analytics
 * ban. The output is also handed to `assertNoTrackingPixels` to share the
 * same rule the email-render layer applies in production.
 */
const templates: Array<{ name: string; html: () => string }> = [
  {
    name: 'morning',
    html: () =>
      morning({
        name: 'Erika',
        verse: '"Du musst dein Leben ändern."\n— Rilke',
        question: 'Wo bist du heute nicht du selbst gewesen?',
        weekday_label: 'Spiegel',
        date_label: 'Montag, 25. Mai',
      }),
  },
  {
    name: 'noon',
    html: () =>
      noon({ audio_url: 'https://tobiasoberrauch.de/media/cotidianum/speculum/spiegel.mp3' }),
  },
  {
    name: 'evening (basis)',
    html: () => evening({}),
  },
  {
    name: 'evening (voll)',
    html: () => evening({ cell_url: 'https://tobiasoberrauch.de/communitas-mitglied/zelle' }),
  },
  {
    name: 'magic-link',
    html: () =>
      magicLink({
        name: 'Erika',
        magic_link_url: 'https://tobiasoberrauch.de/communitas-mitglied/login?t=xxx',
      }),
  },
  {
    name: 'quiet-check',
    html: () => quietCheck({ name: 'Erika' }),
  },
];

for (const t of templates) {
  describe(`email template: ${t.name}`, () => {
    it('contains no <img> tags at all', () => {
      const html = t.html();
      expect(html).not.toMatch(/<img\b/i);
    });

    it('contains no utm_ parameters in hrefs', () => {
      const html = t.html();
      expect(html).not.toMatch(/utm_/i);
    });

    it('contains no analytics hooks (gtag, googletagmanager, meta-pixel, fbq)', () => {
      const html = t.html();
      expect(html).not.toMatch(/gtag\s*\(/i);
      expect(html).not.toMatch(/googletagmanager/i);
      expect(html).not.toMatch(/meta-pixel/i);
      expect(html).not.toMatch(/\bfbq\s*\(/i);
    });

    it('passes assertNoTrackingPixels (no tracking-pixel <img src="...trk...">)', () => {
      expect(() => assertNoTrackingPixels(t.html())).not.toThrow();
    });

    it('is non-empty and valid-looking HTML', () => {
      const html = t.html();
      expect(html.length).toBeGreaterThan(50);
      expect(html.toLowerCase()).toContain('<!doctype html>');
    });
  });
}
