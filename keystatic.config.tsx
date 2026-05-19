import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: { name: 'tobiasoberrauch.de' },
  },
  collections: {
    hochbegabung: collection({
      label: 'Hochbegabung Artikel',
      slugField: 'title',
      path: 'src/content/hochbegabung/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: 'Titel' },
        }),
        date: fields.date({
          label: 'Datum',
          validation: { isRequired: true },
        }),
        description: fields.text({
          label: 'Beschreibung',
          multiline: true,
          validation: { isRequired: true },
        }),
        order: fields.integer({
          label: 'Reihenfolge',
          defaultValue: 10,
        }),
        heroImage: fields.image({
          label: 'Titelbild',
          directory: 'public/images/articles',
          publicPath: '/images/articles/',
        }),
        content: fields.markdoc({
          label: 'Inhalt',
          options: {
            image: {
              directory: 'public/images/articles',
              publicPath: '/images/articles/',
            },
          },
          components: {
            Video: {
              label: 'Video',
              schema: {
                src: fields.text({ label: 'Video-Pfad oder URL' }),
                title: fields.text({ label: 'Titel' }),
              },
              preview: (props) => (
                <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                  🎬 Video: {props.fields.title.value || props.fields.src.value || '(kein Titel)'}
                </div>
              ),
            },
            Infographic: {
              label: 'Infografik',
              schema: {
                src: fields.image({
                  label: 'Bild',
                  directory: 'public/images/articles',
                  publicPath: '/images/articles/',
                }),
                alt: fields.text({ label: 'Alternativtext' }),
                caption: fields.text({ label: 'Bildunterschrift' }),
              },
              preview: (props) => (
                <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                  🖼️ Infografik: {props.fields.caption.value || props.fields.alt.value || '(kein Titel)'}
                </div>
              ),
            },
            Callout: {
              label: 'Hinweis-Box',
              schema: {
                type: fields.select({
                  label: 'Typ',
                  options: [
                    { label: 'Info', value: 'info' },
                    { label: 'Tipp', value: 'tip' },
                    { label: 'Wichtig', value: 'warning' },
                    { label: 'Quelle', value: 'source' },
                  ],
                  defaultValue: 'info',
                }),
                content: fields.text({ label: 'Text', multiline: true }),
              },
              preview: (props) => (
                <div style={{
                  padding: '1rem',
                  background: props.fields.type.value === 'warning' ? '#FEF3C7' : '#F0F9FF',
                  borderRadius: '8px',
                  borderLeft: '3px solid #B45309',
                }}>
                  {props.fields.content.value || '(leer)'}
                </div>
              ),
            },
          },
        }),
      },
    }),
  },
});
