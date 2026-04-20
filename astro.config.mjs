// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://tobiasoberrauch.de',
  integrations: [mdx(), react(), sitemap({
    i18n: {
      defaultLocale: 'de',
      locales: { de: 'de-DE' },
    },
  })],
  adapter: vercel()
});
