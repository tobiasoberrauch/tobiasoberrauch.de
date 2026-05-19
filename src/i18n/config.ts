export const locales = ['de', 'en', 'la', 'grc'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'la';

export const localeLabels: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  la: 'Latina',
  grc: 'Ἑλληνική',
};

export const localeShortLabels: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  la: 'LA',
  grc: 'GR',
};

export const htmlLang: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-US',
  la: 'la',
  grc: 'grc',
};

export const ogLocale: Record<Locale, string> = {
  de: 'de_DE',
  en: 'en_US',
  la: 'la',
  grc: 'grc',
};

// Three pillars
export type PillarKey = 'writing' | 'speaking' | 'working';

export const pillarSlugs: Record<Locale, Record<PillarKey, string>> = {
  de: { writing: 'schreiben', speaking: 'sprechen', working: 'arbeiten' },
  en: { writing: 'writing', speaking: 'speaking', working: 'working' },
  la: { writing: 'scriptura', speaking: 'oratio', working: 'opera' },
  grc: { writing: 'graphe', speaking: 'logos', working: 'ergon' },
};

// Legacy / additional sections (humanistic depth, lab, about)
export type ExtraKey = 'giftedness' | 'lab' | 'about';

export const extraSlugs: Record<Locale, Record<ExtraKey, string>> = {
  de: { giftedness: 'hochbegabung', lab: 'lab', about: 'ueber-mich' },
  en: { giftedness: 'giftedness', lab: 'lab', about: 'about' },
  la: { giftedness: 'ingenium', lab: 'officina', about: 'de-me' },
  grc: { giftedness: 'euphyia', lab: 'ergasterion', about: 'peri-emou' },
};

// Reverse lookup: any known slug → canonical key
export const slugToPillar: Record<string, PillarKey> = {
  schreiben: 'writing',
  writing: 'writing',
  scriptura: 'writing',
  graphe: 'writing',
  sprechen: 'speaking',
  speaking: 'speaking',
  oratio: 'speaking',
  logos: 'speaking',
  arbeiten: 'working',
  working: 'working',
  opera: 'working',
  ergon: 'working',
};

export const slugToExtra: Record<string, ExtraKey> = {
  hochbegabung: 'giftedness',
  giftedness: 'giftedness',
  ingenium: 'giftedness',
  euphyia: 'giftedness',
  lab: 'lab',
  officina: 'lab',
  ergasterion: 'lab',
  'ueber-mich': 'about',
  about: 'about',
  'de-me': 'about',
  'peri-emou': 'about',
};

export function getLocalePath(locale: Locale, path: string = ''): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (locale === defaultLocale) {
    return clean ? `/${clean}/` : '/';
  }
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}

export function getPillarPath(locale: Locale, pillar: PillarKey): string {
  return getLocalePath(locale, pillarSlugs[locale][pillar]);
}

export function getExtraPath(locale: Locale, key: ExtraKey): string {
  return getLocalePath(locale, extraSlugs[locale][key]);
}

export function detectLocaleFromPath(pathname: string): Locale {
  const match = pathname.match(/^\/(de|en|grc)(\/|$)/);
  return (match?.[1] as Locale) ?? 'la';
}
