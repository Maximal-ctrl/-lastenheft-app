/*
 * Vorlagen und Bausteine für Elektronik-Pflichtenhefte.
 *
 * Das Pflichtenheft ist die Antwort des Auftragnehmers (AN) auf das Lastenheft des Auftraggebers (AG):
 * Es beschreibt, WIE und WOMIT die Anforderungen umgesetzt werden (DIN 69901-5, VDI 2519).
 * Die Gliederungen orientieren sich an:
 *  - VDI 2519 Blatt 1/2 (Lasten-/Pflichtenheft) und DIN 69901-5
 *  - verbreiteten Pflichtenheft-Vorlagen (Bezug auf Titel/Version/Datum des Lastenhefts, Änderungsverlauf,
 *    Aufgabenverständnis, Lösungsüberblick, Systemarchitektur, Umsetzungsmatrix mit Verweis auf die
 *    Anforderungs-ID, Abnahmekriterien, Termine, Risiken, Ressourcen, Freigabe durch den AG)
 *  - der klassischen Gliederung Zielbestimmung (Muss-/Wunsch-/Abgrenzungskriterien), Produkteinsatz,
 *    Produktumgebung (Hardware, Software, Schnittstellen), Produktleistungen
 *  - typischen Inhalten eines Hardware-Entwurfs (Versorgungskonzept, Schutzbeschaltung, Lagenaufbau,
 *    Verlustleistungsbilanz, EMV-Konzept, Prüfplan, Bauteilrisiken)
 * Alle Werte in [eckigen Klammern] sind Platzhalter bzw. Beispielwerte.
 */
