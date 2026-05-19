import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    Video: {
      render: component('./src/components/markdoc/Video.astro'),
      attributes: {
        src: { type: String, required: true },
        title: { type: String },
      },
    },
    Infographic: {
      render: component('./src/components/markdoc/Infographic.astro'),
      attributes: {
        src: { type: String, required: true },
        alt: { type: String },
        caption: { type: String },
      },
    },
    Callout: {
      render: component('./src/components/markdoc/Callout.astro'),
      attributes: {
        type: { type: String, default: 'info' },
        content: { type: String, required: true },
      },
    },
  },
});
