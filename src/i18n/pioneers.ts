import type { Locale } from './config';

// The English principle titles, quotes and one-liners are deliberate anchors —
// they stay in English across all four language versions, as in the source text.

export interface PioneerPrinciple {
  numeral: string;
  titleEn: string;
  titleLocal: string;
  quote: string;
  intro: string[];
  history: string[];
  today: string[];
  principle: string;
}

export interface PioneersPage {
  metaDescription: string;
  badge: string;
  title: string;
  intro: string[];
  patterns: string[];
  introOutro: string;
  historyLabel: string;
  todayLabel: string;
  principleLabel: string;
  principles: PioneerPrinciple[];
  cycleTitle: string;
  cycleIntro: string;
  cycleQuestions: string[];
  cycleOutro: string;
  coreTitle: string;
  coreBody: string[];
  coreCredo: string[];
  coreClosing: string[];
}

const anchors = [
  {
    numeral: 'I',
    titleEn: 'FIND THE FRONTIER',
    quote: 'Pioneers see possibility where others see uncertainty.',
    principle: 'Don’t optimize the old world before asking what the new world makes possible.',
  },
  {
    numeral: 'II',
    titleEn: 'FORGE THE TOOL',
    quote: 'A breakthrough becomes valuable when it breaks a constraint.',
    principle: 'Find the constraint. Break it radically.',
  },
  {
    numeral: 'III',
    titleEn: 'MAKE IT USABLE',
    quote: 'Pioneers turn capability into something people can actually use.',
    principle: 'Complexity belongs inside the product, not in front of the user.',
  },
  {
    numeral: 'IV',
    titleEn: 'OPEN THE ROUTE',
    quote: 'A pioneer proves the path. A great entrepreneur makes it scalable.',
    principle: 'Don’t just prove that it works. Build a way for it to spread.',
  },
  {
    numeral: 'V',
    titleEn: 'BUILD THE TERRITORY',
    quote: 'The greatest pioneers don’t just build products. They change the landscape.',
    principle: 'Don’t only cross the frontier. Build something that allows others to follow.',
  },
] as const;

const credo = [
  'They see the frontier.',
  'They break the constraint.',
  'They make it usable.',
  'They open the route.',
  'They build the territory.',
];

interface LocalPrinciple {
  titleLocal: string;
  intro: string[];
  history: string[];
  today: string[];
}

function build(locals: LocalPrinciple[]): PioneerPrinciple[] {
  return anchors.map((a, i) => ({ ...a, ...locals[i] }));
}