(function () {
  'use strict';

  const { ph, field, h, p, ul, note, pagebreak, table, param, history, tocBlock, milestones, abbreviations } = window.LH_HELPERS;

  const TRACE_HEAD = ['LH-ID', 'Anforderung (Lastenheft)', 'Prio.', 'Umsetzung / Lösung', 'Erfüllung', 'Nachweis'];

  /** Umsetzungsmatrix: groups = [{ title, rows: [[lhId, text, prio, umsetzung, erfuellung, nachweis]] }] */
  function trace(groups) {
    const th = TRACE_HEAD.map((c) => `<th>${c}</th>`).join('');
    let body = '';
    for (const g of groups) {
      if (g.title) body += `<tr class="grp"><td colspan="${TRACE_HEAD.length}">${g.title}</td></tr>`;
      for (const r of g.rows) body += `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    }
    return `<table class="trace"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
  }
  const openRow = (id, text, prio, nachweis) => [id, text, prio, ph('Lösung beschreiben'), ph('offen'), nachweis];

  const coverPH = () => `<div class="cover">
<p class="cover-kind">PFLICHTENHEFT</p>
<p class="doc-title">${field('titel')}</p>
<p class="cover-sub">${field('projekt')}</p>
${table(['Merkmal', 'Angabe'], [
    ['Dokumentnummer', field('dokNr')],
    ['Version', field('version')],
    ['Datum', field('datum')],
    ['Status', field('status')],
    ['Bezug: Lastenheft', field('bezugLH')],
    ['Auftraggeber (AG)', field('auftraggeber')],
    ['Auftragnehmer (AN)', field('auftragnehmer')],
    ['Verfasser', field('autor')],
  ], 'meta')}
<p class="cover-note">Dieses Pflichtenheft wird nach Prüfung und Freigabe durch den Auftraggeber verbindliche Grundlage für Entwicklung, Lieferung und Abnahme.</p>
</div>${pagebreak}`;

  const front = () => coverPH() + history() + tocBlock();

  const fulfilLegend = () => p('Für jede Anforderung des Lastenhefts wird angegeben, wie sie umgesetzt wird und in welchem Umfang sie erfüllt ist:') +
    ul([
      '<b>erfüllt</b> – die Anforderung wird vollständig umgesetzt.',
      '<b>teilweise</b> – die Anforderung wird nur eingeschränkt umgesetzt; Einschränkung siehe Kapitel „Abweichungen“.',
      '<b>nicht erfüllt</b> – die Anforderung wird nicht umgesetzt; Begründung siehe Kapitel „Abweichungen“.',
      '<b>Abweichung</b> – die Anforderung wird anders als gefordert gelöst; Zustimmung des AG erforderlich.',
    ]) +
    p('Nachweisarten: <b>T</b> = Test/Messung, <b>A</b> = Analyse/Berechnung, <b>I</b> = Inspektion/Sichtprüfung, <b>D</b> = Demonstration.');

  const referenceTable = () => table(['Nr.', 'Dokument', 'Ausgabe / Version', 'Bemerkung'], [
    ['[1]', `Lastenheft ${field('bezugLH')}`, '', 'Grundlage dieses Pflichtenhefts'],
    ['[2]', `Angebot des AN Nr. ${ph('…')}`, ph('Datum'), ''],
    ['[3]', ph('Normen, Datenblätter, Qualitätssicherungsvereinbarung'), '', ''],
  ]);

  const traceIntro = () => p('Die folgende Umsetzungsmatrix ordnet jeder Anforderung des Lastenhefts die geplante Lösung, den Erfüllungsgrad und die Nachweisart zu. ' +
    'Über <b>Referenzen → Aus Lastenheft übernehmen</b> wird die Tabelle automatisch mit allen Anforderungen eines gespeicherten Lastenhefts gefüllt.');

  const sampleTrace = () => trace([
    { title: 'Funktionale Anforderungen', rows: [
      openRow('LH-FUN-001', `Das Gerät muss die Messgröße ${ph('Druck')} im Bereich ${ph('0 … 10 bar')} erfassen.`, 'Muss', 'T'),
      openRow('LH-FUN-002', `Messwertausgabe über ${ph('CAN')} mit mindestens ${ph('100 Hz')}.`, 'Muss', 'T'),
    ] },
    { title: 'Elektrische Anforderungen', rows: [
      ['LH-ELE-001', 'Dauerhafter Verpolschutz der Versorgung.', 'Muss', `Verpolschutz mit P-Kanal-MOSFET ${ph('Typ')}, siehe Kap. 5.1`, 'erfüllt', 'T'],
    ] },
  ]);

  const deviations = () => table(['LH-ID', 'Abweichung', 'Begründung', 'Auswirkung (Kosten / Termin)', 'Zustimmung AG'], [
    [ph('LH-…'), ph('Beschreibung der Abweichung'), ph('technischer / wirtschaftlicher Grund'), ph('…'), ph('offen / Datum, Name')],
  ], 'dev');

  const variants = () => table(['Kriterium', 'Gewichtung', `Variante A: ${ph('…')}`, `Variante B: ${ph('…')}`, `Variante C: ${ph('…')}`], [
    ['Herstellkosten', ph('30 %'), ph('…'), ph('…'), ph('…')],
    ['Erfüllung der Muss-Anforderungen', ph('30 %'), ph('…'), ph('…'), ph('…')],
    ['Entwicklungsaufwand / Risiko', ph('20 %'), ph('…'), ph('…'), ph('…')],
    ['Bauteilverfügbarkeit', ph('20 %'), ph('…'), ph('…'), ph('…')],
    ['<b>Bewertung (gewichtet)</b>', '100 %', ph('…'), ph('…'), ph('…')],
  ], 'variants') + p(`Entscheidung: ${ph('Variante … wegen …')}`);

  const powerBudget = () => table(['Baugruppe / Bauteil', 'Verlustleistung typ.', 'Verlustleistung max.', 'Bemerkung'], [
    [ph('Schaltregler 24 V → 5 V'), ph('0,35 W'), ph('0,6 W'), ph('η ≈ 90 %')],
    [ph('LDO 5 V → 3,3 V'), ph('0,15 W'), ph('0,25 W'), ''],
    [ph('Mikrocontroller'), ph('0,10 W'), ph('0,15 W'), ''],
    [ph('Schnittstellen / Treiber'), ph('0,10 W'), ph('0,30 W'), ''],
    ['<b>Summe</b>', ph('0,70 W'), ph('1,30 W'), ''],
  ], 'power') + p(`Erwartete Temperaturerhöhung im Gehäuse: ${ph('ΔT ≈ 15 K')} bei ${ph('1,3 W')} (${ph('Abschätzung / thermische Simulation')}).`);

  const criticalParts = () => table(['Bauteil', 'Hersteller / Typ', 'Lieferzeit', 'Lebenszyklus', 'Second Source'], [
    ['Mikrocontroller', ph('Hersteller, Typ'), ph('12 Wochen'), ph('aktiv, Langzeitprogramm 10 Jahre'), ph('pinkompatibler Typ / keine')],
    ['Schaltregler', ph('Hersteller, Typ'), ph('…'), ph('aktiv'), ph('…')],
    ['Steckverbinder', ph('Hersteller, Typ'), ph('…'), ph('aktiv'), ph('…')],
  ], 'parts');

  const testPlan = () => table(['Prüfung', 'Norm / Methode', 'Muster', 'Prüfort', 'Termin'], [
    ['Funktionstest, Kenndatenmessung', 'interne Prüfspezifikation', 'A-Muster', 'AN-Labor', ph('KW/Jahr')],
    ['EMV-Vorprüfung', 'EN IEC 61000-6-x (Auszug)', 'B-Muster', 'AN-Labor', ph('KW/Jahr')],
    ['EMV-Abnahmeprüfung', 'gemäß Lastenheft', 'C-Muster', ph('akkreditiertes Prüflabor'), ph('KW/Jahr')],
    ['Umweltprüfungen (Temperatur, Feuchte, Vibration, Schock)', 'IEC 60068-2-x', 'C-Muster', ph('…'), ph('KW/Jahr')],
    ['Produktsicherheit', ph('IEC 62368-1 / IEC 61010-1'), 'C-Muster', ph('…'), ph('KW/Jahr')],
    ['Lebensdauer / Belastungstest', ph('HALT / Dauerlauf'), 'C-Muster', 'AN-Labor', ph('KW/Jahr')],
  ], 'tests');

  const risks = () => table(['Risiko', 'Wahrscheinlichkeit', 'Auswirkung', 'Maßnahme', 'Verantwortlich'], [
    ['Lieferengpass bei Schlüsselbauteilen', ph('mittel'), ph('hoch'), 'Frühzeitige Bevorratung, Second Source vorsehen', ph('Name')],
    ['EMV-Grenzwerte werden nicht eingehalten', ph('mittel'), ph('hoch'), 'EMV-Vorprüfung am B-Muster, Filter-Optionen im Layout', ph('Name')],
    ['Zielkosten werden überschritten', ph('gering'), ph('mittel'), 'Kostenreview je Musterstand, Design-to-Cost', ph('Name')],
    ['Terminverzug durch Änderungen am Lastenheft', ph('mittel'), ph('mittel'), 'Änderungsmanagement mit Bewertung von Kosten/Termin', ph('Name')],
  ], 'risks');

  const workPackages = () => table(['AP', 'Inhalt', 'Aufwand (PT)', 'Verantwortlich'], [
    ['AP1', 'Konzept und Pflichtenheft', ph('10'), ph('Name')],
    ['AP2', 'Schaltplan und Bauteilauswahl', ph('20'), ph('Name')],
    ['AP3', 'Layout und Fertigungsdaten', ph('15'), ph('Name')],
    ['AP4', 'Firmware', ph('30'), ph('Name')],
    ['AP5', 'Inbetriebnahme, Verifikation, Prüfungen', ph('25'), ph('Name')],
    ['AP6', 'Dokumentation und Serienüberleitung', ph('10'), ph('Name')],
  ], 'wp');

  const costCalc = () => table(['Position', 'Kosten pro Stück', 'Bemerkung'], [
    ['Leiterplatte', `${ph('x,xx')} €`, ph('bei … Stk./Los')],
    ['Bauteile (BOM)', `${ph('x,xx')} €`, ''],
    ['Bestückung und Löten', `${ph('x,xx')} €`, ''],
    ['Prüfung (ICT / Funktionstest)', `${ph('x,xx')} €`, ''],
    ['Gehäuse und Montage', `${ph('x,xx')} €`, ''],
    ['<b>Herstellkosten gesamt</b>', `<b>${ph('xx,xx')} €</b>`, `Zielwert laut Lastenheft: ${ph('xx,xx')} €`],
  ], 'cost');

  const signoff = () => p('Mit der Unterschrift bestätigen AG und AN, dass dieses Pflichtenheft die vereinbarte Grundlage für Entwicklung, Lieferung und Abnahme ist. Änderungen erfolgen ausschließlich über das vereinbarte Änderungsmanagement.') +
    table(['Rolle', 'Name', 'Datum', 'Unterschrift'], [
      ['Auftraggeber (AG)', ph('Name'), '', ''],
      ['Auftragnehmer (AN)', ph('Name'), '', ''],
    ], 'sign');

  const deliverables = () => table(['Lieferobjekt', 'Format', 'Termin'], [
    ['Schaltplan', `PDF + Originaldaten (${ph('Altium / KiCad')})`, 'M2'],
    ['Fertigungsdaten (Gerber/ODB++, Bohr- und Bestückungsdaten)', 'ZIP', 'M3'],
    ['Stückliste (BOM) mit Hersteller-Teilenummern und Alternativen', 'XLSX', 'M3'],
    ['Firmware (Quellcode und Binärdatei)', ph('Git-Repository'), 'M4'],
    ['Prüfberichte (Funktion, EMV, Umwelt, Sicherheit)', 'PDF', 'M4'],
    ['Technische Dokumentation / Betriebsanleitung', 'PDF', 'M5'],
    ['Muster', ph('10 Stk. A-Muster, 30 Stk. B-Muster'), 'M2 / M3'],
  ]);

  /* ------------------------------------------------------------------ */
  /* Vorlage 1: Elektronik-Baugruppe vollständig                          */
  /* ------------------------------------------------------------------ */
  const elektronik = () => front() +
    h(1, '1 Einleitung') +
    h(2, '1.1 Zweck des Dokuments') +
    p(`Dieses Pflichtenheft beschreibt, wie der Auftragnehmer (AN) die im Lastenheft ${field('bezugLH')} festgelegten Anforderungen des Auftraggebers (AG) an die elektronische Baugruppe ${ph('Produktname')} umsetzt.`) +
    p('Während das Lastenheft beschreibt, <b>was</b> und <b>wofür</b> etwas zu realisieren ist, legt das Pflichtenheft fest, <b>wie</b> und <b>womit</b> die Anforderungen realisiert werden. Nach Freigabe durch den AG ist es verbindliche Grundlage für Entwicklung und Abnahme.') +
    h(2, '1.2 Erfüllungsgrad und Kennzeichnung') +
    fulfilLegend() +
    h(2, '1.3 Begriffe und Abkürzungen') +
    abbreviations() +
    h(2, '1.4 Mitgeltende Unterlagen') +
    referenceTable() +

    h(1, '2 Aufgabenverständnis') +
    h(2, '2.1 Ausgangssituation') +
    p(ph('Kurzfassung der Ausgangssituation aus Sicht des AN (Bezug: Lastenheft, Kapitel 2).')) +
    h(2, '2.2 Zielsetzung und Leistungsumfang des AN') +
    p(ph('Was liefert der AN? z. B. Entwicklung Hardware und Firmware, Muster, Qualifikation, Serienüberleitung.')) +
    h(2, '2.3 Abgrenzung') +
    p(`Nicht im Leistungsumfang des AN enthalten sind: ${ph('z. B. Gehäusewerkzeug, Zulassung außerhalb der EU, Serienfertigung')}.`) +

    h(1, '3 Lösungskonzept und Systemarchitektur') +
    h(2, '3.1 Lösungsüberblick') +
    p(ph('Grundidee der Lösung, eingesetzte Technologien und wesentliche Konzeptentscheidungen in wenigen Sätzen.')) +
    h(2, '3.2 Blockschaltbild') +
    p(ph('Fügen Sie hier über „Einfügen → Bild“ das Blockschaltbild der Lösung ein.')) +
    h(2, '3.3 Funktionsbeschreibung') +
    p(ph('Beschreibung der Funktionsblöcke und ihres Zusammenwirkens: Signalfluss, Betriebszustände, Anlauf- und Fehlerverhalten.')) +
    h(2, '3.4 Konzeptentscheidungen (Variantenvergleich)') +
    variants() +

    h(1, '4 Umsetzung der Anforderungen') +
    traceIntro() +
    sampleTrace() +

    h(1, '5 Hardware-Design') +
    h(2, '5.1 Spannungsversorgung') +
    table(['Versorgung', 'Erzeugung (Topologie / Baustein)', 'Spannung', 'Strom max.', 'Bemerkung'], [
      ['Eingangsschutz', `Verpolschutz ${ph('P-Kanal-MOSFET')}, TVS-Diode ${ph('Typ')}, Sicherung ${ph('…')}`, ph('18 … 30 V'), ph('…'), ''],
      ['5 V', `Abwärtswandler ${ph('Typ')}`, '5,0 V ± 2 %', ph('500 mA'), ph('η ≈ 90 %')],
      ['3,3 V', `LDO ${ph('Typ')}`, '3,3 V ± 2 %', ph('200 mA'), ''],
    ]) +
    h(2, '5.2 Mikrocontroller und Speicher') +
    table(['Merkmal', 'Auswahl / Auslegung'], [
      ['Mikrocontroller', ph('Hersteller, Typ, Kern, Takt')],
      ['Flash / RAM', ph('… KB / … KB, Reserve ≥ 30 %')],
      ['Externer Speicher', ph('z. B. EEPROM für Parameter')],
      ['Begründung', ph('Peripherie, Verfügbarkeit, Langzeitprogramm, Kosten')],
    ]) +
    h(2, '5.3 Realisierung der Schnittstellen') +
    table(['Schnittstelle', 'Baustein', 'Schutzbeschaltung', 'Steckverbinder'], [
      ['CAN', ph('Transceiver-Typ'), ph('ESD-Diode, Gleichtaktdrossel, Abschluss 120 Ω'), ph('M12, 5-polig, A-codiert')],
      ['RS-485', ph('Transceiver-Typ'), ph('TVS-Dioden, Fail-Safe-Biasing'), ph('…')],
      ['USB (Service)', ph('integriert im MCU'), ph('ESD-Schutz'), ph('USB-C')],
    ]) +
    h(2, '5.4 Analoge Signalverarbeitung') +
    p(ph('Eingangsbeschaltung, Filter, Referenzspannung, ADC-Auflösung und Fehlerbudget (Offset, Verstärkungsfehler, Drift, Rauschen).')) +
    h(2, '5.5 Schutzkonzept') +
    ul([
      `Verpolschutz: ${ph('P-Kanal-MOSFET, Verlustleistung < 0,1 W')}`,
      `Überspannung: ${ph('TVS-Diode, Klemmspannung … V')}`,
      `ESD an allen Steckverbindern: ${ph('Schutzdioden nach IEC 61000-4-2')}`,
      `Kurzschlussfeste Ausgänge: ${ph('High-Side-Schalter mit Strombegrenzung')}`,
    ]) +
    h(2, '5.6 Leiterplatte') +
    table(['Merkmal', 'Auslegung'], [
      ['Lagenaufbau', ph('4 Lagen: Signal / GND / Versorgung / Signal')],
      ['Material und Dicke', ph('FR-4, Tg 150 °C, 1,6 mm')],
      ['Min. Leiterbahnbreite / -abstand', ph('0,15 mm / 0,15 mm')],
      ['Oberfläche', ph('ENIG')],
      ['Abmessungen', ph('… × … mm')],
      ['Fertigungs- und Abnahmeklasse', `IPC-6012 / IPC-A-610 Klasse ${ph('2')}`],
    ]) +
    h(2, '5.7 Thermisches Konzept') +
    powerBudget() +
    h(2, '5.8 Mechanik und Gehäuse') +
    p(ph('Gehäusekonzept, Befestigung der Leiterplatte, Dichtung (Schutzart), Kennzeichnung.')) +

    h(1, '6 Firmware-Konzept') +
    h(2, '6.1 Architektur') +
    p(ph('Schichtenmodell (Treiber, Dienste, Applikation), Scheduler / RTOS, Speicheraufteilung.')) +
    h(2, '6.2 Bootloader und Update') +
    p(ph('Update-Weg, A/B-Image bzw. Rückfall auf das vorherige Image, Signaturprüfung.')) +
    h(2, '6.3 Diagnose und Fehlerbehandlung') +
    p(ph('Watchdog, Selbsttests, Fehlerspeicher, Verhalten bei Unterspannung.')) +
    h(2, '6.4 Informationssicherheit') +
    p(ph('Secure Boot, Schlüsselverwaltung, Schutz der Debug-Schnittstelle, Maßnahmen im Hinblick auf den Cyber Resilience Act.')) +

    h(1, '7 EMV- und Sicherheitskonzept') +
    h(2, '7.1 EMV-Maßnahmen') +
    ul([
      `Eingangsfilter: ${ph('Pi-Filter, Gleichtaktdrossel')}`,
      `Massekonzept: ${ph('durchgehende GND-Lage, Sternpunkt am Eingang')}`,
      `Layout: ${ph('kurze Schaltregler-Schleifen, Schirmung der Taktleitungen')}`,
      `Schnittstellen: ${ph('Schutz- und Filterbauteile direkt am Steckverbinder')}`,
    ]) +
    h(2, '7.2 Sicherheitskonzept') +
    p(ph('Isolationskonzept, Luft- und Kriechstrecken, Materialauswahl (UL 94 V-0), Schutzmaßnahmen.')) +
    h(2, '7.3 Konformitätsbewertung') +
    table(['Richtlinie', 'Vorgehen', 'Nachweis'], [
      ['EMV-Richtlinie 2014/30/EU', 'Prüfung nach harmonisierten Normen', 'Prüfbericht akkreditiertes Labor'],
      ['RoHS 2011/65/EU', 'Herstellererklärungen der Bauteile', 'Materialdeklaration'],
      [ph('weitere'), ph('…'), ph('…')],
    ]) +

    h(1, '8 Bauteile und Beschaffung') +
    p(`Die Bauteilauswahl erfolgt bevorzugt aus der Vorzugsliste ${ph('des AG / des AN')}. Für kritische Bauteile gilt:`) +
    criticalParts() +

    h(1, '9 Verifikation und Validierung') +
    h(2, '9.1 Prüfplan') +
    testPlan() +
    h(2, '9.2 Abnahmeprüfung') +
    p('Die Abnahme erfolgt anhand der Umsetzungsmatrix (Kapitel 4): Für jede Anforderung wird der Nachweis gemäß der angegebenen Nachweisart erbracht und dokumentiert.') +

    h(1, '10 Abweichungen vom Lastenheft') +
    p('Folgende Anforderungen werden nicht oder abweichend vom Lastenheft umgesetzt. Abweichungen werden erst mit schriftlicher Zustimmung des AG wirksam.') +
    deviations() +

    h(1, '11 Projektplan') +
    h(2, '11.1 Meilensteine') +
    milestones() +
    h(2, '11.2 Arbeitspakete und Ressourcen') +
    workPackages() +

    h(1, '12 Kosten') +
    h(2, '12.1 Herstellkostenkalkulation') +
    costCalc() +
    h(2, '12.2 Entwicklungskosten') +
    p(`Die Entwicklungskosten betragen ${ph('xx.xxx €')} gemäß Angebot ${ph('Nr.')}.`) +

    h(1, '13 Risiken') +
    risks() +

    h(1, '14 Lieferumfang und Dokumentation') +
    deliverables() +

    h(1, '15 Qualitätssicherung') +
    ul([
      `Qualitätsmanagementsystem nach ISO 9001 ${ph('bzw. IATF 16949 / ISO 13485')}`,
      'Design-Reviews zu jedem Musterstand (Schaltplan-, Layout- und Firmware-Review)',
      `Design-FMEA nach ${ph('AIAG-VDA')}`,
      `Erstmusterprüfung (${ph('VDA Band 2 / PPAP')}) vor Serienfreigabe`,
    ]) +

    h(1, '16 Freigabe') +
    signoff() +

    h(1, '17 Anhang') +
    p(ph('Schaltplan-Auszüge, Berechnungen, Datenblätter, Prüfspezifikationen …'));

  /* ------------------------------------------------------------------ */
  /* Vorlage 2: Kompakt (klassische Gliederung)                           */
  /* ------------------------------------------------------------------ */
  const kompakt = () => front() +
    h(1, '1 Einleitung') +
    h(2, '1.1 Zweck des Dokuments') +
    p(`Dieses Pflichtenheft beschreibt die Umsetzung der Anforderungen aus dem Lastenheft ${field('bezugLH')} durch den Auftragnehmer.`) +
    h(2, '1.2 Projektbeteiligte') +
    table(['Rolle', 'Name / Firma', 'Kontakt'], [
      ['Auftraggeber', field('auftraggeber'), ph('E-Mail / Telefon')],
      ['Auftragnehmer', field('auftragnehmer'), ph('E-Mail / Telefon')],
      ['Projektleitung AN', ph('Name'), ph('E-Mail / Telefon')],
    ]) +
    h(1, '2 Zielbestimmung') +
    h(2, '2.1 Musskriterien') +
    ul([ph('Unabdingbare Leistungen, die das Produkt erbringen muss')]) +
    h(2, '2.2 Wunschkriterien') +
    ul([ph('Wünschenswerte, nicht unabdingbare Leistungen')]) +
    h(2, '2.3 Abgrenzungskriterien') +
    ul([ph('Was das Produkt ausdrücklich nicht leistet')]) +
    h(1, '3 Produkteinsatz') +
    p(`Anwendungsbereich: ${ph('…')}; Zielgruppe: ${ph('…')}; Betriebsbedingungen: ${ph('Temperatur, Schutzart, Umgebung')}.`) +
    h(1, '4 Produktumgebung') +
    p(`Hardware: ${ph('…')}; Software / Firmware: ${ph('…')}; Schnittstellen: ${ph('…')}.`) +
    h(1, '5 Lösungskonzept') +
    p(ph('Lösungsüberblick, Systemarchitektur, wesentliche Komponenten.')) +
    h(1, '6 Umsetzung der Anforderungen') +
    fulfilLegend() +
    traceIntro() +
    trace([{ title: '', rows: [openRow(ph('LH-…'), ph('Anforderung aus dem Lastenheft'), 'Muss', 'T')] }]) +
    h(1, '7 Produktleistungen') +
    param([
      ['Versorgungsspannung', '', ph('…'), ph('…'), ph('…'), 'V'],
      ['Stromaufnahme', '', ph('…'), ph('…'), ph('…'), 'mA'],
    ]) +
    h(1, '8 Abweichungen vom Lastenheft') +
    deviations() +
    h(1, '9 Termine und Ressourcen') +
    milestones() +
    h(1, '10 Abnahme') +
    p(ph('Abnahmekriterien und Vorgehen bei der Abnahme.')) +
    h(1, '11 Freigabe') +
    signoff();

  /* ------------------------------------------------------------------ */
  /* Vorlage 3: Leiterplatte & Bestückung (Fertigungskonzept des EMS)     */
  /* ------------------------------------------------------------------ */
  const leiterplatte = () => front() +
    h(1, '1 Einleitung') +
    p(`Dieses Pflichtenheft beschreibt das Fertigungs- und Prüfkonzept des Auftragnehmers für die Baugruppe ${ph('Bezeichnung, Sachnummer, Revision')} auf Grundlage des Lastenhefts ${field('bezugLH')}.`) +
    fulfilLegend() +
    h(1, '2 Fertigungsstandort und Zertifizierungen') +
    table(['Merkmal', 'Angabe'], [
      ['Fertigungsstandort', ph('Ort, Land')],
      ['Zertifizierungen', ph('ISO 9001, IATF 16949, ISO 14001')],
      ['ESD-Schutzzone', 'nach IEC 61340-5-1'],
      ['Ausbildung Personal', `IPC-A-610 ${ph('CIS / CIT')}, J-STD-001`],
    ]) +
    h(1, '3 Prozessablauf') +
    `<ol>${['Wareneingangsprüfung und Einlagerung (MSL-gerecht)', 'Lotpastendruck mit 3D-Lotpasteninspektion (SPI)', 'SMD-Bestückung', 'Reflow-Löten (Stickstoff: ' + ph('ja/nein') + ')', 'Automatische optische Inspektion (AOI)', 'THT-Bestückung und ' + ph('Selektiv- / Wellenlöten'), 'Röntgenprüfung (BGA/QFN)', ph('In-Circuit-Test / Flying-Probe'), 'Firmware-Programmierung', 'Funktionstest', ph('Schutzlackierung und Lackinspektion'), 'Endkontrolle, Kennzeichnung, Verpackung'].map((s) => `<li>${s}</li>`).join('')}</ol>` +
    h(1, '4 Umsetzung der Anforderungen') +
    traceIntro() +
    trace([{ title: 'Bestückung und Lötung', rows: [
      ['LH-BST-002', 'Ausführung und Abnahme nach IPC-A-610 Klasse 2.', 'Muss', 'Abnahme nach IPC-A-610 Klasse 2, zertifiziertes Prüfpersonal', 'erfüllt', 'I'],
      openRow('LH-BST-004', 'Handhabung feuchteempfindlicher Bauteile nach J-STD-033.', 'Muss', 'I'),
    ] }]) +
    h(1, '5 Leiterplattenfertigung') +
    p(`Leiterplattenlieferant: ${ph('Name, Standort')}. Der Lagenaufbau wird vor Fertigungsbeginn zur Freigabe vorgelegt; bei impedanzkontrollierten Leiterplatten wird ein Impedanzprotokoll mitgeliefert.`) +
    h(1, '6 Prüfkonzept') +
    table(['Prüfschritt', 'Abdeckung', 'Prüfmittel', 'Dokumentation'], [
      ['SPI', '100 %', ph('3D-SPI'), 'Prozessdaten'],
      ['AOI', '100 %', ph('3D-AOI'), 'Fehlerprotokoll je Seriennummer'],
      [ph('ICT / Flying-Probe'), ph('… % Netzabdeckung'), ph('Adapter / Flying-Probe'), 'Prüfprotokoll'],
      ['Funktionstest', '100 %', ph('Prüfadapter durch AG / AN'), 'Prüfprotokoll je Seriennummer'],
      ['Röntgen', ph('Erstmuster + Stichprobe'), ph('2D/3D-Röntgen'), 'Bildarchiv'],
    ]) +
    h(1, '7 Materialwirtschaft und Rückverfolgbarkeit') +
    ul([
      'Beschaffung ausschließlich beim Hersteller oder autorisierten Distributoren',
      'Lagerung feuchteempfindlicher Bauteile in Trockenschränken, Floor-Life-Überwachung',
      `Rückverfolgbarkeit Seriennummer ↔ Bauteilcharge ↔ Prozessdaten für ${ph('10 Jahre')}`,
    ]) +
    h(1, '8 Qualitätssicherung') +
    ul([
      `Erstmusterprüfbericht (${ph('VDA Band 2 / PPAP')})`,
      'Reklamationsbearbeitung nach 8D-Methode',
      `Qualitätskennzahlen: ${ph('First-Pass-Yield, ppm')} – monatliches Reporting`,
    ]) +
    h(1, '9 Verpackung und Logistik') +
    p(`ESD-gerechte Verpackung, ${ph('Trockenverpackung')}, Lieferbedingung ${ph('Incoterms 2020 DAP')}.`) +
    h(1, '10 Abweichungen vom Lastenheft') +
    deviations() +
    h(1, '11 Kalkulation und Termine') +
    table(['Losgröße', 'Preis pro Stück', 'Lieferzeit'], [
      [ph('10 Stk. (Erstmuster)'), `${ph('…')} €`, ph('… Wochen')],
      [ph('100 Stk.'), `${ph('…')} €`, ph('… Wochen')],
      [ph('1.000 Stk.'), `${ph('…')} €`, ph('… Wochen')],
    ]) +
    h(1, '12 Freigabe') +
    signoff();

  /* ------------------------------------------------------------------ */
  /* Vorlage 4: Netzteil / Stromversorgung                                */
  /* ------------------------------------------------------------------ */
  const netzteil = () => front() +
    h(1, '1 Einleitung') +
    p(`Dieses Pflichtenheft beschreibt die technische Lösung für das ${ph('AC/DC-Netzteil / den DC/DC-Wandler')} gemäß Lastenheft ${field('bezugLH')}.`) +
    fulfilLegend() +
    h(1, '2 Lösungskonzept') +
    h(2, '2.1 Wahl der Topologie') +
    table(['Kriterium', ph('Sperrwandler (Flyback)'), ph('LLC-Resonanzwandler'), ph('Fertigmodul')], [
      ['Wirkungsgrad', ph('…'), ph('…'), ph('…')],
      ['Bauteilaufwand / Kosten', ph('…'), ph('…'), ph('…')],
      ['EMV-Verhalten', ph('…'), ph('…'), ph('…')],
      ['Entwicklungsrisiko', ph('…'), ph('…'), ph('…')],
    ]) +
    p(`Gewählte Topologie: ${ph('…')}, Begründung: ${ph('…')}.`) +
    h(2, '2.2 Blockschaltbild') +
    p(ph('Blockschaltbild über „Einfügen → Bild“ einfügen: Eingangsfilter – Gleichrichter/PFC – Leistungsstufe – Transformator – Gleichrichtung – Ausgangsfilter – Regelung.')) +
    h(1, '3 Schaltungsbeschreibung') +
    h(2, '3.1 Eingangsstufe') +
    p(ph('Sicherung, Varistor, EMV-Filter, Gleichrichter, Einschaltstrombegrenzung, PFC.')) +
    h(2, '3.2 Leistungsstufe und Transformator') +
    p(ph('Controller-Typ, Schaltfrequenz, Leistungshalbleiter, Transformator (Kern, Windungen, Isolationssystem).')) +
    h(2, '3.3 Ausgangsstufe und Regelung') +
    p(ph('Gleichrichtung (Synchrongleichrichter), Ausgangsfilter, Regelkreis und Kompensation, Optokoppler.')) +
    h(1, '4 Umsetzung der Anforderungen') +
    traceIntro() +
    trace([{ title: 'Ausgangskenndaten', rows: [
      openRow('LH-…', `Ausgangsspannung ${ph('24 V ± 2 %')}`, 'Muss', 'T'),
      openRow('LH-…', `Wirkungsgrad ≥ ${ph('90 %')} bei Nennlast`, 'Muss', 'T'),
    ] }]) +
    h(1, '5 Auslegung und Berechnungen') +
    h(2, '5.1 Verlustleistungsbilanz') +
    table(['Bauteil', 'Verlustleistung', 'Bemerkung'], [
      ['Gleichrichter', ph('… W'), ''],
      ['Leistungsschalter', ph('… W'), 'Leit- und Schaltverluste'],
      ['Transformator', ph('… W'), 'Kern- und Kupferverluste'],
      ['Ausgangsgleichrichter', ph('… W'), ''],
      ['<b>Summe</b>', ph('… W'), `Wirkungsgrad ≈ ${ph('… %')}`],
    ]) +
    h(2, '5.2 Lebensdauer der Elektrolytkondensatoren') +
    p(`Abschätzung nach der 10-K-Regel: L = L<sub>0</sub> · 2<sup>(T<sub>0</sub> − T)/10</sup> · ${ph('Ripple-Faktor')}. Ergebnis: ${ph('… h bei … °C')}.`) +
    h(1, '6 Realisierung der Schutzfunktionen') +
    table(['Funktion', 'Realisierung', 'Ansprechschwelle', 'Verhalten'], [
      ['Überspannung (OVP)', ph('…'), ph('… V'), ph('Abschaltung / Hiccup')],
      ['Überstrom / Kurzschluss', ph('…'), ph('… A'), ph('Hiccup, selbstständiger Wiederanlauf')],
      ['Übertemperatur (OTP)', ph('NTC am Kühlkörper'), ph('… °C'), ph('Abschaltung mit Hysterese')],
    ]) +
    h(1, '7 Isolation und Sicherheit') +
    table(['Isolationsstelle', 'Isolationsart', 'Luftstrecke', 'Kriechstrecke', 'Prüfspannung'], [
      ['Primär – Sekundär', 'verstärkt', ph('… mm'), ph('… mm'), ph('3 kV AC')],
      ['Primär – PE', 'Basis', ph('… mm'), ph('… mm'), ph('1,5 kV AC')],
    ]) +
    h(1, '8 EMV-Konzept') +
    p(ph('Filterauslegung, Snubber, Layout der Schaltknoten, Y-Kondensator, Schirmung.')) +
    h(1, '9 Thermik und Derating') +
    p(ph('Kühlkonzept, Temperaturmessungen an Hotspots, Derating-Kurve.')) +
    h(1, '10 Prüfplan') +
    testPlan() +
    h(1, '11 Abweichungen vom Lastenheft') +
    deviations() +
    h(1, '12 Freigabe') +
    signoff();

  /* ------------------------------------------------------------------ */
  /* Vorlage 5: Leeres Grundgerüst                                        */
  /* ------------------------------------------------------------------ */
  const leer = () => front() +
    h(1, '1 Einleitung') + p('') +
    h(1, '2 Lösungskonzept') + p('') +
    h(1, '3 Umsetzung der Anforderungen') +
    traceIntro() +
    trace([{ title: '', rows: [openRow(ph('LH-…'), ph('Anforderung aus dem Lastenheft'), 'Muss', 'T')] }]) +
    h(1, '4 Abweichungen vom Lastenheft') + deviations() +
    h(1, '5 Freigabe') + signoff();

  const TEMPLATES = [
    { id: 'ph-elektronik', icon: 'tplElec', name: 'Elektronik-Baugruppe (vollständig)', title: 'Pflichtenheft Elektronik-Baugruppe',
      desc: 'Lösungskonzept, Umsetzungsmatrix, Hardware-Design, Firmware, EMV-/Sicherheitskonzept, Prüfplan, Kosten, Risiken, Freigabe.', build: elektronik },
    { id: 'ph-kompakt', icon: 'tplShort', name: 'Kompakt (allgemein)', title: 'Pflichtenheft',
      desc: 'Klassische Gliederung: Zielbestimmung (Muss/Wunsch/Abgrenzung), Produkteinsatz, Produktumgebung, Umsetzung, Abnahme.', build: kompakt },
    { id: 'ph-leiterplatte', icon: 'tplPcb', name: 'Leiterplatte & Bestückung (EMS)', title: 'Pflichtenheft Fertigung',
      desc: 'Fertigungs- und Prüfkonzept des Fertigers: Prozessablauf, Prüfabdeckung, Rückverfolgbarkeit, Qualität, Kalkulation.', build: leiterplatte },
    { id: 'ph-netzteil', icon: 'tplPsu', name: 'Netzteil / Stromversorgung', title: 'Pflichtenheft Netzteil',
      desc: 'Topologie-Auswahl, Schaltungsbeschreibung, Verlustleistung, Elko-Lebensdauer, Schutzfunktionen, Isolationskoordination.', build: netzteil },
    { id: 'ph-leer', icon: 'tplEmpty', name: 'Leeres Grundgerüst', title: 'Pflichtenheft',
      desc: 'Deckblatt, Änderungshistorie, Inhaltsverzeichnis, Umsetzungsmatrix, Abweichungen und Freigabe.', build: leer },
  ];

  const SNIPPETS = {
    cover: { name: 'Deckblatt', build: coverPH },
    history: { name: 'Änderungshistorie', build: history },
    trace: { name: 'Umsetzungsmatrix', build: () => trace([{ title: '', rows: [openRow(ph('LH-…'), ph('Anforderung aus dem Lastenheft'), 'Muss', 'T')] }]) + '<p><br></p>' },
    legend: { name: 'Erfüllungsgrad-Legende', build: fulfilLegend },
    deviations: { name: 'Abweichungen', build: () => deviations() + '<p><br></p>' },
    variants: { name: 'Variantenvergleich', build: variants },
    power: { name: 'Verlustleistungsbilanz', build: powerBudget },
    parts: { name: 'Kritische Bauteile', build: () => criticalParts() + '<p><br></p>' },
    tests: { name: 'Prüfplan', build: () => testPlan() + '<p><br></p>' },
    risks: { name: 'Risikoanalyse', build: () => risks() + '<p><br></p>' },
    milestones: { name: 'Meilensteinplan', build: () => milestones() + '<p><br></p>' },
    workpackages: { name: 'Arbeitspakete', build: () => workPackages() + '<p><br></p>' },
    cost: { name: 'Herstellkosten', build: () => costCalc() + '<p><br></p>' },
    signoff: { name: 'Freigabe / Unterschriften', build: signoff },
    abbr: { name: 'Abkürzungsverzeichnis', build: () => abbreviations() + '<p><br></p>' },
    param: { name: 'Kenndaten (Min/Typ/Max)', build: () => param([[ph('Parameter'), ph('Bedingung'), '', '', '', ph('Einheit')]]) + '<p><br></p>' },
    note: { name: 'Hinweisbox', build: () => note('<b>Hinweis:</b> ' + ph('Text')) + '<p><br></p>' },
  };

  window.PH_TEMPLATES = TEMPLATES;
  window.PH_SNIPPETS = SNIPPETS;
  window.PH_TRACE = trace;
  window.PH_TRACE_COLS = TRACE_HEAD.length;
})();
