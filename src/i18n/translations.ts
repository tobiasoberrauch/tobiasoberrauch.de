import type { Locale } from './config';

export interface Translation {
  meta: {
    siteTitle: string;
    siteDescription: string;
    homeTitle: string;
  };
  hero: {
    badge: string;
    thesis: string;
    thesisName: string;
    subline: string;
    primaryCta: string;
    secondaryCta: string;
    scrollHint: string;
  };
  thesis: {
    title: string;
    body: string;
  };
  pillars: {
    sectionLabel: string;
    sectionIntro: string;
    writing: { name: string; subtitle: string; teaser: string; cta: string };
    speaking: { name: string; subtitle: string; teaser: string; cta: string };
    working: { name: string; subtitle: string; teaser: string; cta: string };
  };
  newsletter: {
    eyebrow: string;
    title: string;
    body: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    consent: string;
    frequency: string;
  };
  nav: {
    home: string;
    writing: string;
    speaking: string;
    working: string;
    pioneers: string;
    about: string;
    languageLabel: string;
  };
  footer: {
    tagline: string;
    imprint: string;
    privacy: string;
  };
  pages: {
    writing: PillarPage;
    speaking: PillarPage;
    working: PillarPage;
    giftedness: GiftednessPage;
    lab: LabPage;
    about: AboutPage;
  };
}

interface PillarPage {
  title: string;
  lead: string;
  sections: { heading: string; body: string }[];
}

interface GiftednessPage {
  title: string;
  badge: string;
  lead: string;
  statsTitle: string;
  stats: { label: string; value: string }[];
  topicsHeading: string;
  topics: { title: string; body: string }[];
  articlesHeading: string;
  articlesGermanOnly: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
  ctaEmail: string;
}

interface LabPage {
  title: string;
  badge: string;
  lead: string;
  demoBadge: string;
  demoTitle: string;
  demoBody: string;
  experimentsHeading: string;
  experiments: { title: string; body: string; tech: string[] }[];
  comingSoon: string;
  ctaText: string;
  ctaLink: string;
}

interface AboutPage {
  title: string;
  badge: string;
  name: string;
  role: string;
  location: string;
  sections: { heading: string; body: string[] }[];
  whatHeading: string;
  whatItems: string[];
  steckbriefHeading: string;
  steckbrief: { label: string; value: string }[];
  techHeading: string;
  projectsHeading: string;
  contactHeading: string;
  contactLabels: { email: string; github: string; linkedin: string };
}

