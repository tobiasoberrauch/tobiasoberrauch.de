# Feature Specification: Communitas Cotidiana

**Feature Branch**: `001-communitas-cotidiana`
**Created**: 2026-05-20
**Status**: Draft
**Input**: User description (Gründungsschrift Communitas Cotidiana, Teil A–J, Vorrede, Nachwort)

## Overview

Communitas Cotidiana ist eine philosophisch-kontemplative Versammlung unter der Marke „Tobias Oberrauch — Architect of Understanding". Diese Spezifikation beschreibt die digitalen Berührungspunkte der Versammlung auf `tobiasoberrauch.de`: die öffentliche Schwelle (Landing-Seite mit Manifest), das Aufnahmeverfahren (Brief an sich selbst, Aufnahmegespräch), die tägliche Lieferarchitektur (drei E-Mail-Anker), die geschlossenen Räume (Schreibraum, Briefkreis-Zuteilung, monatliche Stille Versammlung), die Mitgliedsstufen mit Zahlung (Basis €960/Jahr, Voll €3.600/Jahr, Inner Circle €18.000/Jahr), sowie die strukturellen Schutzmaßnahmen gegen Personenkult, Esoterik-Konnotation, und Verwechslung mit Therapie.

Die Implementierung folgt der Tonlage der Versammlung: ruhig, schlicht, ohne Sales-Funnel-Logik, ohne Tracking-Drang, ohne Gamification. Was nicht im Strategiepapier ausdrücklich vorkommt, ist nicht im Produkt.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Die ruhige Tür (Priority: P1)

Eine interessierte Person liest auf einer schlichten Seite das Manifest und ein kleines Wörterbuch, versteht, *wer* hier was anbietet und für *wen* es nicht der richtige Ort ist, und kann mit einem schlichten Formular eine Bewerbung einreichen — bestehend aus E-Mail, Name, einer Frage (nicht: einem Erfolgsbericht), und einem Brief an sich selbst, der ungeöffnet bleibt bis zum Jahrestag.

**Why this priority**: Ohne diese Tür gibt es keine Versammlung. Sie ist das erste und einzige *Muss* der ersten neunzig Tage. Sie definiert den Ton, an dem alles weitere gemessen wird.

**Independent Test**: Die Seite kann allein deployed werden. Ein Besucher kann sie lesen, das Formular ausfüllen, eine Bestätigungs-E-Mail erhalten — das ist ein vollständiger Wertfluss. Auch wenn nichts weiteres folgt, ist die Schwelle gebaut.

**Acceptance Scenarios**:

