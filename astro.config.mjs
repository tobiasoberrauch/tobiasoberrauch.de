// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://tobiasoberrauch.de',
  output: 'static',
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en', 'la', 'grc'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    mdx(),
    markdoc(),
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'de',
        locales: {
          de: 'de-DE',
          en: 'en-US',
          la: 'la',
          grc: 'grc',
        },
      },
    }),
    keystatic(),
  ],
  adapter: vercel(),
});
