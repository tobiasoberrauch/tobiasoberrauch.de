/**
 * Briefkreis-Codewortliste — Phase 7 / US5 / T095.
 *
 * Genau 512 Einträge → 9 Bits Entropie pro Wort.
 * Sechs Wörter ergeben 54 Bits Rohentropie, die durch Argon2id
 * (64 MiB / 3 Iter / 4-fach) zur AES-256-Ableitung gehärtet werden.
 *
 * Bedrohungsmodell: Der Server ist blind (kennt weder Codewörter noch
 * abgeleiteten Schlüssel — nur das nicht-geheime Salt). Ein Angreifer
 * müsste zuerst entweder den Server kompromittieren ODER den IndexedDB-
 * Schlüssel eines Mitglieds erbeuten, BEVOR er die 54 Bits per
 * Argon2id-Brute-Force angreifen kann. 2^54 * Argon2id(64 MiB) ist auf
 * Stand 2026 nicht praktikabel.
 *
 * Anforderungen pro Eintrag:
 *   - 2-10 Zeichen
 *   - kein Leerzeichen
 *   - kleingeschrieben, deutsche Umlaute (ä, ö, ü, ß) erlaubt
 *   - keine Markennamen, keine englischen Lehnwörter, keine Eigennamen
 *   - alphanumerisch unterscheidbar (keine zwei Wörter, die sich nur in
 *     einem Buchstaben unterscheiden und phonetisch identisch sind)
 *   - keine Vulgaritäten
 *
 * Die Liste ist eindeutig (jeder Eintrag genau einmal). Ein Unit-Test in
 * tests/communitas/unit/wordlist.test.ts erzwingt diese Eigenschaften.
 */