1. **Given** ein Besucher kennt die Communitas nicht, **When** er die Landing-Seite aufruft, **Then** liest er innerhalb von zwei Minuten Stille die Kern-Botschaft (drei Absätze), kann das Manifest in voller Länge einsehen, und versteht, dass dies keine Therapie, keine Religion, keine Schule ist.
2. **Given** ein Besucher will sich bewerben, **When** er das Aufnahmeformular ausfüllt (Name, E-Mail, kurze Frage statt Lebenslauf, freiwilliger „Brief an sich selbst"), **Then** erhält er eine sachliche Bestätigung per E-Mail mit einem Hinweis, dass sich Tobias oder ein Begleiter innerhalb von vierzehn Tagen meldet.
3. **Given** ein Besucher sucht aggressive Coaching-Sprache, **When** er die Seite durchblättert, **Then** findet er keine Coaching-Vokabeln, keine Testimonials, keine Logos, keine „Ergebnisse"-Versprechen, keine LinkedIn-Abzeichen, keine sichtbaren Tracker.
4. **Given** ein Mensch in akuter Krise erkennt sich in der Sprache wieder, **When** er die Seite liest, **Then** findet er einen klaren, sichtbaren Hinweis, dass die Communitas keine Therapie ersetzt, mit konkreten Anlaufstellen.

---

### User Story 2 — Das tägliche Cotidianum (Priority: P2)

Ein aufgenommenes Mitglied erhält an den vereinbarten Tagen drei stille E-Mail-Anker: die Morgensammlung (eine Frage, drei bis sieben Sätze), das Mittagsinnehalten (eine kurze Audiospur, Mo/Mi/Fr; Di/Do bewusst Stille), und den Abendrückblick (drei gleichbleibende Fragen). Keine Push-Benachrichtigung. Keine Streaks. Keine Algorithmen.

**Why this priority**: Das Cotidianum ist die *Substanz* der Versammlung. Ohne tägliche Wiederkehr fällt die These der Communitas auseinander — sie heißt *cotidiana*, weil sie täglich ist.

**Independent Test**: E-Mail-Versand lässt sich isoliert testen. Bei einem einzigen Test-Mitglied können alle drei Anker über sieben Tage versendet werden — mit korrekter Wochenfärbung (Mo Spiegel, Di Stille, Mi Spur, Do Begegnung, Fr Versöhnung, Sa Werk, So Sammlung). Erfolg ist, dass sieben Tage hintereinander die richtigen Mails zur richtigen Stunde mit dem richtigen Inhalt eintreffen.

**Acceptance Scenarios**:

1. **Given** ein Mitglied ist aufgenommen, **When** der Morgen anbricht (lokal zwischen 6:00 und 8:00), **Then** erhält es eine schlichte Mail (Schwarz auf Weiß, kein Logo, kein Bild, kein Knopf) mit einer Frage und optional einem Vers aus der Tradition, nicht länger als sechs Zeilen.
2. **Given** es ist Dienstag oder Donnerstag, **When** Mittag wird, **Then** erhält das Mitglied bewusst *keine* Mittagsmail — Stille gehört zur Architektur.
3. **Given** ein Mitglied öffnet drei Monate lang keine Mail und nimmt an keiner Versammlung teil, **When** das System dies erkennt, **Then** verschickt es nicht eine Mahnung, sondern eine sanfte Wiederfrage von Tobias oder einem Begleiter im Wortlaut: „Wir denken an dich. Wenn du gehen willst, gehe in Frieden. Wenn du bleiben willst, bist du da."
4. **Given** ein Mitglied befindet sich in der Schale *Silentium*, **When** die Mittagsspur ausgespielt wird, **Then** wird kuratiert ein anderer Track ausgewählt als für ein Mitglied in *Vox* — die Spur folgt der Schale.

---

### User Story 3 — Die Schwelle der Verbindlichkeit (Priority: P2)

Ein aufgenommenes Mitglied entscheidet sich für eine Stufe — Basis (€960/Jahr), Voll (€3.600/Jahr), oder Inner Circle (€18.000/Jahr nach gesondertem Aufnahmegespräch) — und zahlt einmal jährlich. Die Zahlungsabwicklung ist ruhig und schlicht: ein einziges Formular, keine Upsells, keine Rabattcodes, keine Knappheitssprache. Der Eintrittsritus (Brief an sich selbst) ist Voraussetzung für die Zahlungsfreigabe; ohne Brief keine Verbindlichkeit.

**Why this priority**: Ohne Geldfluss keine Räume, keine Begleiter-Zeit, keine Reisen. Die Stufe markiert die Verbindlichkeit — sie ist der ethische, nicht der wirtschaftliche Hebel.

**Independent Test**: Der Zahlungsfluss lässt sich isoliert testen: aufgenommenes Mitglied → wählt Stufe → bezahlt → erhält bestätigende E-Mail mit einer einzigen Zeile („Du bist da. Willkommen.") und einer Erinnerung an die monatliche Erneuerung beim Vollmond-Brief.

**Acceptance Scenarios**:

1. **Given** ein aufgenommenes Mitglied wählt eine Stufe, **When** es zur Zahlung weitergeleitet wird, **Then** sieht es ein Formular mit Preis, Stufenbeschreibung und einer einzigen „Bezahlen"-Schaltfläche — keine Upsells, keine Cross-Sells, keine Vergleichstabellen mit Häkchen.
2. **Given** ein Mitglied der Voll-Stufe möchte an einer Wende-Reise teilnehmen, **When** es bucht, **Then** wird der Selbstkostenanteil (€1.800–€3.200) transparent ausgewiesen, ohne dass die Mitgliedschaft selbst neu verkauft wird.
3. **Given** das Jahresende naht, **When** die Mitgliedschaft sich automatisch erneuert, **Then** erhält das Mitglied eine sachliche Erinnerung vier Wochen vorher mit der einen Zeile am Ende: „Bleibe ich? Gehe ich?" — und kann mit einem einzigen Klick gehen.
4. **Given** ein Mitglied beantragt ein stilles Stipendium (12 pro Jahr, im November), **When** der Brief eingereicht wird, **Then** läuft ein anonymer Vergabeprozess: Empfänger weiß nicht, wer bezahlt; Bezahler weiß nicht, wer empfängt.

---

### User Story 4 — Die Zelle (Priority: P3)

Ein Mitglied der Voll-Stufe und höher hat Zugang zu einem privaten, geschlossenen Schreibraum — keinem Forum, sondern einer Zelle. Niemand außer dem Schreibenden liest jemals den Inhalt. Es gibt keine Likes, keine Sichtbarkeit für andere, keinen Algorithmus, keine Profile.

**Why this priority**: Ohne den geschlossenen Schreibraum verliert der Abendrückblick seine Tiefe — die Übung wird zur bloßen Mail. Aber er ist nicht überlebenswichtig in den ersten 90 Tagen; ein Notiz-PDF tut es kurzfristig.

**Independent Test**: Schreibraum lässt sich nach Login testen — Mitglied schreibt Eintrag, schließt, kommt am nächsten Tag wieder, sieht den Eintrag, kann ihn weiterbearbeiten. Niemand sonst sieht ihn — auch Tobias und Begleiter nicht.

**Acceptance Scenarios**:

1. **Given** ein Voll-Mitglied ist eingeloggt, **When** es auf die Zelle zugreift, **Then** sieht es seine bisherigen Einträge chronologisch, kann einen neuen Eintrag verfassen, und niemand außer ihm selbst hat technisch Zugriff.
2. **Given** ein Mitglied verlässt die Communitas, **When** der Account geschlossen wird, **Then** werden die Zelleninhalte dem Mitglied als Archiv ausgeliefert und im System unwiderruflich gelöscht.
3. **Given** Tobias oder ein Begleiter möchte aus Neugier den Inhalt einsehen, **When** der Versuch unternommen wird, **Then** ist es technisch nicht möglich — die Verschlüsselung folgt der ethischen Architektur, nicht der Versuchung des Administrators.

---

### User Story 5 — Der Briefkreis (Priority: P3)

Drei bis fünf Mitglieder werden von Tobias oder einem Begleiter nach dem Aufnahmegespräch zu einem Briefkreis zugeordnet. Jeder im Kreis schreibt einmal pro Monat einen Brief an die anderen — per internes verschlüsseltes Postsystem oder per echte Post. Die Zuordnung folgt Gegenseitigkeit, nicht Status.

**Why this priority**: Briefkreise sind das Rückgrat der „Begegnung ohne Maske". Ohne sie bleibt Communitas Einzelpraxis. Aber sie können kurzfristig per E-Mail-Verteiler manuell organisiert werden, bis Automatisierung Sinn ergibt.

**Independent Test**: Ein Begleiter kann manuell drei Mitglieder einander zuordnen, Einführungs-Brief schreiben, Verteiler erstellen — funktioniert ohne Code. Die Spec verlangt nur, dass das System bei Skalierung die Zuordnung als sortierbare Datenstruktur kennt.

**Acceptance Scenarios**:

1. **Given** ein neues Voll-Mitglied hat ein Aufnahmegespräch hinter sich, **When** Tobias oder ein Begleiter es einem Kreis zuteilt, **Then** erhalten alle Kreismitglieder eine Einführungs-E-Mail mit Vornamen und einer einzigen Frage, die der Kreis als ersten Anker teilt.
2. **Given** ein Kreis besteht seit einem Jahr, **When** ein Mitglied geht oder ein neues hinzukommt, **Then** wird die Veränderung still kommuniziert, ohne öffentliche Ankündigung, ohne „Welcome back"-Animationen.

---

### Edge Cases

- **Akute Krise**: Ein Mitglied schreibt in einem Aufnahmebrief oder Abendeintrag Worte, die auf akute Suizidalität oder Psychose hinweisen. Das System darf den Inhalt der Zelle NICHT scannen oder weiterleiten (Vertraulichkeit ist absolut). Aber: die öffentliche Seite und die Bestätigungs-E-Mail enthalten eine sichtbare Liste konkreter Anlaufstellen (Telefonseelsorge, Notruf, regional). Das ist die einzige akzeptable Grenze.
- **Mehrfach-Bewerbung**: Eine Person bewirbt sich dreimal. Das System erkennt die E-Mail-Adresse und reicht die neueste Bewerbung an Tobias weiter — ohne dem Bewerber zu zeigen, dass die früheren noch in der Warteschleife sind.
- **Schweigepflicht-Bruch**: Ein Inner-Circle-Mitglied verletzt die Schweigepflicht. Tobias entscheidet manuell über Ausschluss — die Plattform stellt nur eine schlichte „Mitglied entfernen"-Funktion zur Verfügung; sie führt keinen Streit, keine Anhörung, keine Eskalation.
- **Gerichtliche Auflage**: Eine Person bewirbt sich, weil ein Gericht es auferlegt hat. Die Aufnahmegespräch-Frage „Was ist deine Frage?" filtert dies in der Regel aus — die Plattform unterstützt das, indem sie keine externe Verifikations-Schnittstelle (BG-Bescheinigung etc.) anbietet.
- **Zahlungsstörung**: Eine SEPA-Rückbuchung passiert. Das Mitglied wird einmal angeschrieben (eine Mail, sachlich, ohne Drohung). Bleibt die Zahlung aus, ruht die Mitgliedschaft — keine Inkasso-Eskalation, kein automatisierter Mahnlauf.
- **Sprachwahl beim Newsletter**: Site ist viersprachig (LA/DE/EN/GRC). Cotidianum erscheint zunächst nur auf Deutsch, da Tobias und die Begleiter die Texte ausschließlich auf Deutsch verfassen. Bewerber aus EN-/LA-/GRC-Locale sehen das auf der Anmeldeseite klar markiert.
- **Reise-Ausfall**: Eine Wende-Reise wird abgesagt (Kloster Müstair gesperrt). Mitglieder erhalten keine standardisierte Erstattungsmail, sondern einen persönlichen Brief von Tobias mit Alternative oder Stille.

## Requirements *(mandatory)*

### Functional Requirements

**Öffentliche Schwelle (Landing-Seite):**

- **FR-001**: Das System MUSS eine öffentlich zugängliche Landing-Seite unter `/communitas/` (DE) bereitstellen, die in den ersten drei Absätzen das Wesentliche transportiert — wer Communitas ist, wer sie nicht ist, was die einzige Verpflichtung ist (Wiederkehr).
- **FR-002**: Die Seite MUSS das vollständige Manifest (Teil H1, ca. 14 Absätze) im Fließtext darstellen, lesbar als zusammenhängender Brief, nicht zerlegt in Abschnitts-Karten.
- **FR-003**: Die Seite MUSS das Wörterbuch der Communitas (Teil H2, ca. 50 Begriffe) als reine Liste darstellen — alphabetisch, ohne Suchfunktion, ohne Filter.
- **FR-004**: Die Seite DARF NICHT enthalten: Testimonials, „X Mitglieder bereits dabei"-Zähler, Trust-Badges, Logos früherer Auftraggeber, „Limited Spots"-Hinweise, Affiliate-Tracking, Conversion-Pixel jeder Art (Meta, LinkedIn, Google Ads).
- **FR-005**: Die Seite MUSS einen sichtbaren, ruhig formulierten Abschnitt mit Anlaufstellen (Telefonseelsorge 0800-111-0-111 und 0800-111-0-222, Hausarzt, Therapeutensuche) enthalten — nicht versteckt, sondern als selbstverständlicher Teil der Schwelle.

**Aufnahmeverfahren:**

- **FR-006**: Das System MUSS ein einziges Aufnahmeformular bereitstellen mit nur diesen Feldern: Name (Pflicht), E-Mail (Pflicht), Frage (Freitext, Pflicht, max. 2.000 Zeichen), Brief an sich selbst (Freitext, freiwillig, max. 10.000 Zeichen, wird nicht von Begleitern gelesen).
- **FR-007**: Das System MUSS nach Absenden eine sachliche Bestätigung per E-Mail innerhalb von 5 Minuten zustellen — Wortlaut sinngemäß: „Deine Bewerbung ist eingegangen. Tobias oder ein Begleiter meldet sich innerhalb von vierzehn Tagen."
- **FR-008**: Das System MUSS eingegangene Bewerbungen in einer einfachen, von Tobias und drei Begleitern einsehbaren Liste sammeln. Es DARF NICHT automatisch Bewerbungen ranken, scoren, sortieren nach „Qualität", oder ML-Modelle auf den Antworttext anwenden.
- **FR-009**: Der „Brief an sich selbst" MUSS verschlüsselt und mit einem Stichtag (Jahrestag plus ein Jahr) gespeichert werden. Am Stichtag SOLL er automatisch ungelesen an die E-Mail-Adresse des Bewerbers zurückgesendet werden.

**Tägliche Lieferarchitektur (Cotidianum):**

- **FR-010**: Das System MUSS aufgenommenen, zahlenden Mitgliedern täglich zwischen 6:00 und 8:00 Uhr (Mitgliedszeitzone) eine Morgensammlungs-Mail mit einer Tagesfrage zustellen — Format: reines HTML/Text ohne Bilder, ohne Logo, ohne Tracking-Pixel, ohne Web-Beacon.
- **FR-011**: Das System MUSS am Montag, Mittwoch und Freitag zwischen 12:00 und 14:00 Uhr eine Mittagsinnehalten-Mail mit Link zu einer kurzen Audiospur (5–8 Minuten) zustellen. Dienstag und Donnerstag werden bewusst übersprungen.
- **FR-012**: Das System MUSS täglich ab 21:00 Uhr (Mitgliedszeitzone) eine Abendrückblicks-Mail mit den drei gleichbleibenden Fragen zustellen.
- **FR-013**: Mailinhalte MÜSSEN nach der inneren Schale des Mitglieds variieren können (Speculum, Silentium, Rota, Velum, Logos, Vox, Vestigium) — Tobias und Begleiter kuratieren die Track-Liste pro Schale.
- **FR-014**: Das System DARF NICHT versenden: Push-Benachrichtigungen, SMS, Calendar-Invites, Reminders im klassischen Sinn. Alle Lieferung erfolgt ausschließlich per E-Mail (und vier Mal jährlich per Papierbrief).
- **FR-015**: Das System MUSS „Streak"-Zähler, „X Tage in Folge"-Statistiken, Gamification-Elemente jeder Art ausschließen — auch intern. Es zählt nicht. Es wartet.

**Wenden-Briefe (Papier):**

- **FR-016**: Das System MUSS viermal jährlich (rund um die Solstizien und Äquinoktien) Adressen und Anschreibe-Templates für den Versand handgesetzter Papierbriefe an Voll- und Inner-Circle-Mitglieder generieren — Druck und Versand erfolgen extern, das System liefert nur die Datengrundlage.

**Mitgliedsstufen und Zahlung:**

- **FR-017**: Das System MUSS drei Stufen unterstützen: Basis (€960/Jahr, €80/Monat), Voll (€3.600/Jahr, €300/Monat), Inner Circle (€18.000/Jahr, ausschließlich nach gesondertem Aufnahmegespräch). NORDSTERN-Stufen (€22.500 / €75.000 / €180.000+) sind eigene Produkte und schließen Voll-Mitgliedschaft ein.
- **FR-018**: Das System MUSS Zahlung via SEPA-Lastschrift und Kreditkarte unterstützen (Standard EU-Markt). Es DARF NICHT „Buy Now Pay Later", Krypto-Zahlung, oder „Sponsor a Friend"-Schemata anbieten.
- **FR-019**: Das System MUSS die monatliche Erneuerungsfrage („Bleibe ich? Gehe ich?") am Ende jedes Vollmond-Briefes mit einem einzigen Ein-Klick-Abmelde-Link versehen — keine Retention-Flow, keine „Are you sure?"-Modale.
- **FR-020**: Das System MUSS jährlich 5 % der Inner-Circle- und NORDSTERN-Beiträge in einen Stipendien-Topf umleiten, aus dem zwölf stille Stipendien pro November vergeben werden. Vergabe ist anonym auf beiden Seiten.

**Schalen-Verwaltung:**

- **FR-021**: Das System MUSS pro Mitglied die aktuell „vordere" Schale (eine von sieben) speichern können — verändert nur durch Begleiter, niemals automatisch durch Algorithmus.
- **FR-022**: Beim Schalen-Übergang (Schwellenritus) MUSS das System einen drei- bis siebentägigen Innehalte-Modus aktivieren können, in dem das Mitglied nur eine reduzierte tägliche Anker-Spur erhält und der Begleiter einen schriftlichen Übergangsbrief verschickt.

**Geschlossener Schreibraum (Zelle):**

- **FR-023**: Das System MUSS jedem Voll- und Inner-Circle-Mitglied einen privaten Schreibraum bereitstellen — Einträge sind clientseitig verschlüsselt und nur mit dem Mitglieds-Passwort entschlüsselbar; serverseitig sind sie nicht lesbar (auch nicht durch Tobias oder Begleiter).
- **FR-024**: Der Schreibraum DARF NICHT enthalten: Likes, Reaktionen, öffentliche Profile, Follower, „Most Active"-Listen, Aktivitäts-Indikatoren („Maria schreibt gerade"), oder irgendeine Form sozialer Sichtbarkeit.
- **FR-025**: Bei Mitgliedsaustritt MUSS das System die Zelleninhalte als Markdown-Archiv exportieren und an das Mitglied versenden, anschließend serverseitig unwiderruflich löschen.

**Briefkreise:**

- **FR-026**: Das System MUSS Briefkreise als manuelle Zuordnung (3–5 Mitglieder) abbilden, mit interner verschlüsselter Nachrichtenverbreitung an die Kreismitglieder. Tobias und Begleiter erstellen Kreise; das System empfiehlt nicht automatisch.

**Versammlungen:**

- **FR-027**: Das System MUSS für die monatliche Stille Versammlung (erster Donnerstag) und Lese-Versammlung (dritter Sonntag) einen einfachen Anmeldevorgang bereitstellen — Mitglieder klicken einmal „Ich komme", erhalten Video-Link. Kein Chat, kein Aufzeichnungs-Button, keine Q&A-Funktion.
- **FR-028**: Das System MUSS aufgezeichnete Sessions ausschließen — Stille Versammlung wird nicht aufgenommen, Lese-Versammlung wird nicht aufgenommen, keine Replays.

**Anti-Personenkult-Strukturen:**

- **FR-029**: Die Sonntags-Essays und Vollmond-Briefe MÜSSEN technisch das Verfassen durch mindestens vier verschiedene Stimmen unterstützen (Tobias plus drei Begleiter). Das System darf NICHT eine „Tobias only"-Voreinstellung haben.
- **FR-030**: Das System DARF KEIN Modul für „Tobias-Zitate als Sharing-Karten", „Author-Highlights" oder „Most Quoted"-Anzeigen enthalten.

**Reisen:**

- **FR-031**: Das System MUSS vier Wende-Reisen pro Jahr (Frühling/Sommer/Herbst/Winter) und gelegentliche Pilgerreisen als Veranstaltungen mit begrenzter Teilnehmerzahl (max. 8–12) abbilden, mit transparenter Preisstruktur je nach Mitgliedsstufe (Inner Circle inkludiert, Voll mit Selbstkostenanteil, Basis voller Selbstkostenpreis).

### Key Entities

- **Mitglied**: Eine Person mit aktiver Stufe. Attribute: Name (Vorname genügt für die meisten Interaktionen), E-Mail, Stufe, aktuelle Schale, Briefkreis-Zugehörigkeit, Eintrittsdatum, vordere Sprache (DE bis auf weiteres).
- **Bewerbung**: Eine eingereichte Anfrage. Attribute: Name, E-Mail, Frage-Freitext, verschlüsselter „Brief an sich selbst", Eingangsdatum, Status (eingegangen, im Gespräch, aufgenommen, abgelehnt, ruhend).
- **Schale**: Einer von sieben inneren Räumen. Attribute: lateinischer Name, deutsche Bezeichnung, innere Frage, typische Übungen, kuratierte Track-Liste.
- **Briefkreis**: Eine Gruppe von 3–5 Mitgliedern. Attribute: erstelltes Datum, Mitglieder, einleitende Frage.
- **Anker** (Cotidianum-Element): Eine einzelne tägliche Mail oder Audiospur. Attribute: Typ (Morgen/Mittag/Abend), Wochentag, Inhalt, Zielschale (alle oder spezifisch).
- **Vollmond-Brief**: Monatlicher Langtext. Attribute: Verfasser (Tobias oder Begleiter), Datum, Inhalt.
- **Reise**: Eine Wende- oder Pilgerreise. Attribute: Termin, Ort, max. Teilnehmer, inkludiert für (Inner Circle / NORDSTERN / Voll mit Aufpreis / Basis Selbstkosten).
- **Stipendium**: Eine stille Voll-Mitgliedschaft, vergeben im November. Attribute: Empfänger (anonym), Geber-Topf (anonym), Bewilligungsdatum.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In den ersten 90 Tagen nach Launch der Landing-Seite werden mindestens 40 zahlende Mitglieder (Basis + Voll kombiniert) gewonnen, entsprechend einer realistisch gerechneten Jahresumsatzbasis von rund €80.000 für die Communitas.
- **SC-002**: Jede eingehende Bewerbung erhält innerhalb von 14 Kalendertagen eine persönliche Rückmeldung (Gespräch, Brief, oder respektvolle Absage).
- **SC-003**: 95 % der täglichen Anker-Mails (Morgen, Mittag, Abend) werden zur richtigen Stunde an aktive Mitglieder zugestellt; technische Ausfälle führen zu höchstens einer Verzögerung von 24 Stunden, nicht zu Dopplungen.
- **SC-004**: Mitglieder, die drei Monate vollständig schweigen, erhalten eine sanfte Wiederfrage in der definierten Wortform innerhalb von sieben Tagen nach dem Schweigemarker; das System erzeugt keine Reminder, Mahnungen oder Re-Engagement-Sequenzen.
- **SC-005**: Die Landing-Seite erreicht in unabhängigen Lesbarkeits-Stichproben (drei externe Leser, akademisch und nicht-akademisch) ein einheitliches Verständnis dessen, was Communitas ist und was sie nicht ist, innerhalb der ersten drei Absätze.
- **SC-006**: Über das erste Jahr hinweg gibt es keine dokumentierten Vorfälle, bei denen die Plattform Daten von Mitgliedern (Zelleneinträge, Briefe, Inhalte interner Versammlungen) an Tobias, Begleiter oder Dritte zugänglich gemacht hat — auch nicht auf Anfrage.
- **SC-007**: Im November-Vergabezyklus für die zwölf stillen Stipendien bleiben Geber und Empfänger nachweislich anonym; keine Seite kann die andere identifizieren.
- **SC-008**: Über das gesamte erste Jahr hinweg werden keine externen Marketing-Tracker (Meta-Pixel, LinkedIn-Insight, Google Ads Conversion) auf der Landing-Seite oder im Mitgliedsbereich aktiviert. Bestehende eigene Analytik (Vercel Analytics, optional OpenPanel) bleibt auf aggregiertes Seiten-Zählen beschränkt und blendet alle Mitglieds-Routen aus.

## Assumptions

- **Primärsprache Deutsch**: Cotidianum-Inhalte, Manifest und Wörterbuch erscheinen zunächst nur auf Deutsch, weil Tobias und Begleiter ausschließlich auf Deutsch verfassen. Die viersprachige Site (LA/DE/EN/GRC) verlinkt zur deutschen Communitas-Seite mit einem sichtbaren Sprachhinweis; spätere Übersetzungen bleiben für eine zweite Phase.
- **Aufnahme manuell**: Jede Bewerbung wird von Tobias oder einem Begleiter persönlich gelesen und beantwortet. Es existiert keine automatische Annahme oder algorithmische Vorauswahl.
- **Zahlungsabwicklung**: Standardanbieter aus dem EU-Markt (z. B. Stripe, Mollie) mit SEPA + Kreditkarte. Konkrete Auswahl in Implementierungsphase; die Plattformwahl muss DSGVO-konform und ohne aggressive Default-Tracker konfigurierbar sein.
- **Hosting und Stack**: Erweiterung der bestehenden `tobiasoberrauch.de` (Astro auf Vercel). Mitgliedsbereich und Zahlung können entweder integriert (eigene Routen) oder über eine zugekaufte Membership-Plattform (z. B. Memberful, Outseta) erfolgen — die Architektur muss die ethischen Grenzen (keine Tracker, keine sozialen Vergleichselemente, vollständige Datenlöschung beim Austritt) durchsetzen können.
- **Cotidianum-Versand**: Bestehende Resend-Audiences-Integration der Site kann als technische Grundlage dienen, muss aber für die drei-täglich-Anker-Logik (Zeitzone, Wochentag-Pattern, Schalen-Variation) erweitert werden.
- **Audio-Hosting**: Mittagsspuren werden als statische MP3 auf der Site gehostet (`/media/cotidianum/...`) oder über privaten S3-Bucket, ohne externes Audio-Tracking (keine Spotify-/Apple-Embeds).
- **Verschlüsselung der Zelle**: Client-seitige Verschlüsselung mit Mitglied-Passphrase als Schlüssel-Quelle. Das Mitglied versteht, dass Passwort-Verlust = Datenverlust ist; das ist eine ausdrückliche Konsequenz der Architektur und keine Schwäche.
- **Inner-Circle-Zugang**: Erst nach gesondertem 90–120-minütigem Aufnahmegespräch mit Tobias; das System kann das nicht automatisieren. Inner-Circle-Bewerbung läuft über das normale Formular mit zusätzlicher Markierung.
- **NORDSTERN-Integration**: NORDSTERN existiert als eigene Produktlinie. Die Communitas-Plattform muss die Inklusion einer Voll-Mitgliedschaft im NORDSTERN-Paket abbilden, ohne separates Cross-Sell.
- **Reisen-Logistik außerhalb der Plattform**: Buchung von Klosterzimmern, Camino-Routenführung, Versicherung etc. erfolgen extern (Marina Caratsch für Müstair etc.); die Plattform zeigt nur Termin, Teilnehmerstand, Beschreibung und Anmeldung.
