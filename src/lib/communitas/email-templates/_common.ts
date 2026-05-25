/**
 * Shared building blocks for Communitas email templates.
 *
 * All mails are inline-CSS HTML, Georgia serif, black-on-white, no images,
 * no tracking pixels. The footer is the only persistent branding surface
 * and ends with an unsubscribe link per RFC 8058.
 */

const FONT_STACK = 'Georgia, "Times New Roman", Times, serif';

export function commonFooter(unsubToken?: string): string {
  const unsubUrl = unsubToken
    ? `https://tobiasoberrauch.de/communitas-mitglied/abmelden?t=${encodeURIComponent(
        unsubToken,
      )}`
    : `https://tobiasoberrauch.de/communitas-mitglied/abmelden`;
  return `
    <hr style="border: 0; border-top: 1px solid #d6d3d1; margin: 2rem 0 1rem;" />
    <p style="color: #78716c; font-size: 0.78rem; line-height: 1.5; font-family: ${FONT_STACK};">
      Communitas Cotidiana ·
      <a href="https://tobiasoberrauch.de/communitas/" style="color: #78716c;">tobiasoberrauch.de/communitas</a>
    </p>
    <p style="color: #78716c; font-size: 0.72rem; font-family: ${FONT_STACK};">
      <a href="${unsubUrl}" style="color: #78716c;">Abmelden</a>
    </p>
  `;
}

/**
 * Wrap a body's inner HTML in a Communitas-styled container. The container
 * sets the serif font, max-width 580px, and black-on-white palette. It does
 * NOT inject a header — we deliberately have no logo or banner image.
 */
export function communitasShell(innerHtml: string, unsubToken?: string): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Communitas Cotidiana</title>
</head>
<body style="margin: 0; padding: 2rem 1rem; background: #fefefe; color: #1c1917; font-family: ${FONT_STACK}; font-size: 16px; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto;">
    ${innerHtml}
    ${commonFooter(unsubToken)}
  </div>
</body>
</html>`;
}

/**
 * Render a plain-text paragraph block to HTML — preserves blank-line
 * separation as `<p>` elements. Used by the body of each template.
 */
export function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 1em;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