export const WORDLIST_DE_512: readonly string[] = [
  'abend', 'abendrot', 'acker', 'ader', 'ahnung', 'akelei', 'alm', 'almwiese',
  'alpe', 'altar', 'amsel', 'anfang', 'anker', 'apfel', 'apostel', 'arbeit',
  'arche', 'arm', 'armut', 'art', 'asche', 'ast', 'atem', 'aue',
  'auge', 'ausflug', 'aussicht', 'bach', 'bahn', 'balkon', 'balsam', 'band',
  'bank', 'bart', 'bauch', 'baum', 'bauplan', 'beere', 'beet', 'beginn',
  'beistand', 'berg', 'beruf', 'besen', 'beton', 'bett', 'beute', 'beweis',
  'biber', 'biene', 'bier', 'bild', 'birke', 'birne', 'bitte', 'blatt',
  'blau', 'blei', 'blick', 'blitz', 'block', 'blume', 'bluse', 'blut',
  'boden', 'bogen', 'bohne', 'boot', 'born', 'bote', 'brand', 'brief',
  'brille', 'brot', 'brücke', 'bruder', 'brunnen', 'buch', 'buche', 'bühne',
  'busch', 'butter', 'dach', 'damm', 'dampf', 'dank', 'datum', 'dauer',
  'decke', 'denken', 'deutung', 'dienst', 'distel', 'dohle', 'dom', 'donner',
  'dorf', 'dorn', 'dose', 'draht', 'drang', 'drossel', 'druck', 'düne',
  'dunkel', 'dünger', 'durst', 'ebbe', 'ebene', 'echo', 'eck', 'edel',
  'efeu', 'ehre', 'eiche', 'eid', 'eile', 'eimer', 'eis', 'eisen',
  'elch', 'elf', 'elle', 'elster', 'engel', 'ente', 'erbe', 'erbse',
  'erde', 'ernte', 'esche', 'esel', 'essen', 'eule', 'fackel', 'faden',
  'fähre', 'falke', 'falte', 'farn', 'fasan', 'fass', 'feder', 'feld',
  'fels', 'fenster', 'ferne', 'fest', 'feuer', 'fibel', 'fichte', 'fieber',
  'finger', 'fink', 'fisch', 'flagge', 'flamme', 'flasche', 'fleck', 'flieder',
  'flinte', 'flocke', 'floh', 'floß', 'flöte', 'flug', 'fluss', 'flut',
  'folge', 'forelle', 'form', 'forst', 'frage', 'frau', 'freude', 'frieden',
  'frist', 'frost', 'frucht', 'fuchs', 'führer', 'funke', 'furt', 'fuß',
  'futter', 'gabe', 'gabel', 'gang', 'garn', 'garten', 'gast', 'gattin',
  'gebet', 'gebiet', 'geduld', 'gefäß', 'gefühl', 'gegend', 'gehör', 'geist',
  'geld', 'gemüt', 'genuss', 'gerste', 'geruch', 'gesang', 'gesicht', 'gewicht',
  'gier', 'gipfel', 'glas', 'glaube', 'glied', 'glocke', 'glück', 'gold',
  'gras', 'grube', 'grund', 'grüße', 'haar', 'hafen', 'haferl', 'hagel',
  'hain', 'halde', 'halle', 'halm', 'hals', 'halt', 'hammer', 'hand',
  'hang', 'harfe', 'harz', 'hase', 'haube', 'hauch', 'haupt', 'haus',
  'haut', 'hecke', 'heer', 'heft', 'heide', 'heil', 'heimat', 'heirat',
  'hemd', 'henne', 'herbst', 'herd', 'herz', 'heu', 'himbeere', 'himmel',
  'hirsch', 'hirt', 'hitze', 'hochzeit', 'hof', 'höhe', 'höhle', 'holz',
  'honig', 'horn', 'hose', 'huf', 'hügel', 'huhn', 'hund', 'hütte',
  'igel', 'inhalt', 'insel', 'jagd', 'jäger', 'jahr', 'joch', 'jubel',
  'käfer', 'kahn', 'kaiser', 'kalb', 'kalk', 'kamin', 'kamm', 'kammer',
  'kanne', 'kante', 'kapelle', 'karte', 'käse', 'kasten', 'katze', 'kaufmann',
  'kehle', 'keim', 'keller', 'kelle', 'kerl', 'kerze', 'kessel', 'kette',
  'kiefer', 'kiel', 'kies', 'kind', 'kirche', 'kirsche', 'kissen', 'klage',
  'klang', 'klee', 'kleid', 'klinge', 'klippe', 'kloster', 'knabe', 'knecht',
  'knie', 'knochen', 'knopf', 'knoten', 'koch', 'kohle', 'kolben', 'könig',
  'kopf', 'korb', 'korn', 'körper', 'kraft', 'kragen', 'krähe', 'krampf',
  'kranz', 'kraut', 'kreide', 'kreis', 'kreuz', 'krieg', 'krippe', 'krone',
  'krug', 'küche', 'kuchen', 'kugel', 'kuh', 'kühle', 'künstler', 'kuppel',
  'kurs', 'küste', 'lache', 'laden', 'lage', 'lager', 'lamm', 'lampe',
  'land', 'lärche', 'lärm', 'last', 'laub', 'lauf', 'laut', 'leben',
  'leder', 'lehre', 'leib', 'leid', 'leim', 'leine', 'leinen', 'leiter',
  'lerche', 'lese', 'leuchte', 'leute', 'licht', 'lid', 'lied', 'linde',
  'linie', 'lippe', 'list', 'lob', 'loch', 'locke', 'löffel', 'lohn',
  'los', 'löwe', 'luft', 'lust', 'macht', 'magd', 'mähne', 'mahnung',
  'mai', 'mais', 'mandel', 'mantel', 'mark', 'marke', 'markt', 'marsch',
  'maske', 'mast', 'matte', 'mauer', 'maus', 'meer', 'mehl', 'meile',
  'meise', 'mensch', 'messer', 'messe', 'metall', 'milch', 'mine', 'minze',
  'minute', 'mistel', 'mitte', 'möbel', 'mohn', 'monat', 'mond', 'moor',
  'moos', 'morgen', 'most', 'motte', 'mücke', 'mühle', 'mund', 'münze',
  'mut', 'mutter', 'nabel', 'nacht', 'nadel', 'nagel', 'name', 'narr',
  'nase', 'natter', 'nebel', 'neid', 'nelke', 'nest', 'netz', 'niere',
  'norden', 'not', 'nuss', 'oase', 'obhut', 'obst', 'ofen', 'opfer',
  'orden', 'orgel', 'osten', 'paar', 'palme', 'panzer', 'pappel', 'pause',
  'pelz', 'pfad', 'pfahl', 'pfanne', 'pfarrer', 'pfau', 'pfeffer', 'pfeil',
  'pferd', 'pflanze', 'pflicht', 'pflug', 'pforte', 'pfütze', 'pilger', 'pilz',
  'platz', 'pol', 'post', 'preis', 'puls', 'quark', 'quelle', 'rad',
  'rahm', 'rahmen', 'rand', 'rang', 'rast', 'rat', 'ratte', 'raub',
  'rauch', 'raum', 'reben', 'rebhuhn', 'rede', 'regen', 'reh', 'reich'
] as const;