export const pioneers: Record<Locale, PioneersPage> = {
  // ────────────────────────────────────────────────────────────────────────
  // DEUTSCH
  // ────────────────────────────────────────────────────────────────────────
  de: {
    metaDescription:
      'Die Five Principles of Pioneers — wie unternehmerische Pioniere neue Möglichkeiten erkennen, Engpässe brechen und Fundamente schaffen, auf denen andere aufbauen.',
    badge: 'Principles of Pioneers',
    title: 'Prinzipien der Pioniere',
    intro: [
      '<strong>Pioniere folgen nicht dem bestehenden Weg. Sie erkennen Möglichkeiten, bevor daraus ein offensichtlicher Weg geworden ist.</strong>',
      'Die großen unternehmerischen Pioniere der Geschichte hatten keinen fertigen Fahrplan. Sie verfügten auch nicht über geheimes Wissen darüber, was als Nächstes passieren würde.',
      'Was sie verband, waren bestimmte wiederkehrende Muster.',
    ],
    patterns: [
      'Sie erkannten eine neue Möglichkeit.',
      'Sie überwanden eine bestehende Begrenzung.',
      'Sie machten aus etwas Kompliziertem etwas Nutzbares.',
      'Sie brachten es in eine neue Größenordnung.',
      'Und die erfolgreichsten von ihnen schufen etwas, auf dem anschließend andere aufbauen konnten.',
    ],
    introOutro: 'Daraus entstehen die <strong>Five Principles of Pioneers</strong>.',
    historyLabel: 'Historisch',
    todayLabel: 'Heute',
    principleLabel: 'Pioneer Principle',
    principles: build([
      {
        titleLocal: 'Erkenne das Neuland',
        intro: [
          'Jeder große Pionier beginnt an einer Grenze.',
          'Eine neue Technologie entsteht.<br />Ein Markt verändert sich.<br />Ein bisher unlösbares Problem wird plötzlich lösbar.<br />Eine alte Annahme verliert ihre Gültigkeit.',
          'Der Pionier fragt nicht zuerst: <strong>„Was funktioniert heute bereits?“</strong>',
          'Sondern: <strong>„Was ist heute erstmals möglich?“</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> erkannte nicht einfach nur Öl als Rohstoff. Er erkannte, dass eine völlig neue industrielle Infrastruktur rund um Raffination, Transport und Distribution entstehen würde.',
          '<strong>Carnegie</strong> erkannte, dass neue Produktionsverfahren Stahl von einem teuren Spezialmaterial zu einem Werkstoff für eine industrielle Gesellschaft machen konnten.',
        ],
        today: [
          'Generative KI ist beispielsweise nicht nur ein schnellerer Chatbot.',
          'Die eigentliche Frontier-Frage lautet: <strong>Welche Dinge können Organisationen oder Menschen heute erstmals tun, weil Maschinen Sprache, Bilder, Wissen und Software verstehen und erzeugen können?</strong>',
        ],
      },
      {
        titleLocal: 'Schmiede das Werkzeug',
        intro: [
          'Neue Möglichkeiten allein schaffen noch keinen wirtschaftlichen Wert.',
          'Der zweite Schritt besteht darin, einen bestehenden Engpass zu brechen.',
          'Schneller.<br />Billiger.<br />Einfacher.<br />Zuverlässiger.<br />Oder überhaupt erstmals möglich.',
          'Der Pionier sucht deshalb nach dem <strong>Constraint</strong> — nach der Begrenzung, welche die bestehende Welt zurückhält.',
        ],
        history: [
          '<strong>Carnegie</strong> perfektionierte industrielle Stahlproduktion und senkte dadurch Kosten und Produktionszeiten erheblich.',
          '<strong>Rockefeller</strong> optimierte Raffination, Logistik, Auslastung und Nebenproduktverwertung und verwandelte ein chaotisches Geschäft in ein industrielles System.',
          '<strong>Ford</strong> reduzierte mit standardisierten Arbeitsschritten und Fließfertigung massiv die Produktionszeit eines Automobils.',
        ],
        today: [
          'Bei KI könnte der Engpass beispielsweise sein:',
          'Expertenwissen ist knapp.<br />Softwareentwicklung dauert Monate.<br />Verwaltung ist voller manueller Arbeit.<br />Entscheidungen benötigen Informationen aus hundert Systemen.<br />Individuelle Dienstleistungen skalieren nicht.',
          'Der entscheidende Gedanke lautet: <strong>Technologie ist nicht der Wert. Der gebrochene Engpass ist der Wert.</strong>',
        ],
      },
      {
        titleLocal: 'Mache es für Menschen nutzbar',
        intro: [
          'Viele Innovationen scheitern nicht daran, dass sie technisch schlecht sind.',
          'Sie scheitern daran, dass sie zu kompliziert bleiben.',
          'Ein Pionier übersetzt deshalb technologische Möglichkeiten in etwas Verständliches, Nutzbares und Wiederholbares.',
          'Aus Technologie wird ein <strong>Produkt</strong>. Aus Expertenwissen wird ein <strong>System</strong>. Aus einer individuellen Lösung wird etwas, das auch ohne seinen Erfinder funktioniert.',
        ],
        history: [
          'Das Automobil existierte lange vor <strong>Henry Ford</strong>. Seine Leistung bestand nicht darin, das Auto zu erfinden. Er machte es reproduzierbar und für einen wesentlich größeren Teil der Bevölkerung erreichbar.',
          'Auch <strong>Steve Jobs</strong> erfand weder Computer, MP3-Player noch Smartphones. Apple verband vorhandene Technologien zu Produkten, die Menschen ohne technisches Spezialwissen benutzen konnten.',
        ],
        today: [
          'Dasselbe gilt für KI. Der eigentliche Durchbruch entsteht häufig nicht durch: <strong>„Wir haben das beste Modell.“</strong>',
          'Sondern durch: <strong>„Ein normaler Mensch kann damit plötzlich etwas tun, wofür vorher Spezialisten notwendig waren.“</strong>',
        ],
      },
      {
        titleLocal: 'Öffne den Weg für viele',
        intro: [
          'Ein funktionierendes Produkt allein verändert noch keinen Markt.',
          'Jetzt muss aus dem schmalen Pionierpfad eine Straße werden.',
          'Produktion.<br />Distribution.<br />Kapital.<br />Vertrieb.<br />Standards.<br />Automatisierung.',
          'Alles wird darauf ausgerichtet, etwas, das einmal funktioniert hat, <strong>tausend-, millionen- oder milliardenfach reproduzierbar zu machen.</strong>',
        ],
        history: [
          '<strong>Ford</strong> verband das standardisierte Produkt mit industrieller Massenproduktion.',
          '<strong>Carnegie</strong> baute aus effizienter Stahlproduktion eine industrielle Größenordnung auf.',
          '<strong>Rockefeller</strong> kontrollierte immer größere Teile der Wertschöpfungskette und schuf enorme Skaleneffekte.',
        ],
        today: [
          'Digitale Produkte besitzen eine historische Besonderheit: Die Grenzkosten zusätzlicher Nutzer können extrem niedrig sein.',
          'Software, KI und globale digitale Distribution ermöglichen deshalb Skalierung in einer Geschwindigkeit, die frühere Pioniere kaum kannten.',
          'Die Frage lautet: <strong>Was müsste wahr sein, damit diese Lösung nicht 10 Menschen, sondern 10 Millionen Menschen nutzen können?</strong>',
        ],
      },
      {
        titleLocal: 'Baue die Infrastruktur hinter dem Weg',
        intro: [
          'Hier entsteht der Unterschied zwischen einem erfolgreichen Produkt und einer dauerhaft prägenden Position.',
          'Die stärksten Pioniere hören nicht beim eigenen Produkt auf.',
          'Sie schaffen: Standards.<br />Infrastruktur.<br />Netzwerke.<br />Marktplätze.<br />Ökosysteme.<br />Plattformen.',
          'Andere beginnen anschließend, <strong>auf ihrem Fundament aufzubauen.</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> baute nicht lediglich Raffinerien, sondern ein umfassendes industrielles System rund um Öl.',
          '<strong>Tesla</strong> entwickelte nicht nur Elektroautos, sondern investierte gleichzeitig in Ladeinfrastruktur, Batterietechnologie, Software und Energie.',
          '<strong>Apple</strong> machte aus dem iPhone schließlich mit App Store, Entwicklern, Services und Zubehör ein ganzes Ökosystem.',
        ],
        today: [
          'Auch bei KI wird die entscheidende Frage irgendwann nicht mehr lauten: <strong>„Welches KI-Produkt bauen wir?“</strong>',
          'Sondern: <strong>„Welche Infrastruktur können wir schaffen, auf der andere ihre eigenen Produkte, Unternehmen und Arbeitsweisen aufbauen?“</strong>',
        ],
      },
    ]),
    cycleTitle: 'The Pioneer Cycle',
    cycleIntro:
      'Die fünf Prinzipien bilden keinen starren Fahrplan. Sie bilden einen Kreislauf:',
    cycleQuestions: [
      'Was ist erstmals möglich?',
      'Welche Begrenzung können wir damit durchbrechen?',
      'Wie wird daraus etwas, das Menschen wirklich nutzen können?',
      'Wie kann daraus etwas Großes werden?',
      'Wie schaffen wir etwas, auf dem andere aufbauen können?',
    ],
    cycleOutro: 'Und dadurch entsteht wiederum eine neue <strong>Frontier</strong>.',
    coreTitle: 'The Core Idea',
    coreBody: [
      'Fast jeder Unternehmer kann ein bestehendes Geschäftsmodell besser ausführen.',
      'Pioniere tun etwas anderes.',
      'Sie verschieben die Grenze dessen, was möglich ist.',
    ],
    coreCredo: credo,
    coreClosing: [
      'Das sind die <strong>Principles of Pioneers</strong>.',
      'Nicht die Regeln dafür, wie man einem bekannten Weg folgt. Sondern Prinzipien dafür, wie neue Wege entstehen.',
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // ENGLISH
  // ────────────────────────────────────────────────────────────────────────
  en: {
    metaDescription:
      'The Five Principles of Pioneers — how entrepreneurial pioneers recognize new possibilities, break constraints, and build foundations others can build upon.',
    badge: 'Principles of Pioneers',
    title: 'Principles of Pioneers',
    intro: [
      '<strong>Pioneers don’t follow the existing path. They recognize possibilities before they have become an obvious road.</strong>',
      'The great entrepreneurial pioneers of history had no ready-made roadmap. Nor did they possess secret knowledge of what would happen next.',
      'What united them were certain recurring patterns.',
    ],
    patterns: [
      'They recognized a new possibility.',
      'They overcame an existing limitation.',
      'They turned something complicated into something usable.',
      'They brought it to a new order of magnitude.',
      'And the most successful of them created something others could subsequently build upon.',
    ],
    introOutro: 'From this emerge the <strong>Five Principles of Pioneers</strong>.',
    historyLabel: 'Historically',
    todayLabel: 'Today',
    principleLabel: 'Pioneer Principle',
    principles: build([
      {
        titleLocal: 'Recognize the frontier',
        intro: [
          'Every great pioneer begins at a frontier.',
          'A new technology emerges.<br />A market shifts.<br />A previously unsolvable problem suddenly becomes solvable.<br />An old assumption loses its validity.',
          'The pioneer’s first question is not: <strong>“What already works today?”</strong>',
          'But: <strong>“What is possible today for the first time?”</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> didn’t simply see oil as a raw material. He recognized that an entirely new industrial infrastructure would emerge around refining, transport, and distribution.',
          '<strong>Carnegie</strong> recognized that new production processes could turn steel from an expensive specialty material into a building block of an industrial society.',
        ],
        today: [
          'Generative AI, for instance, is not just a faster chatbot.',
          'The real frontier question is: <strong>What can organizations or people do today for the first time, because machines can understand and generate language, images, knowledge, and software?</strong>',
        ],
      },
      {
        titleLocal: 'Forge the tool',
        intro: [
          'New possibilities alone don’t create economic value.',
          'The second step is to break an existing bottleneck.',
          'Faster.<br />Cheaper.<br />Simpler.<br />More reliable.<br />Or possible at all, for the first time.',
          'The pioneer therefore searches for the <strong>constraint</strong> — the limitation holding the existing world back.',
        ],
        history: [
          '<strong>Carnegie</strong> perfected industrial steel production, dramatically lowering costs and production times.',
          '<strong>Rockefeller</strong> optimized refining, logistics, capacity utilization, and by-product recovery, turning a chaotic business into an industrial system.',
          '<strong>Ford</strong> massively reduced the time it took to build an automobile through standardized work steps and assembly-line production.',
        ],
        today: [
          'With AI, the bottleneck might be:',
          'Expert knowledge is scarce.<br />Software development takes months.<br />Administration is full of manual work.<br />Decisions require information from a hundred systems.<br />Individual services don’t scale.',
          'The decisive thought is: <strong>Technology is not the value. The broken constraint is the value.</strong>',
        ],
      },
      {
        titleLocal: 'Make it usable for people',
        intro: [
          'Many innovations don’t fail because they are technically poor.',
          'They fail because they remain too complicated.',
          'A pioneer therefore translates technological capability into something understandable, usable, and repeatable.',
          'Technology becomes a <strong>product</strong>. Expert knowledge becomes a <strong>system</strong>. An individual solution becomes something that works even without its inventor.',
        ],
        history: [
          'The automobile existed long before <strong>Henry Ford</strong>. His achievement was not inventing the car. He made it reproducible and attainable for a far larger share of the population.',
          '<strong>Steve Jobs</strong> likewise invented neither computers, MP3 players, nor smartphones. Apple combined existing technologies into products people could use without specialized technical knowledge.',
        ],
        today: [
          'The same holds for AI. The real breakthrough often doesn’t come from: <strong>“We have the best model.”</strong>',
          'But from: <strong>“An ordinary person can suddenly do something that previously required specialists.”</strong>',
        ],
      },
      {
        titleLocal: 'Open the route for many',
        intro: [
          'A working product alone doesn’t change a market.',
          'Now the narrow pioneer trail must become a road.',
          'Production.<br />Distribution.<br />Capital.<br />Sales.<br />Standards.<br />Automation.',
          'Everything is aligned toward making something that worked once <strong>reproducible a thousand, a million, or a billion times.</strong>',
        ],
        history: [
          '<strong>Ford</strong> combined the standardized product with industrial mass production.',
          '<strong>Carnegie</strong> built industrial scale out of efficient steel production.',
          '<strong>Rockefeller</strong> controlled ever larger parts of the value chain and created enormous economies of scale.',
        ],
        today: [
          'Digital products have a historical peculiarity: the marginal cost of additional users can be extremely low.',
          'Software, AI, and global digital distribution therefore enable scaling at a speed earlier pioneers barely knew.',
          'The question is: <strong>What would have to be true for this solution to be used not by 10 people, but by 10 million?</strong>',
        ],
      },
      {
        titleLocal: 'Build the infrastructure behind the path',
        intro: [
          'Here lies the difference between a successful product and a lastingly defining position.',
          'The strongest pioneers don’t stop at their own product.',
          'They create: Standards.<br />Infrastructure.<br />Networks.<br />Marketplaces.<br />Ecosystems.<br />Platforms.',
          'Others then begin <strong>to build on their foundation.</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> didn’t merely build refineries, but a comprehensive industrial system around oil.',
          '<strong>Tesla</strong> didn’t just develop electric cars, but simultaneously invested in charging infrastructure, battery technology, software, and energy.',
          '<strong>Apple</strong> ultimately turned the iPhone into an entire ecosystem with the App Store, developers, services, and accessories.',
        ],
        today: [
          'With AI too, the decisive question will at some point no longer be: <strong>“Which AI product do we build?”</strong>',
          'But: <strong>“What infrastructure can we create on which others build their own products, companies, and ways of working?”</strong>',
        ],
      },
    ]),
    cycleTitle: 'The Pioneer Cycle',
    cycleIntro:
      'The five principles don’t form a rigid roadmap. They form a cycle:',
    cycleQuestions: [
      'What is possible for the first time?',
      'Which limitation can we break with it?',
      'How does it become something people can actually use?',
      'How can it become something big?',
      'How do we create something others can build upon?',
    ],
    cycleOutro: 'And out of this, in turn, a new <strong>frontier</strong> emerges.',
    coreTitle: 'The Core Idea',
    coreBody: [
      'Almost any entrepreneur can execute an existing business model better.',
      'Pioneers do something different.',
      'They shift the boundary of what is possible.',
    ],
    coreCredo: credo,
    coreClosing: [
      'These are the <strong>Principles of Pioneers</strong>.',
      'Not rules for how to follow a known path — but principles for how new paths come into being.',
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // LATINA
  // ────────────────────────────────────────────────────────────────────────
  la: {
    metaDescription:
      'Quinque Principia Praecursorum — quomodo praecursores rerum novarum facultates agnoscant, terminos perrumpant et fundamenta creent, in quibus alii aedificent.',
    badge: 'Principles of Pioneers',
    title: 'Principia Praecursorum',
    intro: [
      '<strong>Praecursores viam iam tritam non sequuntur. Facultates agnoscunt, priusquam via aperta factae sint.</strong>',
      'Magni illi rerum novarum conditores in historia nullum habebant itinerarium paratum, neque arcana scientia futurorum utebantur.',
      'Coniungebant eos quaedam exempla semper redeuntia.',
    ],
    patterns: [
      'Novam facultatem agnoverunt.',
      'Terminum exsistentem superaverunt.',
      'Ex re implicata rem utilem fecerunt.',
      'Eam in novam magnitudinem extulerunt.',
      'Et felicissimi eorum aliquid creaverunt, in quo alii postea aedificare possent.',
    ],
    introOutro: 'Inde oriuntur quinque illa <strong>Principles of Pioneers</strong>.',
    historyLabel: 'Ex historia',
    todayLabel: 'Hodie',
    principleLabel: 'Pioneer Principle',
    principles: build([
      {
        titleLocal: 'Cognosce terram novam',
        intro: [
          'Omnis magnus praecursor in confinio incipit.',
          'Nova ars technica oritur.<br />Mercatus mutatur.<br />Problema adhuc insolubile subito solvi potest.<br />Vetus opinio vim suam amittit.',
          'Praecursor non primum quaerit: <strong>“Quid hodie iam valet?”</strong>',
          'Sed: <strong>“Quid hodie primum fieri potest?”</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> non oleum tantum ut materiam vidit; providit enim novam omnino machinationem industrialem circa purgationem, vecturam, distributionem orituram esse.',
          '<strong>Carnegie</strong> intellexit novas rationes fabricandi chalybem e materia rara et cara in materiam societatis industrialis mutare posse.',
        ],
        today: [
          'Intellegentia artificialis generativa, exempli gratia, non est tantum machina colloquendi velocior.',
          'Vera quaestio confinii est: <strong>Quae nunc primum homines vel societates facere possunt, quia machinae linguam, imagines, scientiam, programmata et intellegunt et gignunt?</strong>',
        ],
      },
      {
        titleLocal: 'Fabricare instrumentum',
        intro: [
          'Novae facultates solae nondum pariunt valorem oeconomicum.',
          'Secundus gradus est terminum exsistentem perrumpere.',
          'Celerius.<br />Vilius.<br />Simplicius.<br />Certius.<br />Aut omnino primum possibile.',
          'Praecursor igitur quaerit <strong>terminum</strong> — angustias, quae mundum praesentem retinent.',
        ],
        history: [
          '<strong>Carnegie</strong> fabricationem chalybis industrialem perfecit et sumptus temporaque fabricandi valde minuit.',
          '<strong>Rockefeller</strong> purgationem, logisticam, usum plenum, residuorum fructum optimavit et negotium turbidum in systema industriale convertit.',
          '<strong>Ford</strong> operibus normatis et serie currente tempus fabricandi autocineti immane contraxit.',
        ],
        today: [
          'In intellegentia artificiali terminus esse potest:',
          'Scientia peritorum rara est.<br />Programmata facienda menses postulant.<br />Administratio opere manuali plena est.<br />Consilia notitias e centum systematibus requirunt.<br />Ministeria singularia non crescunt.',
          'Cogitatio decretoria: <strong>Non ars ipsa valor est; terminus perruptus valor est.</strong>',
        ],
      },
      {
        titleLocal: 'Fac id hominibus utile',
        intro: [
          'Multa inventa non cadunt, quod technice mala sunt.',
          'Cadunt, quod nimis implicata manent.',
          'Praecursor igitur facultates technicas in aliquid intellegibile, utile, iterabile vertit.',
          'Ex arte fit <strong>opus venale</strong>. Ex scientia peritorum fit <strong>systema</strong>. Ex solutione singulari fit aliquid, quod etiam sine inventore suo operatur.',
        ],
        history: [
          'Autocinetum diu ante <strong>Henricum Ford</strong> exstabat. Non invenit autocinetum; fecit, ut reproduci posset et multo maiori parti populi pateret.',
          'Neque <strong>Steve Jobs</strong> computatra, machinas musicas, telephona sapientia invenit. Apple artes praesentes in opera coniunxit, quibus homines sine peritia technica uti possent.',
        ],
        today: [
          'Idem de intellegentia artificiali valet. Verus progressus saepe non fit per: <strong>“Optimum exemplar habemus.”</strong>',
          'Sed per: <strong>“Homo communis subito facere potest, ad quod antea peritis opus erat.”</strong>',
        ],
      },
      {
        titleLocal: 'Aperi viam multis',
        intro: [
          'Opus, quod operatur, solum mercatum nondum mutat.',
          'Nunc ex semita angusta praecursoris via strata fieri debet.',
          'Fabricatio.<br />Distributio.<br />Pecunia.<br />Venditio.<br />Normae.<br />Automatio.',
          'Omnia eo diriguntur, ut, quod semel valuit, <strong>milies ac milliens reproduci possit.</strong>',
        ],
        history: [
          '<strong>Ford</strong> opus normatum cum fabricatione industriali maxima coniunxit.',
          '<strong>Carnegie</strong> ex efficaci chalybis fabricatione magnitudinem industrialem exstruxit.',
          '<strong>Rockefeller</strong> partes catenae valoris semper maiores tenuit et ingentes effectus magnitudinis creavit.',
        ],
        today: [
          'Opera digitalia proprietatem historicam habent: sumptus marginales novorum utentium minimi esse possunt.',
          'Programmata, intellegentia artificialis, distributio digitalis globalis crescentiam praebent celeritate, quam priores praecursores vix noverant.',
          'Quaestio est: <strong>Quid verum esse deberet, ut hac solutione non decem homines, sed centies centena milia hominum uterentur?</strong>',
        ],
      },
      {
        titleLocal: 'Aedifica substructionem post viam',
        intro: [
          'Hic nascitur discrimen inter opus prosperum et locum diu formantem.',
          'Fortissimi praecursores in suo opere non desinunt.',
          'Creant: Normas.<br />Substructiones.<br />Retia.<br />Fora.<br />Oecosystemata.<br />Suggesta.',
          'Alii deinde incipiunt <strong>in eorum fundamento aedificare.</strong>',
        ],
        history: [
          '<strong>Rockefeller</strong> non solum officinas purgandi aedificavit, sed totum systema industriale circa oleum.',
          '<strong>Tesla</strong> non tantum autocineta electrica paravit, sed simul in stationes onerandi, technologiam pilarum, programmata, energiam pecuniam collocavit.',
          '<strong>Apple</strong> ex iPhone tandem cum App Store, conditoribus, ministeriis, instrumentis totum oecosystema fecit.',
        ],
        today: [
          'Etiam in intellegentia artificiali quaestio decretoria olim non iam erit: <strong>“Quod opus intellegentiae artificialis aedificamus?”</strong>',
          'Sed: <strong>“Quam substructionem creare possumus, in qua alii sua opera, suas societates, suos modos operandi aedificent?”</strong>',
        ],
      },
    ]),
    cycleTitle: 'The Pioneer Cycle',
    cycleIntro:
      'Quinque principia non itinerarium rigidum efficiunt. Circulum efficiunt:',
    cycleQuestions: [
      'Quid nunc primum fieri potest?',
      'Quem terminum inde perrumpere possumus?',
      'Quomodo inde fit aliquid, quo homines vere uti possint?',
      'Quomodo inde aliquid magnum fieri potest?',
      'Quomodo aliquid creamus, in quo alii aedificare possint?',
    ],
    cycleOutro: 'Atque inde rursus novum <strong>confinium</strong> oritur.',
    coreTitle: 'The Core Idea',
    coreBody: [
      'Fere omnis negotiator exemplar negotii exsistens melius exsequi potest.',
      'Praecursores aliud faciunt.',
      'Terminos eius, quod fieri potest, promovent.',
    ],
    coreCredo: credo,
    coreClosing: [
      'Haec sunt <strong>Principles of Pioneers</strong>.',
      'Non regulae, quomodo via nota sequenda sit — sed principia, quomodo novae viae oriantur.',
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // ΕΛΛΗΝΙΚΗ
  // ────────────────────────────────────────────────────────────────────────
  grc: {
    metaDescription:
      'Αἱ πέντε Ἀρχαὶ τῶν Προδρόμων — πῶς οἱ πρόδρομοι δυνατὰ καινὰ γιγνώσκουσιν, ὅρους διαρρηγνύουσι καὶ θεμέλια κτίζουσιν, ἐφ’ οἷς ἄλλοι οἰκοδομοῦσιν.',
    badge: 'Principles of Pioneers',
    title: 'Ἀρχαὶ τῶν Προδρόμων',
    intro: [
      '<strong>Οἱ πρόδρομοι οὐχ ἕπονται τῇ ἤδη τετριμμένῃ ὁδῷ· γιγνώσκουσι γὰρ τὰ δυνατά, πρὶν ὁδὸν φανερὰν γενέσθαι.</strong>',
      'Οἱ μεγάλοι τῆς ἱστορίας πρόδρομοι οὐκ εἶχον χάρτην ἕτοιμον, οὐδὲ κρυπτὴν ἐπιστήμην τῶν μελλόντων.',
      'Συνῆπτε δὲ αὐτοὺς σχήματα ἀεὶ ἐπανερχόμενα.',
    ],
    patterns: [
      'Ἔγνωσαν δυνατόν τι καινόν.',
      'Ὑπερέβησαν ὅρον ὑπάρχοντα.',
      'Ἐκ τοῦ πολυπλόκου χρήσιμόν τι ἐποίησαν.',
      'Εἰς μέγεθος καινὸν αὐτὸ ἤγαγον.',
      'Καὶ οἱ εὐτυχέστατοι ἔκτισάν τι, ἐφ’ ᾧ ἄλλοι ὕστερον ᾠκοδόμουν.',
    ],
    introOutro: 'Ἐντεῦθεν γίγνονται αἱ πέντε <strong>Principles of Pioneers</strong>.',
    historyLabel: 'Ἐκ τῆς ἱστορίας',
    todayLabel: 'Νῦν',
    principleLabel: 'Pioneer Principle',
    principles: build([
      {
        titleLocal: 'Γνῶθι τὴν ἐσχατιάν',
        intro: [
          'Πᾶς μέγας πρόδρομος ἐν ἐσχατιᾷ ἄρχεται.',
          'Τέχνη καινὴ γίγνεται.<br />Ἀγορὰ μεταβάλλεται.<br />Πρόβλημα τέως ἄλυτον ἐξαίφνης λυτὸν γίγνεται.<br />Παλαιὰ ὑπόληψις τὴν ἰσχὺν ἀπόλλυσιν.',
          'Ὁ πρόδρομος οὐ πρῶτον ἐρωτᾷ· <strong>«Τί ἤδη σήμερον ἐργάζεται;»</strong>',
          'Ἀλλά· <strong>«Τί σήμερον πρῶτον δυνατόν;»</strong>',
        ],
        history: [
          'Ὁ <strong>Ῥοκφέλλερ</strong> οὐχ ἁπλῶς τὸ ἔλαιον ὡς ὕλην εἶδεν· προεῖδε γὰρ ὅτι ὅλη καινὴ κατασκευὴ βιομηχανικὴ περὶ κάθαρσιν, μεταφοράν, διανομὴν γενήσοιτο.',
          'Ὁ <strong>Καρνέγης</strong> ἔγνω ὅτι καινοὶ τρόποι ἐργασίας τὸν χάλυβα ἐξ ὕλης σπανίας καὶ πολυτελοῦς εἰς ὕλην κοινωνίας βιομηχανικῆς μεταβαλεῖν δύναιντο.',
        ],
        today: [
          'Ἡ γεννητικὴ τεχνητὴ νόησις οὐκ ἔστι μόνον μηχανὴ διαλεγομένη ταχυτέρα.',
          'Ἡ ἀληθὴς ἐρώτησις τῆς ἐσχατιᾶς· <strong>Τί νῦν πρῶτον δύνανται ποιεῖν ἄνθρωποι καὶ κοινωνίαι, ἐπειδὴ μηχαναὶ λόγον, εἰκόνας, ἐπιστήμην, προγράμματα καὶ συνιᾶσι καὶ γεννῶσιν;</strong>',
        ],
      },
      {
        titleLocal: 'Χάλκευε τὸ ὄργανον',
        intro: [
          'Δυνατὰ καινὰ μόνα οὔπω τίκτει ἀξίαν οἰκονομικήν.',
          'Τὸ δεύτερον βῆμα· ὅρον ὑπάρχοντα διαρρῆξαι.',
          'Θᾶττον.<br />Εὐωνότερον.<br />Ἁπλούστερον.<br />Βεβαιότερον.<br />Ἢ ὅλως πρῶτον δυνατόν.',
          'Ὁ πρόδρομος οὖν ζητεῖ τὸν <strong>ὅρον</strong> — τὸ στενόν, ὃ τὸν παρόντα κόσμον κατέχει.',
        ],
        history: [
          'Ὁ <strong>Καρνέγης</strong> τὴν βιομηχανικὴν τοῦ χάλυβος ἐργασίαν ἐτελείωσε καὶ δαπάνας καὶ χρόνους πολὺ ἐμείωσεν.',
          'Ὁ <strong>Ῥοκφέλλερ</strong> κάθαρσιν, μεταφοράν, χρῆσιν, τὴν τῶν παρέργων ὠφέλειαν ἐβελτίωσε καὶ ἐμπορίαν ταραχώδη εἰς σύστημα βιομηχανικὸν μετέβαλεν.',
          'Ὁ <strong>Φόρδος</strong> ἔργοις ὡρισμένοις καὶ σειρᾷ ῥεούσῃ τὸν χρόνον τῆς τοῦ αὐτοκινήτου ποιήσεως σφόδρα συνέτεμεν.',
        ],
        today: [
          'Ἐν τῇ τεχνητῇ νοήσει ὁ ὅρος ἂν εἴη·',
          'Ἡ τῶν εἰδότων ἐπιστήμη σπανία.<br />Ἡ τῶν προγραμμάτων ποίησις μῆνας αἰτεῖ.<br />Ἡ διοίκησις ἔργου χειρὸς μεστή.<br />Αἱ βουλαὶ γνώσεων ἐξ ἑκατὸν συστημάτων δέονται.<br />Αἱ καθ’ ἕνα ὑπηρεσίαι οὐκ αὔξονται.',
          'Ἡ κυρία γνώμη· <strong>Οὐχ ἡ τέχνη ἡ ἀξία, ἀλλ’ ὁ διερρηγμένος ὅρος.</strong>',
        ],
      },
      {
        titleLocal: 'Ποίει αὐτὸ τοῖς ἀνθρώποις χρήσιμον',
        intro: [
          'Πολλὰ εὑρήματα οὐ πίπτει, διότι τεχνικῶς φαῦλα.',
          'Πίπτει, διότι λίαν πολύπλοκα μένει.',
          'Ὁ πρόδρομος οὖν τὰ δυνατὰ τεχνικὰ εἰς τὸ συνετόν, χρήσιμον, ἐπαναληπτὸν μεταφέρει.',
          'Ἐκ τέχνης γίγνεται <strong>ἔργον ὤνιον</strong>. Ἐκ τῆς τῶν εἰδότων ἐπιστήμης <strong>σύστημα</strong>. Ἐκ λύσεως ἰδίας τι, ὃ καὶ ἄνευ τοῦ εὑρόντος ἐργάζεται.',
        ],
        history: [
          'Τὸ αὐτοκίνητον πολὺ πρὸ τοῦ <strong>Φόρδου</strong> ὑπῆρχεν. Οὐχ εὗρε τὸ αὐτοκίνητον· ἐποίησε δέ, ὥστε ἀναπαράγεσθαι καὶ πολλῷ μείζονι μέρει τοῦ δήμου προσιτὸν εἶναι.',
          'Οὐδ’ ὁ <strong>Στῆβ Τζόβς</strong> εὗρεν οὔτε λογιστήρια οὔτε μουσικὰς μηχανὰς οὔτε τηλέφωνα σοφά. Ἡ Apple τέχνας παρούσας εἰς ἔργα συνῆψεν, οἷς ἄνθρωποι ἄνευ εἰδικῆς ἐπιστήμης χρῆσθαι ἐδύναντο.',
        ],
        today: [
          'Ταὐτὸν καὶ περὶ τῆς τεχνητῆς νοήσεως. Ἡ ἀληθὴς πρόοδος πολλάκις οὐ γίγνεται διὰ τοῦ· <strong>«Τὸ ἄριστον παράδειγμα ἔχομεν.»</strong>',
          'Ἀλλὰ διὰ τοῦ· <strong>«Ἄνθρωπος κοινὸς ἐξαίφνης ποιεῖν δύναται, οὗ πρότερον εἰδότων ἔδει.»</strong>',
        ],
      },
      {
        titleLocal: 'Ἄνοιγε τὴν ὁδὸν τοῖς πολλοῖς',
        intro: [
          'Ἔργον ἐργαζόμενον μόνον ἀγορὰν οὔπω μεταβάλλει.',
          'Νῦν ἐκ τῆς στενῆς τοῦ προδρόμου ἀτραποῦ ὁδὸν γενέσθαι δεῖ.',
          'Ποίησις.<br />Διανομή.<br />Κεφάλαιον.<br />Ἐμπορία.<br />Κανόνες.<br />Αὐτοματισμός.',
          'Πάντα εἰς τοῦτο τείνει, ὥστε τὸ ἅπαξ κατορθωθὲν <strong>χιλιάκις καὶ μυριάκις ἀναπαράγεσθαι.</strong>',
        ],
        history: [
          'Ὁ <strong>Φόρδος</strong> τὸ ἔργον ὡρισμένον τῇ κατὰ πλῆθος ποιήσει συνῆψεν.',
          'Ὁ <strong>Καρνέγης</strong> ἐκ τῆς ἀποτελεσματικῆς τοῦ χάλυβος ἐργασίας μέγεθος βιομηχανικὸν ᾠκοδόμησεν.',
          'Ὁ <strong>Ῥοκφέλλερ</strong> ἀεὶ μείζω μέρη τῆς ἁλύσεως τῆς ἀξίας κατεῖχε καὶ μεγάλα τοῦ μεγέθους ὠφελήματα ἔκτισεν.',
        ],
        today: [
          'Τὰ ψηφιακὰ ἔργα ἴδιον ἱστορικὸν ἔχει· ἡ τῶν προσθέτων χρωμένων δαπάνη ἐλαχίστη εἶναι δύναται.',
          'Προγράμματα, τεχνητὴ νόησις, διανομὴ ψηφιακὴ καθ’ ὅλην τὴν γῆν αὔξησιν παρέχει τάχει, ὃ οἱ πρότεροι πρόδρομοι μόλις ᾔδεσαν.',
          'Ἡ ἐρώτησις· <strong>Τί ἀληθὲς εἶναι δέοι, ἵνα ταύτῃ τῇ λύσει μὴ δέκα ἄνθρωποι, ἀλλὰ χίλιαι μυριάδες χρῷντο;</strong>',
        ],
      },
      {
        titleLocal: 'Οἰκοδόμει τὴν ὑποδομὴν ὄπισθεν τῆς ὁδοῦ',
        intro: [
          'Ἐνταῦθα γίγνεται ἡ διαφορὰ ἔργου εὐτυχοῦς καὶ θέσεως διὰ παντὸς μορφούσης.',
          'Οἱ κράτιστοι πρόδρομοι ἐν τῷ ἰδίῳ ἔργῳ οὐ παύονται.',
          'Κτίζουσι· Κανόνας.<br />Ὑποδομάς.<br />Δίκτυα.<br />Ἀγοράς.<br />Οἰκοσυστήματα.<br />Βάθρα.',
          'Ἄλλοι ἔπειτα ἄρχονται <strong>ἐπὶ τῷ ἐκείνων θεμελίῳ οἰκοδομεῖν.</strong>',
        ],
        history: [
          'Ὁ <strong>Ῥοκφέλλερ</strong> οὐ μόνον καθαρτήρια ᾠκοδόμησεν, ἀλλὰ ὅλον σύστημα βιομηχανικὸν περὶ τὸ ἔλαιον.',
          'Ἡ <strong>Tesla</strong> οὐ μόνον αὐτοκίνητα ἠλεκτρικὰ παρεσκεύασεν, ἀλλ’ ἅμα χρήματα εἰς σταθμοὺς φορτίσεως, τέχνην στοιχείων, προγράμματα, ἐνέργειαν κατέθηκεν.',
          'Ἡ <strong>Apple</strong> ἐκ τοῦ iPhone τέλος σὺν τῷ App Store, τοῖς δημιουργοῖς, ταῖς ὑπηρεσίαις, τοῖς παραρτήμασιν ὅλον οἰκοσύστημα ἐποίησεν.',
        ],
        today: [
          'Καὶ ἐν τῇ τεχνητῇ νοήσει ἡ κυρία ἐρώτησίς ποτε οὐκέτι ἔσται· <strong>«Ποῖον ἔργον τεχνητῆς νοήσεως οἰκοδομοῦμεν;»</strong>',
          'Ἀλλά· <strong>«Ποίαν ὑποδομὴν κτίσαι δυνάμεθα, ἐφ’ ᾗ ἄλλοι τὰ ἑαυτῶν ἔργα, τὰς ἑταιρείας, τοὺς τρόπους τῆς ἐργασίας οἰκοδομήσουσιν;»</strong>',
        ],
      },
    ]),
    cycleTitle: 'The Pioneer Cycle',
    cycleIntro:
      'Αἱ πέντε ἀρχαὶ οὐ χάρτην ἄκαμπτον ποιοῦσιν· κύκλον ποιοῦσιν·',
    cycleQuestions: [
      'Τί νῦν πρῶτον δυνατόν;',
      'Τίνα ὅρον τούτῳ διαρρήξομεν;',
      'Πῶς γίγνεται ἐξ αὐτοῦ τι, ᾧ οἱ ἄνθρωποι ὄντως χρήσονται;',
      'Πῶς ἐξ αὐτοῦ μέγα τι γίγνεται;',
      'Πῶς κτίζομέν τι, ἐφ’ ᾧ ἄλλοι οἰκοδομήσουσιν;',
    ],
    cycleOutro: 'Καὶ ἐντεῦθεν αὖθις καινὴ <strong>ἐσχατιὰ</strong> γίγνεται.',
    coreTitle: 'The Core Idea',
    coreBody: [
      'Σχεδὸν πᾶς ἔμπορος παράδειγμα ἐμπορίας ὑπάρχον βέλτιον ἐκτελεῖν δύναται.',
      'Οἱ πρόδρομοι ἄλλο τι ποιοῦσιν.',
      'Τοὺς ὅρους τοῦ δυνατοῦ μετακινοῦσιν.',
    ],
    coreCredo: credo,
    coreClosing: [
      'Αὗται αἱ <strong>Principles of Pioneers</strong>.',
      'Οὐ κανόνες, πῶς ὁδῷ γνωστῇ ἑπτέον — ἀλλ’ ἀρχαί, πῶς ὁδοὶ καιναὶ γίγνονται.',
    ],
  },
};