export const t: Record<Locale, Translation> = {
  // ────────────────────────────────────────────────────────────────────────
  // DEUTSCH
  // ────────────────────────────────────────────────────────────────────────
  de: {
    meta: {
      siteTitle: 'Tobias Oberrauch — Architekt des Verstehens',
      siteDescription:
        'Tobias Oberrauch — KI, Geopolitik, Interkultur. Architekt des Verstehens an der Schwelle zwischen Maschinenkognition und zivilisatorischer Verständigung.',
      homeTitle: 'Tobias Oberrauch — Architekt des Verstehens',
    },
    hero: {
      badge: 'KI · Geopolitik · Interkultur',
      thesis: 'Architekt des',
      thesisName: 'Verstehens',
      subline:
        'KI als Schwelle zur zivilisatorischen Verständigung. Schriftliche, gesprochene und beratende Arbeit an der Schnittstelle von Maschinenkognition, Souveränität und kulturellem Urteil.',
      primaryCta: 'Newsletter abonnieren',
      secondaryCta: 'Drei Säulen ansehen',
      scrollHint: 'Mehr entdecken',
    },
    thesis: {
      title: 'Die These',
      body: 'In einer Welt, in der generative Modelle Information beliebig replizieren, wird Urteilskraft zur einzigen verbleibenden Knappheit. Architekt des Verstehens heißt: eine begründete Position zu KI, Souveränität und kultureller Verständigung öffentlich tragen — und in kuratierter Form privat liefern.',
    },
    pillars: {
      sectionLabel: 'Drei Säulen',
      sectionIntro:
        'Dieselbe These eskaliert in Tiefe und Nähe: vom frei zugänglichen Essay über die kuratierte Bühne bis zum vertraulichen Mandat.',
      writing: {
        name: 'Schreiben',
        subtitle: 'Newsletter · Essays · Buch',
        teaser:
          'Wöchentliche Lagebewertungen und längere Essays an der Schnittstelle von KI, Geopolitik und Mittelstand. Zweisprachig DE/EN.',
        cta: 'Zum Newsletter',
      },
      speaking: {
        name: 'Sprechen',
        subtitle: 'Vorträge · Podcasts · Salon',
        teaser:
          'Keynotes, Aufsichts- und Vorstandsformate, kuratierter Jahressalon zu KI-Souveränität und europäischem Verstehen.',
        cta: 'Auftritte ansehen',
      },
      working: {
        name: 'Arbeiten',
        subtitle: 'Beratung · Mandate · Beirat',
        teaser:
          'AII-Mandate für CEO-Diagnostik, vertrauliche Beratung auf Vorstandsebene, Aufsichts- und Beiratsmandate.',
        cta: 'Arbeit kennenlernen',
      },
    },
    newsletter: {
      eyebrow: 'Architektur des Verstehens',
      title: 'Wöchentliche Lagebewertung',
      body: 'Eine begründete Stimme zu KI, europäischer Souveränität und kulturellem Urteil — wöchentlich, zweisprachig, ohne Lärm.',
      emailLabel: 'E-Mail-Adresse',
      emailPlaceholder: 'name@beispiel.de',
      submit: 'Abonnieren',
      consent: 'Mit dem Absenden stimmst du der Verarbeitung gemäß Datenschutzerklärung zu.',
      frequency: 'Wöchentlich · Jederzeit abbestellbar',
    },
    nav: {
      home: 'Start',
      writing: 'Schreiben',
      speaking: 'Sprechen',
      working: 'Arbeiten',
      pioneers: 'Prinzipien',
      about: 'Über mich',
      languageLabel: 'Sprache',
    },
    footer: {
      tagline: 'Tobias Oberrauch · Holzmaden · Architekt des Verstehens',
      imprint: 'Impressum',
      privacy: 'Datenschutz',
    },
    pages: {
      writing: {
        title: 'Schreiben',
        lead: 'Schriftliche Arbeit ist die unterste, breiteste Schicht der Architektur: frei zugänglich, autoritätsbildend, an alle anderen Schichten angebunden.',
        sections: [
          {
            heading: 'Architektur des Verstehens — Newsletter',
            body: 'Wöchentliche Lagebewertung (~800 Wörter) und längerer Essay alle vier bis sechs Wochen. Register: testierend, nicht prophezeiend. Thema: KI, Souveränität, deutsch-europäisches Verstehen. Zweisprachig DE/EN.',
          },
          {
            heading: 'Jahresbericht',
            body: 'AI Sovereignty & Understanding Outlook — jährliche Bestandsaufnahme zu KI, europäischer Souveränität und geopolitischer Asymmetrie. Erscheinungstermin Januar, kostenlos, als Vertriebsanker konzipiert.',
          },
          {
            heading: 'Buch',
            body: 'In Vorbereitung: ein zweisprachiges Manuskript, das Sprache, Intelligenz, Interkulturalität und Maschinenkognition als eine konzeptuelle Synthese behandelt — keine weitere KI-Anwendungsfibel.',
          },
        ],
      },
      speaking: {
        title: 'Sprechen',
        lead: 'Mündliche Arbeit ist die kuratierte Bühne — Vortrag, Gespräch, Salon. Sie ersetzt das Massensaalformat durch testierte Urteilskraft vor qualifiziertem Publikum.',
        sections: [
          {
            heading: 'Keynotes & Vorträge',
            body: 'Halbtägige bis ganztägige Formate für Aufsichtsräte, Mittelstands-Vorstände, Familiengesellschafterkreise und Branchenforen. Themen: KI-Souveränität, transatlantische Asymmetrie, Verstehen-Defizit.',
          },
          {
            heading: 'Podcast & Gespräche',
            body: 'Lange Einzelgespräche im Conversations-with-Tyler-Register: keine Industrie-Promo, keine Listenformate, keine Bühnenökonomie. Monatlich, im Aufbau.',
          },
          {
            heading: 'Jährlicher Salon',
            body: 'Ein kuratiertes Format auf Einladung: 24–60 Teilnehmer, eineinhalbtägig, Chatham-House-Regel. KI-Souveränität, europäisches Verstehen, vertraulicher Austausch. Nicht Konferenz — Werkstattgespräch.',
          },
        ],
      },
      working: {
        title: 'Arbeiten',
        lead: 'Beratende Arbeit ist die engste und wertvollste Schicht: kapazitätsbegrenzt, mündlich, vertraulich. Hier wird Methodik geliefert, nicht Information.',
        sections: [
          {
            heading: 'Audius Intelligence Insights (AII)',
            body: 'Vier- bis achtwöchige Diagnostik-Mandate für CEO und Vorstand: KI-Souveränität, AI-Governance, China-Tech-Exposure, M&A-AI-Due-Diligence. Methodischer Rahmen: ABDJ-Discovery, BMV-8 Validierung, GO/PIVOT/PARK/STOP als Lieferform.',
          },
          {
            heading: 'Proximity-Beratung',
            body: 'Dauerhafte CEO-Beratung außerhalb der audius KI GmbH: 8–15 Mandate parallel, vertraulicher Roster, mündliche Lieferung, monatliche Schriftbriefings, in-person Termine 2–4 pro Jahr.',
          },
          {
            heading: 'Aufsichts- & Beiratsmandate',
            body: 'Bei Mittelstand und Familienunternehmen mit KI-Transformations-Bedarf. Vorausgesetzt: glaubhafte Distanz zum audius-Tagesgeschäft, publizistische Stimme, methodische Substanz.',
          },
          {
            heading: 'Hochbegabung & humanistische Tiefe',
            body: 'Ehrenamtliches Engagement als Elterngruppenleiter beim LVH Baden-Württemberg, gemeinsam mit meiner Frau Arkan. Die Auseinandersetzung mit Hochbegabung, Intelligenzforschung und Sprache ist kein Nebenschauplatz — sie ist das humanistische Fundament der Architekt-These.',
          },
        ],
      },
      giftedness: {
        title: 'Neurodivergenz',
        badge: 'Wissen & Erfahrung',
        lead: 'Informationen, Recherchen und persönliche Erfahrungen zum Thema Neurodivergenz — Hochbegabung, ADHS, Autismus und andere Formen des Andersdenkens bei Kindern und Erwachsenen. Als Elterngruppenleiter beim LVH Baden-Württemberg sammle ich hier Wissen für Familien.',
        statsTitle: 'Neurodivergenz in Zahlen',
        stats: [
          { label: 'der Bevölkerung neurodivergent', value: '15–20 %' },
          { label: 'Hochbegabung (IQ 130+)', value: '2 %' },
          { label: 'ADHS bei Kindern', value: '~5 %' },
          { label: 'Familien im LVH', value: '320' },
        ],
        topicsHeading: 'Themenbereiche',
        topics: [
          { title: 'Erkennung & Diagnostik', body: 'Wie erkennt man Hochbegabung, ADHS oder Autismus? Welche Tests und Diagnosewege gibt es? Ab welchem Alter ist eine Abklärung sinnvoll?' },
          { title: 'Schule & Förderung', body: 'Schulwahl, Nachteilsausgleich, Überspringen, Enrichment, Akzeleration — Wege für neurodivergente Kinder im Bildungssystem.' },
          { title: 'Sozial-Emotionales', body: 'Asynchrone Entwicklung, Perfektionismus, Masking, Twice-Exceptional (2e) — und der Umgang damit.' },
          { title: 'Ressourcen', body: 'Bücher, Anlaufstellen, Beratung und Netzwerke in Baden-Württemberg.' },
        ],
        articlesHeading: 'Artikel',
        articlesGermanOnly: 'Die Fachartikel werden derzeit auf Deutsch geführt.',
        ctaTitle: 'Du suchst Austausch?',
        ctaBody: 'Die Elterngruppe Nürtingen / Kirchheim-Teck trifft sich regelmäßig zum Spielen und Reden.',
        ctaButton: 'Kontakt aufnehmen →',
        ctaEmail: 'elterngruppe-nuertingen@lvh-bw.de',
      },
      lab: {
        title: 'Lab',
        badge: 'Werkstatt',
        lead: 'Prototypen, interaktive Visualisierungen und Experimente. Alles, was ich ausprobiere und zeigen möchte — auf dem Weg zur produktisierten Intelligenz.',
        demoBadge: 'Live Demo',
        demoTitle: 'Wissens-Netzwerk Hochbegabung',
        demoBody: 'Ein interaktiver Force-Graph, der die Zusammenhänge rund um Hochbegabung visualisiert. Knoten lassen sich mit der Maus ziehen.',
        experimentsHeading: 'Experimente',
        experiments: [
          { title: 'Interaktive D3.js-Charts', body: 'Animierte Datenvisualisierungen zu Hochbegabung-Statistiken in Baden-Württemberg.', tech: ['D3.js', 'React', 'SVG'] },
          { title: 'KI-Prototypen', body: 'Kleine intelligente Tools — vom Chatbot bis zum automatischen Dokumentenversteher.', tech: ['TypeScript', 'Claude API', 'Astro'] },
          { title: 'Architektur-Diagramme', body: 'Interaktive System-Visualisierungen, Flowcharts und Infografiken zu meinen Projekten.', tech: ['Mermaid', 'Canvas', 'CSS'] },
        ],
        comingSoon: 'Demnächst',
        ctaText: 'Du hast eine Idee für ein Experiment?',
        ctaLink: 'Schreib mir →',
      },
      about: {
        title: 'Über mich',
        badge: 'Persönlich',
        name: 'Tobias Oberrauch',
        role: 'Architekt des Verstehens · KI-Beauftragter bei audius',
        location: 'Holzmaden, Baden-Württemberg',
        sections: [
          {
            heading: 'Beruflich',
            body: [
              'Als KI-Beauftragter bei audius verantworte ich den verantwortungsvollen Einsatz künstlicher Intelligenz im Unternehmen. Dabei stehen ethische Aspekte, Datenschutz und Innovationskraft im Fokus.',
              'Methodisch arbeite ich mit ABDJ-Discovery und der BMV-8-Validierung — derselben Methodik, die in den AII-Mandaten der Architektur-Praxis zum Einsatz kommt.',
            ],
          },
          {
            heading: 'Hochbegabung & Engagement',
            body: [
              'Seit Januar 2026 leite ich gemeinsam mit meiner Frau Arkan die Elterngruppe Nürtingen / Kirchheim-Teck des Landesverbands Hochbegabung Baden-Württemberg.',
              'Das Thema Hochbegabung ist nicht Nebenbeschäftigung — es ist die humanistische Tiefe, aus der die Architekt-These überhaupt erst plausibel wird.',
            ],
          },
        ],
        whatHeading: 'Was ich hier mache',
        whatItems: [
          'Wöchentlich an der Architektur-des-Verstehens-These schreiben',
          'In kuratierten Räumen sprechen — vor Vorständen, Aufsichtsräten, Beiräten',
          'CEO-Diagnostik und Proximity-Beratung im Mittelstand',
          'Open-Source-Werkzeuge für lokale, souveräne KI veröffentlichen',
        ],
        steckbriefHeading: 'Steckbrief',
        steckbrief: [
          { label: 'Rolle', value: 'Architekt des Verstehens' },
          { label: 'Operative Basis', value: 'audius KI GmbH' },
          { label: 'Standort', value: 'Holzmaden' },
          { label: 'Ehrenamt', value: 'EG-Leiter LVH-BW' },
          { label: 'Auf GitHub seit', value: '2010' },
          { label: 'Repos', value: '97+' },
          { label: 'LinkedIn', value: '6.200+ Follower' },
        ],
        techHeading: 'Technologien',
        projectsHeading: 'Projekte',
        contactHeading: 'Kontakt',
        contactLabels: { email: 'E-Mail', github: 'GitHub', linkedin: 'LinkedIn' },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // ENGLISH
  // ────────────────────────────────────────────────────────────────────────
  en: {
    meta: {
      siteTitle: 'Tobias Oberrauch — Architect of Understanding',
      siteDescription:
        'Tobias Oberrauch — AI, geopolitics, intercultural judgment. Architect of understanding at the threshold of machine cognition and civilizational comprehension.',
      homeTitle: 'Tobias Oberrauch — Architect of Understanding',
    },
    hero: {
      badge: 'AI · Geopolitics · Intercultural Judgment',
      thesis: 'Architect of',
      thesisName: 'Understanding',
      subline:
        'AI as the threshold to civilizational understanding. Written, spoken and advisory work at the intersection of machine cognition, sovereignty and cultural judgment.',
      primaryCta: 'Subscribe to the newsletter',
      secondaryCta: 'See the three pillars',
      scrollHint: 'Explore further',
    },
    thesis: {
      title: 'The thesis',
      body: 'In a world where generative models replicate information at will, judgment becomes the only remaining scarcity. To be an architect of understanding is to carry a reasoned position on AI, sovereignty and cultural comprehension publicly — and to deliver it, curated, in private.',
    },
    pillars: {
      sectionLabel: 'Three pillars',
      sectionIntro:
        'The same thesis escalates in depth and proximity: from the freely accessible essay through the curated stage to the confidential mandate.',
      writing: {
        name: 'Writing',
        subtitle: 'Newsletter · Essays · Book',
        teaser:
          'Weekly assessments and longer essays at the intersection of AI, geopolitics and European Mittelstand. Bilingual EN/DE.',
        cta: 'Read the newsletter',
      },
      speaking: {
        name: 'Speaking',
        subtitle: 'Keynotes · Podcasts · Salon',
        teaser:
          'Keynotes, board-level briefings, an annual curated salon on AI sovereignty and European understanding.',
        cta: 'See engagements',
      },
      working: {
        name: 'Working',
        subtitle: 'Advisory · Mandates · Boards',
        teaser:
          'AII diagnostic mandates for CEOs, confidential advisory at board level, supervisory and advisory board mandates.',
        cta: 'See the work',
      },
    },
    newsletter: {
      eyebrow: 'Architecture of Understanding',
      title: 'Weekly assessment',
      body: 'A reasoned voice on AI, European sovereignty and cultural judgment — weekly, bilingual, without noise.',
      emailLabel: 'Email address',
      emailPlaceholder: 'name@example.com',
      submit: 'Subscribe',
      consent: 'By submitting you agree to processing under the privacy policy.',
      frequency: 'Weekly · Unsubscribe anytime',
    },
    nav: {
      home: 'Home',
      writing: 'Writing',
      speaking: 'Speaking',
      working: 'Working',
      pioneers: 'Principles',
      about: 'About',
      languageLabel: 'Language',
    },
    footer: {
      tagline: 'Tobias Oberrauch · Holzmaden · Architect of Understanding',
      imprint: 'Imprint',
      privacy: 'Privacy',
    },
    pages: {
      writing: {
        title: 'Writing',
        lead: 'Written work is the lowest, broadest layer of the architecture: openly accessible, authority-building, connected to every layer above it.',
        sections: [
          {
            heading: 'Architecture of Understanding — Newsletter',
            body: 'A weekly assessment (~800 words) and a longer essay every four to six weeks. Register: testifying, not prophetic. Subject: AI, sovereignty, the German–European deficit of mutual understanding. Bilingual EN/DE.',
          },
          {
            heading: 'Annual outlook',
            body: 'AI Sovereignty & Understanding Outlook — an annual stocktaking on AI, European sovereignty and geopolitical asymmetry. Published every January, free, designed as a distribution anchor.',
          },
          {
            heading: 'Book',
            body: 'In preparation: a bilingual manuscript treating language, intelligence, interculturality and machine cognition as a single conceptual synthesis — not another AI applications primer.',
          },
        ],
      },
      speaking: {
        title: 'Speaking',
        lead: 'Spoken work is the curated stage — talk, conversation, salon. It replaces the mass-hall format with attested judgment before a qualified audience.',
        sections: [
          {
            heading: 'Keynotes & talks',
            body: 'Half-day to full-day formats for supervisory boards, Mittelstand executives, family-shareholder circles and sector fora. Themes: AI sovereignty, transatlantic asymmetry, the comprehension deficit.',
          },
          {
            heading: 'Podcast & conversations',
            body: 'Long individual conversations in the Conversations-with-Tyler register: no industry promotion, no list formats, no stage economics. Monthly, in construction.',
          },
          {
            heading: 'Annual salon',
            body: 'A curated, invitation-only format: 24–60 participants, a day and a half, Chatham House rule. AI sovereignty, European understanding, confidential exchange. Not a conference — a workshop.',
          },
        ],
      },
      working: {
        title: 'Working',
        lead: 'Advisory work is the narrowest and most valuable layer: capacity-limited, oral, confidential. Method is delivered here, not information.',
        sections: [
          {
            heading: 'Audius Intelligence Insights (AII)',
            body: 'Four- to eight-week diagnostic mandates for CEO and board: AI sovereignty, AI governance, China-tech exposure, M&A AI due diligence. Methodological frame: ABDJ discovery, BMV-8 validation, GO/PIVOT/PARK/STOP as delivery form.',
          },
          {
            heading: 'Proximity advisory',
            body: 'Continuous CEO advisory outside the operating role: 8–15 mandates in parallel, confidential roster, oral delivery, monthly written briefings, two to four in-person sessions per year.',
          },
          {
            heading: 'Supervisory & advisory boards',
            body: 'With Mittelstand and family enterprises requiring AI transformation. Prerequisites: credible independence from the operating role, public voice, methodological substance.',
          },
          {
            heading: 'Giftedness & humanistic depth',
            body: 'Volunteer role as parents-group leader at LVH Baden-Württemberg, with my wife Arkan. The engagement with giftedness, intelligence research and language is not a side stage — it is the humanistic foundation of the architect thesis.',
          },
        ],
      },
      giftedness: {
        title: 'Neurodivergence',
        badge: 'Knowledge & experience',
        lead: 'Information, research and personal experience on neurodivergence — giftedness, ADHD, autism and other ways of thinking differently, in children and adults. As a parents-group leader at LVH Baden-Württemberg, I gather knowledge here for families.',
        statsTitle: 'Neurodivergence by the numbers',
        stats: [
          { label: 'of the population neurodivergent', value: '15–20 %' },
          { label: 'giftedness (IQ 130+)', value: '2 %' },
          { label: 'ADHD in children', value: '~5 %' },
          { label: 'families at LVH', value: '320' },
        ],
        topicsHeading: 'Areas',
        topics: [
          { title: 'Recognition & diagnostics', body: 'How are giftedness, ADHD or autism identified? Which tests and diagnostic pathways exist? From what age does an assessment make sense?' },
          { title: 'School & support', body: 'Choosing a school, accommodations, grade-skipping, enrichment, acceleration — pathways for neurodivergent children in the education system.' },
          { title: 'Socio-emotional', body: 'Asynchronous development, perfectionism, masking, twice-exceptional (2e) — and how to navigate them.' },
          { title: 'Resources', body: 'Books, points of contact, advisory services and networks in Baden-Württemberg.' },
        ],
        articlesHeading: 'Articles',
        articlesGermanOnly: 'The full articles are currently published in German.',
        ctaTitle: 'Looking for exchange?',
        ctaBody: 'The Nürtingen / Kirchheim-Teck parents group meets regularly to play and to talk.',
        ctaButton: 'Get in touch →',
        ctaEmail: 'elterngruppe-nuertingen@lvh-bw.de',
      },
      lab: {
        title: 'Lab',
        badge: 'Workshop',
        lead: 'Prototypes, interactive visualisations and experiments. Everything I try out and want to show — on the way to productised intelligence.',
        demoBadge: 'Live demo',
        demoTitle: 'Giftedness knowledge graph',
        demoBody: 'An interactive force graph that visualises connections around giftedness. Drag the nodes with the mouse.',
        experimentsHeading: 'Experiments',
        experiments: [
          { title: 'Interactive D3.js charts', body: 'Animated data visualisations on giftedness statistics in Baden-Württemberg.', tech: ['D3.js', 'React', 'SVG'] },
          { title: 'AI prototypes', body: 'Small intelligent tools — from chatbot to automatic document understanding.', tech: ['TypeScript', 'Claude API', 'Astro'] },
          { title: 'Architecture diagrams', body: 'Interactive system visualisations, flowcharts and infographics for my projects.', tech: ['Mermaid', 'Canvas', 'CSS'] },
        ],
        comingSoon: 'Coming soon',
        ctaText: 'Got an idea for an experiment?',
        ctaLink: 'Write to me →',
      },
      about: {
        title: 'About',
        badge: 'Personal',
        name: 'Tobias Oberrauch',
        role: 'Architect of Understanding · AI Lead at audius',
        location: 'Holzmaden, Baden-Württemberg',
        sections: [
          {
            heading: 'Professional',
            body: [
              'As AI Lead at audius, I own the responsible deployment of artificial intelligence in the company. The focus is on ethical considerations, data protection and innovation.',
              'Methodologically I work with ABDJ discovery and BMV-8 validation — the same framework that drives the AII mandates in the architecture practice.',
            ],
          },
          {
            heading: 'Giftedness & engagement',
            body: [
              'Since January 2026 I have been leading the Nürtingen / Kirchheim-Teck parents group of LVH Baden-Württemberg with my wife Arkan.',
              'The topic of giftedness is not a side interest — it is the humanistic depth out of which the architect thesis becomes plausible in the first place.',
            ],
          },
        ],
        whatHeading: 'What I do here',
        whatItems: [
          'Write weekly on the architecture-of-understanding thesis',
          'Speak in curated rooms — to boards, supervisory and advisory boards',
          'Run CEO diagnostics and proximity advisory in the Mittelstand',
          'Publish open-source tools for local, sovereign AI',
        ],
        steckbriefHeading: 'In brief',
        steckbrief: [
          { label: 'Role', value: 'Architect of Understanding' },
          { label: 'Operating base', value: 'audius KI GmbH' },
          { label: 'Location', value: 'Holzmaden' },
          { label: 'Volunteer', value: 'Parents-group lead, LVH-BW' },
          { label: 'On GitHub since', value: '2010' },
          { label: 'Repos', value: '97+' },
          { label: 'LinkedIn', value: '6,200+ followers' },
        ],
        techHeading: 'Technologies',
        projectsHeading: 'Projects',
        contactHeading: 'Contact',
        contactLabels: { email: 'Email', github: 'GitHub', linkedin: 'LinkedIn' },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // LATINA
  // ────────────────────────────────────────────────────────────────────────
  la: {
    meta: {
      siteTitle: 'Tobias Oberrauch — Architectus Intellegentiae',
      siteDescription:
        'Tobias Oberrauch — intellegentia artificialis, geopolitica, cultūs humani consensus. Architectus intellegentiae in limine inter mentem machinarum et mutuum populorum intellectum.',
      homeTitle: 'Tobias Oberrauch — Architectus Intellegentiae',
    },
    hero: {
      badge: 'Intellegentia artificialis · Geopolitica · Cultūs',
      thesis: 'Architectus',
      thesisName: 'Intellegentiae',
      subline:
        'Intellegentia artificialis ut limen ad mutuum populorum intellectum. Opera scripta, dicta et consilio data in confinio mentis machinarum, libertatis civitatum et iudicii culturalis.',
      primaryCta: 'Epistulam accipere',
      secondaryCta: 'Tres columnas inspicere',
      scrollHint: 'Plura cognoscere',
    },
    thesis: {
      title: 'Sententia',
      body: 'In mundo in quo machinae generantes informationem libere multiplicant, iudicium solum manet quod rarum sit. Architectum intellegentiae esse significat: sententiam ratione fultam de intellegentia artificiali, libertate civitatum, et consensu populorum publice ferre — eandemque privatim, cum cura, tradere.',
    },
    pillars: {
      sectionLabel: 'Tres columnae',
      sectionIntro:
        'Eadem sententia in altitudinem et propinquitatem ascendit: ab commentatione patente per orationem curatam ad mandatum secretum.',
      writing: {
        name: 'Scriptura',
        subtitle: 'Epistulae · Commentationes · Liber',
        teaser:
          'Hebdomadariae aestimationes et commentationes longiores in confinio intellegentiae artificialis, geopoliticae et negotiatorum mediorum. Duabus linguis: LA-cogitatio, vernacula traditio.',
        cta: 'Ad epistulam',
      },
      speaking: {
        name: 'Oratio',
        subtitle: 'Orationes · Dialogi · Conventus',
        teaser:
          'Orationes principales, colloquia ad consilia administrandi, conventus annuus de libertate intellegentiae artificialis curatus.',
        cta: 'Apparitiones videre',
      },
      working: {
        name: 'Opera',
        subtitle: 'Consilium · Mandata · Munera',
        teaser:
          'Mandata diagnostica AII pro ducibus societatum, consilium secretum ad summum gradum, munera in consiliis vigilantiae et consultandi.',
        cta: 'Opera inspicere',
      },
    },
    newsletter: {
      eyebrow: 'Architectura Intellegentiae',
      title: 'Hebdomadaria aestimatio',
      body: 'Vox ratione fulta de intellegentia artificiali, libertate Europaea, et iudicio culturali — hebdomadariae, duabus linguis, sine strepitu.',
      emailLabel: 'Inscriptio electronica',
      emailPlaceholder: 'nomen@exemplum.com',
      submit: 'Subscribere',
      consent: 'Mittendo consentis ad tractationem secundum policiam privatam.',
      frequency: 'Hebdomadarie · Quovis tempore renuntiare licet',
    },
    nav: {
      home: 'Initium',
      writing: 'Scriptura',
      speaking: 'Oratio',
      working: 'Opera',
      pioneers: 'Principia',
      about: 'De Me',
      languageLabel: 'Lingua',
    },
    footer: {
      tagline: 'Tobias Oberrauch · Holzmaden · Architectus Intellegentiae',
      imprint: 'Index editoris',
      privacy: 'De privatis tuendis',
    },
    pages: {
      writing: {
        title: 'Scriptura',
        lead: 'Opus scriptum est stratum imum atque latissimum architecturae: patens omnibus, auctoritatem creans, omnibus stratis supra adnexum.',
        sections: [
          {
            heading: 'Architectura Intellegentiae — Epistula',
            body: 'Aestimatio hebdomadaria (circiter octingenta verba) et commentatio longior singulis quattuor vel sex hebdomadibus. Modus dicendi: testificans, non vaticinans. Argumentum: intellegentia artificialis, libertas civitatum, defectus mutui intellectus inter Germanos et Europam.',
          },
          {
            heading: 'Liber annuus',
            body: 'AI Sovereignty & Understanding Outlook — annua recensio de intellegentia artificiali, libertate Europaea, et asymmetria geopolitica. Mense Ianuario editur, gratis, ut ancora distributionis.',
          },
          {
            heading: 'Liber',
            body: 'In paratione: codex duarum linguarum qui linguam, intellegentiam, mutuam culturarum cognitionem et mentem machinarum una synthesi conceptuali tractat — non manualis alius de usu intellegentiae artificialis.',
          },
        ],
      },
      speaking: {
        title: 'Oratio',
        lead: 'Opus dictum est scaena curata — oratio, colloquium, conventus. Aulam multitudinis substituit iudicio testato ante auditorium idoneum.',
        sections: [
          {
            heading: 'Orationes principales',
            body: 'Formae dimidiati vel integri diei pro consiliis vigilantiae, ducibus negotiatorum mediorum, circulis dominorum familiarium, et conventibus sectorum. Argumenta: libertas intellegentiae artificialis, asymmetria transatlantica, defectus intellectus.',
          },
          {
            heading: 'Podcast & colloquia',
            body: 'Longa colloquia singularia in modo Conversations-with-Tyler: nullum praeconium industriae, nullae listae, nulla oeconomia scaenarum. Singulis mensibus, in aedificatione.',
          },
          {
            heading: 'Conventus annuus',
            body: 'Forma curata, ad invitationem solam: viginti quattuor ad sexaginta participes, diei dimidio et integro, sub regula Chatham House. Libertas intellegentiae artificialis, intellectus Europaeus, commutatio secreta. Non conventus publicus — colloquium officinae.',
          },
        ],
      },
      working: {
        title: 'Opera',
        lead: 'Opus consultivum est stratum angustissimum et pretiosissimum: capacitate limitatum, ore traditum, secretum. Hic methodus traditur, non informatio.',
        sections: [
          {
            heading: 'Audius Intelligence Insights (AII)',
            body: 'Mandata diagnostica quattuor ad octo hebdomadarum pro duce et consilio: libertas intellegentiae artificialis, regimen AI, expositio ad technicam Sinensem, diligentia debita in fusionibus et acquisitionibus. Methodus: ABDJ inventio, BMV-8 probatio, GO/PIVOT/PARK/STOP ut forma traditionis.',
          },
          {
            heading: 'Consilium proximum',
            body: 'Consilium continuum duci societatis extra munus operandi: octo ad quindecim mandata pariter, album secretum, traditio orata, commentaria mensurua scripta, conventus in persona bis vel quater per annum.',
          },
          {
            heading: 'Munera consilio vigilantiae et consultandi',
            body: 'In negotiatoribus mediis et societatibus familiaribus quae transformationem AI requirunt. Praerequisita: credibilis independentia ab opere operativo, vox publica, substantia methodica.',
          },
          {
            heading: 'De ingeniositate et humanitate',
            body: 'Munus voluntarium ducis circuli parentum apud LVH Baden-Württemberg, cum uxore mea Arkan. Studium ingeniositatis, investigationis intellectus, et linguae non est scaena secundaria — est fundamentum humanitatis sententiae architecti.',
          },
        ],
      },
      giftedness: {
        title: 'Neurodiversitas',
        badge: 'Scientia et Experientia',
        lead: 'Notitiae, investigationes et experientiae privatae de neurodiversitate — de ingenio, ADHS, autismo aliisque modis aliter cogitandi apud infantes et adultos. Ut dux circuli parentum apud LVH Baden-Württemberg hic cognitionem familiis colligo.',
        statsTitle: 'Neurodiversitas in numeris',
        stats: [
          { label: 'populi neurodiversi', value: '15–20 %' },
          { label: 'ingenium (IQ 130+)', value: '2 %' },
          { label: 'ADHS apud infantes', value: '~5 %' },
          { label: 'familiae apud LVH', value: '320' },
        ],
        topicsHeading: 'Argumenta',
        topics: [
          { title: 'Inventio et diagnosis', body: 'Quomodo ingenium, ADHS vel autismus agnoscitur? Quae probationes et viae diagnosticae existunt? A qua aetate examinatio prudens est?' },
          { title: 'Schola et fovendum', body: 'Electio scholae, compensatio incommodi, gradus transcendere, locupletatio, acceleratio — viae infantium neurodiversorum in re scholastica.' },
          { title: 'Socialia et affectus', body: 'Evolutio asynchrona, cupido perfectionis, dissimulatio, bis-exceptio (2e) — et quomodo tractentur.' },
          { title: 'Subsidia', body: 'Libri, loci adeundi, consilium, et reticula in Baden-Württemberg.' },
        ],
        articlesHeading: 'Commentationes',
        articlesGermanOnly: 'Commentationes plenae lingua Germanica scribuntur.',
        ctaTitle: 'Quaeris commutationem?',
        ctaBody: 'Circulus parentum Nürtingen / Kirchheim-Teck regulariter convenit ad ludendum et colloquendum.',
        ctaButton: 'Contactum capere →',
        ctaEmail: 'elterngruppe-nuertingen@lvh-bw.de',
      },
      lab: {
        title: 'Officina',
        badge: 'Officina experimentorum',
        lead: 'Exempla prima, visualizationes interactivae, experimenta. Omnia quae tento et ostendere volo — in via ad intellegentiam productam.',
        demoBadge: 'Demonstratio viva',
        demoTitle: 'Rete cognitionis de ingenio',
        demoBody: 'Graphum vi attractivum quod nexus circa ingenium visualizat. Nodos cum mure trahere licet.',
        experimentsHeading: 'Experimenta',
        experiments: [
          { title: 'Charts D3.js interactivi', body: 'Visualizationes datorum animatae de statisticis ingenii in Baden-Württemberg.', tech: ['D3.js', 'React', 'SVG'] },
          { title: 'Exempla intellegentiae artificialis', body: 'Parva instrumenta intellegentia — a chatbot ad automaticum intellectorem documentorum.', tech: ['TypeScript', 'Claude API', 'Astro'] },
          { title: 'Diagrammata architecturae', body: 'Visualizationes systematum interactivae, schemata fluxus, et infographiae operum meorum.', tech: ['Mermaid', 'Canvas', 'CSS'] },
        ],
        comingSoon: 'Mox aderit',
        ctaText: 'Habesne consilium experimenti?',
        ctaLink: 'Mihi scribe →',
      },
      about: {
        title: 'De Me',
        badge: 'Privatim',
        name: 'Tobias Oberrauch',
        role: 'Architectus Intellegentiae · Praefectus AI apud audius',
        location: 'Holzmaden, Baden-Württemberg',
        sections: [
          {
            heading: 'Quod ago',
            body: [
              'Ut praefectus intellegentiae artificialis apud audius usum prudentem AI in societate curo. Ratione habita iudicii moralis, tutelae privatorum, et inventionis.',
              'Methodice operor methodis ABDJ inventionis et BMV-8 probationis — eisdem methodis quas in mandatis AII architecturae adhibeo.',
            ],
          },
          {
            heading: 'De ingenio et cura',
            body: [
              'A mense Ianuario anni MMXXVI cum uxore Arkan circulum parentum Nürtingen / Kirchheim-Teck Foederationis Ingenii Baden-Württemberg duco.',
              'Materia ingenii non est studium secundarium — est altitudo humanitatis ex qua sententia architecti credibilis fit.',
            ],
          },
        ],
        whatHeading: 'Quae hic agam',
        whatItems: [
          'Singulis hebdomadibus de sententia architecturae intellegentiae scribere',
          'In conventibus curatis loqui — ante consilia gubernandi et vigilantiae',
          'Diagnosticas duci et consilium proximum negotiatoribus mediis praebere',
          'Instrumenta libera ad intellegentiam localem et liberam edere',
        ],
        steckbriefHeading: 'Index brevis',
        steckbrief: [
          { label: 'Munus', value: 'Architectus Intellegentiae' },
          { label: 'Sedes operativa', value: 'audius KI GmbH' },
          { label: 'Locus', value: 'Holzmaden' },
          { label: 'Munus voluntarium', value: 'Dux circuli LVH-BW' },
          { label: 'In GitHub a', value: 'MMX' },
          { label: 'Codices', value: '97+' },
          { label: 'LinkedIn', value: 'VI cum CC sectatores' },
        ],
        techHeading: 'Technicae',
        projectsHeading: 'Opera',
        contactHeading: 'Communicatio',
        contactLabels: { email: 'Inscriptio electronica', github: 'GitHub', linkedin: 'LinkedIn' },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // ἙΛΛΗΝΙΚΗ (Ancient Greek)
  // ────────────────────────────────────────────────────────────────────────
  grc: {
    meta: {
      siteTitle: 'Τοβίας Ὀβερράουχ — Ἀρχιτέκτων τῆς Συνέσεως',
      siteDescription:
        'Τοβίας Ὀβερράουχ — τεχνητὴ νόησις, πολιτικά, σύνεσις τῶν λαῶν. Ἀρχιτέκτων τῆς συνέσεως ἐν τῷ οὐδῷ μεταξὺ τῆς τῶν μηχανῶν νοήσεως καὶ τοῦ μεταξὺ ἐθνῶν συνιέναι.',
      homeTitle: 'Τοβίας Ὀβερράουχ — Ἀρχιτέκτων τῆς Συνέσεως',
    },
    hero: {
      badge: 'Τεχνητὴ νόησις · Πολιτικά · Πολιτισμός',
      thesis: 'Ἀρχιτέκτων τῆς',
      thesisName: 'Συνέσεως',
      subline:
        'Ἡ τεχνητὴ νόησις ὡς οὐδὸς πρὸς τὴν τῶν λαῶν σύνεσιν. Ἔργα διὰ γραφῆς, λόγου καὶ βουλῆς ἐν τῷ συνόρῳ τῆς τῶν μηχανῶν νοήσεως, τῆς τῶν πόλεων ἐλευθερίας, καὶ τοῦ πολιτισμικοῦ κρίματος.',
      primaryCta: 'Ἐγγράφεσθαι τῇ ἐπιστολῇ',
      secondaryCta: 'Τοὺς τρεῖς κίονας ἰδεῖν',
      scrollHint: 'Πλείω μανθάνειν',
    },
    thesis: {
      title: 'Ἡ θέσις',
      body: 'Ἐν κόσμῳ ἐν ᾧ αἱ γεννητικαὶ μηχαναὶ τὰ νοούμενα ἀπεριορίστως πλασσοῦσιν, μόνον τὸ κρίνειν σπάνιόν τι μένει. Ἀρχιτέκτονα τῆς συνέσεως εἶναι σημαίνει· γνώμην βεβαίαν περὶ τῆς τεχνητῆς νοήσεως, τῆς τῶν πόλεων ἐλευθερίας, καὶ τοῦ μεταξὺ ἐθνῶν συνιέναι δημοσίᾳ φέρειν — καὶ τὴν αὐτὴν ἰδίᾳ, ἐπιμελῶς, παραδιδόναι.',
    },
    pillars: {
      sectionLabel: 'Τρεῖς κίονες',
      sectionIntro:
        'Ἡ αὐτὴ θέσις εἰς βάθος καὶ ἐγγύτητα ἀναβαίνει· ἀπὸ τῆς ἐλευθέρας δοκιμῆς διὰ τοῦ ἐπιμελοῦς λόγου εἰς τὴν μυστικὴν ἐντολήν.',
      writing: {
        name: 'Γραφή',
        subtitle: 'Ἐπιστολαί · Δοκιμαί · Βιβλίον',
        teaser:
          'Ἑβδομαδιαῖαι κρίσεις καὶ δοκιμαὶ μακρότεραι ἐν τῷ συνόρῳ τῆς τεχνητῆς νοήσεως, τῶν πολιτικῶν, καὶ τῶν μέσων ἐμπόρων. Διγλώσσως.',
        cta: 'Πρὸς τὴν ἐπιστολήν',
      },
      speaking: {
        name: 'Λόγος',
        subtitle: 'Λόγοι · Διάλογοι · Συμπόσιον',
        teaser:
          'Λόγοι ἀρχηγέται, ὁμιλίαι πρὸς ἄρχοντας, ἐπιμελὲς συμπόσιον ἐτήσιον περὶ τῆς τεχνητῆς νοήσεως ἐλευθερίας.',
        cta: 'Τὰς ἐπιδείξεις ἰδεῖν',
      },
      working: {
        name: 'Ἔργον',
        subtitle: 'Βουλή · Ἐντολαί · Λειτουργίαι',
        teaser:
          'AII διαγνωστικαὶ ἐντολαὶ ἀρχηγοῖς ἑταιριῶν, μυστικὴ βουλὴ τοῖς πρώτοις, λειτουργίαι ἐν συμβουλίοις ἐπισκοπῆς.',
        cta: 'Τὰ ἔργα ἰδεῖν',
      },
    },
    newsletter: {
      eyebrow: 'Ἀρχιτεκτονικὴ τῆς Συνέσεως',
      title: 'Ἑβδομαδιαία κρίσις',
      body: 'Φωνὴ μετὰ λόγου περὶ τῆς τεχνητῆς νοήσεως, τῆς Εὐρωπαϊκῆς ἐλευθερίας, καὶ τοῦ πολιτισμικοῦ κρίματος — ἑβδομαδιαίως, διγλώσσως, ἄνευ θορύβου.',
      emailLabel: 'Ἠλεκτρονικὴ ἐπιγραφή',
      emailPlaceholder: 'onoma@paradeigma.com',
      submit: 'Ἐγγράφεσθαι',
      consent: 'Πέμπων συναινεῖς τῇ ἐπεξεργασίᾳ κατὰ τοὺς κανόνας ἰδιωτείας.',
      frequency: 'Ἑβδομαδιαίως · Ἀπογράφεσθαι ἀεὶ ἔξεστιν',
    },
    nav: {
      home: 'Ἀρχή',
      writing: 'Γραφή',
      speaking: 'Λόγος',
      working: 'Ἔργον',
      pioneers: 'Ἀρχαί',
      about: 'Περὶ Ἐμοῦ',
      languageLabel: 'Γλῶττα',
    },
    footer: {
      tagline: 'Τοβίας Ὀβερράουχ · Χολτσμάδην · Ἀρχιτέκτων τῆς Συνέσεως',
      imprint: 'Σημείωσις ἐκδότου',
      privacy: 'Περὶ τῶν ἰδιωτικῶν',
    },
    pages: {
      writing: {
        title: 'Γραφή',
        lead: 'Τὸ γεγραμμένον ἔργον ἐστὶν ἡ κατωτάτη καὶ πλατυτάτη στρώσις τῆς ἀρχιτεκτονικῆς· πᾶσιν ἀνοικτή, αὐθεντίαν δημιουργοῦσα, πᾶσι τοῖς ἄνω συνημμένη.',
        sections: [
          {
            heading: 'Ἀρχιτεκτονικὴ τῆς Συνέσεως — Ἐπιστολή',
            body: 'Κρίσις ἑβδομαδιαία (περὶ ὀκτακοσίων λέξεων) καὶ δοκιμὴ μακροτέρα κατὰ τέσσαρας ἢ ἓξ ἑβδομάδας. Τρόπος· μαρτυρῶν, οὐ προφητεύων. Θέμα· τεχνητὴ νόησις, ἐλευθερία πολιτειῶν, ἐλλιπὲς συνιέναι μεταξὺ Γερμανῶν καὶ Εὐρώπης.',
          },
          {
            heading: 'Ἐτήσιος ἀπολογισμός',
            body: 'AI Sovereignty & Understanding Outlook — ἐτησία ἀνασκόπησις περὶ τεχνητῆς νοήσεως, ἐλευθερίας Εὐρωπαϊκῆς, καὶ πολιτικῆς ἀσυμμετρίας. Τῷ Ἰανουαρίῳ ἐκδίδοται, δωρεάν, ὡς ἄγκυρα διανομῆς.',
          },
          {
            heading: 'Βιβλίον',
            body: 'Παρασκευάζεται· χειρόγραφον διγλώσσιον τὸ ὁποῖον γλῶτταν, νόησιν, διαπολιτισμικὴν γνῶσιν καὶ μηχανῶν φρόνησιν ὡς μίαν σύνθεσιν ἐννοιολογικὴν διαπραγματεύεται — οὐ διδακτικὸν χρήσεως τεχνητῆς νοήσεως.',
          },
        ],
      },
      speaking: {
        title: 'Λόγος',
        lead: 'Τὸ λεγόμενον ἔργον ἐστὶν ἡ ἐπιμελὴς σκηνή — λόγος, διάλογος, συμπόσιον. Τὴν αἴθουσαν τοῦ πλήθους ἀντικαθίστησιν κρίματι μεμαρτυρημένῳ ἐνώπιον ἀξίου ἀκροατηρίου.',
        sections: [
          {
            heading: 'Λόγοι ἀρχηγέται',
            body: 'Μορφαὶ ἡμέρας ἡμίσειας ἢ ὅλης πρὸς συμβούλια ἐπισκοπῆς, ἄρχοντας μέσων ἐμπόρων, κύκλους κυρίων οἴκων, καὶ συνέδρια κλάδων. Θέματα· ἐλευθερία τεχνητῆς νοήσεως, διατλαντικὴ ἀσυμμετρία, ἐλλιπὲς συνιέναι.',
          },
          {
            heading: 'Podcast καὶ διάλογοι',
            body: 'Μακροὶ διάλογοι κατὰ τὸν τρόπον Conversations-with-Tyler· οὐδεμία διαφήμισις βιομηχανίας, οὐδεὶς κατάλογος, οὐδεμία οἰκονομία σκηνῆς. Κατὰ μῆνα, ἐν οἰκοδομῇ.',
          },
          {
            heading: 'Ἐτήσιον συμπόσιον',
            body: 'Μορφὴ ἐπιμελής, μόνον διὰ προσκλήσεως· εἴκοσι τέσσαρες ἕως ἑξήκοντα μετέχοντες, ἡμέραν καὶ ἡμίσειαν, ὑπὸ τὸν κανόνα Chatham House. Ἐλευθερία τεχνητῆς νοήσεως, εὐρωπαϊκὴ σύνεσις, μυστικὴ ἀνταλλαγή. Οὐ συνέδριον — διάλογος ἐργαστηρίου.',
          },
        ],
      },
      working: {
        title: 'Ἔργον',
        lead: 'Τὸ βουλευτικὸν ἔργον ἐστὶν ἡ στενωτάτη καὶ τιμιωτάτη στρώσις· ὀλίγη τῇ χωρητικότητι, διὰ στόματος, μυστική. Ἐνταῦθα μέθοδος παραδίδοται, οὐχὶ εἴδησις.',
        sections: [
          {
            heading: 'Audius Intelligence Insights (AII)',
            body: 'Διαγνωστικαὶ ἐντολαὶ τεσσάρων ἕως ὀκτὼ ἑβδομάδων ἀρχηγῷ καὶ συμβουλίῳ· ἐλευθερία τεχνητῆς νοήσεως, διοίκησις AI, ἔκθεσις πρὸς τὴν τεχνικὴν τῶν Σινῶν, ἐπιμέλεια ὀφειλομένη ἐν συνενώσεσιν. Μέθοδος· ABDJ εὕρεσις, BMV-8 ἐξέτασις, GO/PIVOT/PARK/STOP ὡς μορφὴ παραδόσεως.',
          },
          {
            heading: 'Βουλὴ ἐγγύς',
            body: 'Βουλὴ συνεχὴς ἀρχηγῷ ἑταιρίας ἔξω τοῦ ἐνεργοῦ ἔργου· ὀκτὼ ἕως δεκαπέντε ἐντολαὶ παράλληλοι, κατάλογος μυστικός, στοματικὴ παράδοσις, μηνιαῖα γραπτὰ ὑπομνήματα, δύο ἕως τέσσαρες συναντήσεις κατὰ πρόσωπον ἀνὰ ἔτος.',
          },
          {
            heading: 'Λειτουργίαι ἐν συμβουλίοις',
            body: 'Παρὰ μέσοις ἐμπόροις καὶ οἴκοις οἰκογενειακοῖς οἷς δεῖ μετασχηματισμοῦ AI. Προαπαιτούμενα· πιστὴ ἀνεξαρτησία ἀπὸ τοῦ ἐνεργοῦ ἔργου, φωνὴ δημοσία, μέθοδος βεβαία.',
          },
          {
            heading: 'Περὶ τῆς ἰδιοφυΐας καὶ τοῦ ἀνθρωπίνου βάθους',
            body: 'Λειτουργία ἐθελουσία ἡγουμένου κύκλου γονέων παρὰ τῷ LVH Baden-Württemberg, μετὰ τῆς γυναικός μου Ἀρκάν. Ἡ μελέτη τῆς ἰδιοφυΐας, τῆς νοήσεως, καὶ τῆς γλώττης οὐκ ἔστι σκηνὴ δευτέρα — ἐστὶ τὸ ἀνθρώπινον θεμέλιον τῆς θέσεως τοῦ ἀρχιτέκτονος.',
          },
        ],
      },
      giftedness: {
        title: 'Νευροποικιλία',
        badge: 'Γνῶσις καὶ Ἐμπειρία',
        lead: 'Εἰδήσεις, ἔρευναι καὶ προσωπικαὶ ἐμπειρίαι περὶ τῆς νευροποικιλίας — εὐφυΐας, ADHS, αὐτισμοῦ καὶ ἄλλων τρόπων τοῦ ἄλλως νοεῖν παρὰ παισὶ καὶ τελείοις. Ὡς ἡγούμενος κύκλου γονέων παρὰ τῷ LVH Baden-Württemberg ἐνταῦθα γνῶσιν ταῖς οἰκογενείαις συνάγω.',
        statsTitle: 'Ἡ νευροποικιλία ἐν ἀριθμοῖς',
        stats: [
          { label: 'τοῦ λαοῦ νευροποίκιλοι', value: '15–20 %' },
          { label: 'εὐφυΐα (IQ 130+)', value: '2 %' },
          { label: 'ADHS παρὰ παισίν', value: '~5 %' },
          { label: 'οἰκογένειαι ἐν τῷ LVH', value: '320' },
        ],
        topicsHeading: 'Θέματα',
        topics: [
          { title: 'Ἀναγνώρισις καὶ διάγνωσις', body: 'Πῶς γιγνώσκεται ἡ εὐφυΐα, τὸ ADHS ἢ ὁ αὐτισμός; Ποῖαι δοκιμασίαι καὶ ὁδοὶ διαγνωστικαὶ ὑπάρχουσιν; Ἀπὸ ποίας ἡλικίας ἡ ἐξέτασις φρόνιμος;' },
          { title: 'Σχολεῖον καὶ ὑποστήριξις', body: 'Ἐκλογὴ σχολείου, ἀντιστάθμισις, ὑπερβολὴ τάξεων, πλουτισμός, ἐπιτάχυνσις — ὁδοὶ παίδων νευροποικίλων ἐν τῷ παιδευτικῷ συστήματι.' },
          { title: 'Κοινωνικὰ καὶ συναισθηματικά', body: 'Ἀσύγχρονος ἀνάπτυξις, τελειοκρατία, προσωπεῖον, δὶς-ἐξαίρετοι (2e) — καὶ ἡ μετ’ αὐτῶν συναναστροφή.' },
          { title: 'Πηγαί', body: 'Βιβλία, τόποι ἐπαφῆς, συμβουλία καὶ δίκτυα ἐν Baden-Württemberg.' },
        ],
        articlesHeading: 'Δοκιμαί',
        articlesGermanOnly: 'Αἱ πλήρεις δοκιμαὶ νῦν γερμανιστὶ ἐκδίδονται.',
        ctaTitle: 'Ζητεῖς ἀνταλλαγήν;',
        ctaBody: 'Ὁ κύκλος γονέων Nürtingen / Kirchheim-Teck τακτικῶς συνέρχεται πρὸς τὸ παίζειν καὶ λέγειν.',
        ctaButton: 'Ἐπαφὴν λαμβάνειν →',
        ctaEmail: 'elterngruppe-nuertingen@lvh-bw.de',
      },
      lab: {
        title: 'Ἐργαστήριον',
        badge: 'Ἐργαστήριον πειραμάτων',
        lead: 'Πρῶτα δείγματα, διαδραστικαὶ εἰκόνες καὶ πειράματα. Πάντα ἃ δοκιμάζω καὶ δείκνυμι — ἐν τῇ ὁδῷ πρὸς προϊοῦσαν νόησιν.',
        demoBadge: 'Ζῶσα ἐπίδειξις',
        demoTitle: 'Δίκτυον γνώσεως περὶ εὐφυΐας',
        demoBody: 'Γράφημα δυναμικὸν τὸ ὁποῖον τοὺς δεσμοὺς περὶ εὐφυΐας εἰκονίζει. Τοὺς κόμβους ἕλκειν τῷ μυῒ ἔξεστιν.',
        experimentsHeading: 'Πειράματα',
        experiments: [
          { title: 'Διαδραστικὰ διαγράμματα D3.js', body: 'Κινούμεναι εἰκόνες δεδομένων περὶ στατιστικῶν εὐφυΐας ἐν Baden-Württemberg.', tech: ['D3.js', 'React', 'SVG'] },
          { title: 'Πρωτότυπα τεχνητῆς νοήσεως', body: 'Μικρὰ ὄργανα νοερά — ἀπὸ chatbot ἕως αὐτομάτου ἐννοοῦντος ἐγγράφων.', tech: ['TypeScript', 'Claude API', 'Astro'] },
          { title: 'Διαγράμματα ἀρχιτεκτονικῆς', body: 'Διαδραστικαὶ εἰκόνες συστημάτων, σχήματα ῥοῆς, καὶ ἀπεικονίσεις τῶν ἔργων μου.', tech: ['Mermaid', 'Canvas', 'CSS'] },
        ],
        comingSoon: 'Ἐν συντόμῳ',
        ctaText: 'Ἔχεις ἰδέαν πειράματος;',
        ctaLink: 'Γράφε μοι →',
      },
      about: {
        title: 'Περὶ Ἐμοῦ',
        badge: 'Ἰδίᾳ',
        name: 'Τοβίας Ὀβερράουχ',
        role: 'Ἀρχιτέκτων τῆς Συνέσεως · Ἐπιστάτης AI παρὰ τῷ audius',
        location: 'Χολτσμάδην, Baden-Württemberg',
        sections: [
          {
            heading: 'Ἔργον',
            body: [
              'Ὡς ἐπιστάτης τῆς τεχνητῆς νοήσεως παρὰ τῷ audius τὴν χρῆσιν AI ἐν τῇ ἑταιρίᾳ μετὰ φροντίδος διοικῶ — μετὰ λόγου ἠθικοῦ, φυλακῆς ἰδιωτικῶν, καὶ καινοτομίας.',
              'Μεθόδῳ χρῶμαι τῇ ABDJ εὑρέσει καὶ τῇ BMV-8 ἐξετάσει — ταῖς αὐταῖς μεθόδοις αἷς ἐν ταῖς ἐντολαῖς AII τῆς ἀρχιτεκτονικῆς πράξεως χρῶμαι.',
            ],
          },
          {
            heading: 'Εὐφυΐα καὶ μέλημα',
            body: [
              'Ἀπὸ Ἰανουαρίου μηνὸς τοῦ 2026 ἔτους μετὰ τῆς γυναικός μου Ἀρκὰν τὸν κύκλον γονέων Nürtingen / Kirchheim-Teck τοῦ LVH Baden-Württemberg ἡγοῦμαι.',
              'Τὸ θέμα τῆς εὐφυΐας οὐκ ἔστι πάρεργον — ἐστὶ τὸ ἀνθρώπινον βάθος ἐξ οὗ ἡ θέσις τοῦ ἀρχιτέκτονος πιθανὴ γίγνεται.',
            ],
          },
        ],
        whatHeading: 'Ἃ ἐνταῦθα ποιῶ',
        whatItems: [
          'Ἑβδομαδιαίως περὶ τῆς θέσεως τῆς ἀρχιτεκτονικῆς γράφειν',
          'Ἐν χώροις ἐπιμελέσιν λέγειν — ἐνώπιον ἀρχόντων καὶ συμβουλίων',
          'Διαγνωστικὴν δοῦναι ἀρχηγοῖς καὶ βουλὴν ἐγγὺς τοῖς μέσοις ἐμπόροις',
          'Ἐλεύθερα ἐργαλεῖα εἰς τοπικὴν καὶ ἐλευθέραν νόησιν ἐκδιδόναι',
        ],
        steckbriefHeading: 'Σύνοψις',
        steckbrief: [
          { label: 'Λειτουργία', value: 'Ἀρχιτέκτων τῆς Συνέσεως' },
          { label: 'Βάσις ἐνεργείας', value: 'audius KI GmbH' },
          { label: 'Τόπος', value: 'Holzmaden' },
          { label: 'Ἐθελοντία', value: 'Ἡγούμενος κύκλου LVH-BW' },
          { label: 'Ἐν GitHub ἀπό', value: '2010' },
          { label: 'Κώδικες', value: '97+' },
          { label: 'LinkedIn', value: '6.200+ ἑπόμενοι' },
        ],
        techHeading: 'Τεχνολογίαι',
        projectsHeading: 'Ἔργα',
        contactHeading: 'Ἐπαφή',
        contactLabels: { email: 'Ἠλεκτρονικὴ ἐπιγραφή', github: 'GitHub', linkedin: 'LinkedIn' },
      },
    },
  },
};
