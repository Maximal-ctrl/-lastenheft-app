/*
 * Vorlagen und Bausteine für Elektronik-Lastenhefte.
 *
 * Die Gliederungen orientieren sich an:
 *  - VDI 2519 Blatt 1/2 (Vorgehensweise bei der Erstellung von Lasten-/Pflichtenheften):
 *    Einführung, Ist-Zustand, Soll-Zustand, Schnittstellen, Systemtechnik, Inbetriebnahme,
 *    Qualität, Projektabwicklung
 *  - DIN 69901-5 (Projektmanagement – Begriffe: Lastenheft = Gesamtheit der Forderungen des AG)
 *  - typischen Kenngrößen aus Datenblättern/Spezifikationen der Elektronik
 *    (Versorgung, EMV nach EN/IEC 61000, Umwelt nach IEC 60068, Schutzart nach EN 60529,
 *    Fertigung nach IPC-A-610 / J-STD-001)
 * Alle Werte in [eckigen Klammern] sind Platzhalter bzw. Beispielwerte.
 */
(function () {
  'use strict';

  const ph = (t) => `<span class="ph">[${t}]</span>`;
  const field = (f) => `<span class="field" data-field="${f}" contenteditable="false"></span>`;
  const h = (lvl, text) => `<h${lvl}>${text}</h${lvl}>`;
  const p = (html) => `<p>${html}</p>`;
  const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  const note = (html) => `<div class="note"><p>${html}</p></div>`;
  const pagebreak = '<hr class="page-break">';

  function table(head, rows, cls = '') {
    const th = head.map((c) => `<th>${c}</th>`).join('');
    const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<table${cls ? ` class="${cls}"` : ''}><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
  }

  /** Anforderungstabelle: rows = [text, prio, nachweis, bemerkung?] – IDs werden vergeben */
  function req(prefix, rows) {
    return table(
      ['ID', 'Anforderung', 'Prio.', 'Nachweis', 'Bemerkung'],
      rows.map((r, i) => [`LH-${prefix}-${String(i + 1).padStart(3, '0')}`, r[0], r[1], r[2], r[3] || '']),
      'req'
    );
  }

  /** Kenndatentabelle Min/Typ/Max */
  const param = (rows) => table(['Parameter', 'Bedingung', 'Min.', 'Typ.', 'Max.', 'Einheit'], rows, 'param');

  const cover = (kind = 'LASTENHEFT') => `<div class="cover">
<p class="cover-kind">${kind}</p>
<p class="doc-title">${field('titel')}</p>
<p class="cover-sub">${field('projekt')}</p>
${table(['Merkmal', 'Angabe'], [
    ['Dokumentnummer', field('dokNr')],
    ['Version', field('version')],
    ['Datum', field('datum')],
    ['Status', field('status')],
    ['Auftraggeber (AG)', field('auftraggeber')],
    ['Verfasser', field('autor')],
  ], 'meta')}
<p class="cover-note">Dieses Dokument ist vertraulich und nur für den internen Gebrauch sowie für die vom Auftraggeber benannten Empfänger bestimmt.</p>
</div>${pagebreak}`;

  const history = () => `<h1 class="nonum">Änderungshistorie</h1>
${table(['Version', 'Datum', 'Autor', 'Änderung', 'Status'], [
    ['0.1', ph('TT.MM.JJJJ'), ph('Name'), 'Erstellung des Dokuments', 'Entwurf'],
    ['', '', '', '', ''],
  ], 'history')}`;

  const tocBlock = () => `<h1 class="nonum">Inhaltsverzeichnis</h1><div class="toc" contenteditable="false"></div>${pagebreak}`;

  const front = (kind) => cover(kind) + history() + tocBlock();

  const prioLegend = () => p('Jede Anforderung ist eindeutig gekennzeichnet (ID) und mit einer Priorität sowie einer Nachweisart versehen:') +
    ul([
      '<b>Muss</b> – zwingend zu erfüllen; eine Nichterfüllung führt zur Ablehnung der Abnahme.',
      '<b>Soll</b> – zu erfüllen; Abweichungen sind zu begründen und mit dem AG abzustimmen.',
      '<b>Kann</b> – wünschenswert; optional bzw. nach Aufwand/Preis zu bewerten.',
    ]) +
    p('Nachweisarten: <b>T</b> = Test/Messung, <b>A</b> = Analyse/Berechnung, <b>I</b> = Inspektion/Sichtprüfung, <b>D</b> = Demonstration.');

  const abbreviations = () => table(['Abkürzung', 'Bedeutung'], [
    ['AG / AN', 'Auftraggeber / Auftragnehmer'],
    ['BOM', 'Bill of Materials (Stückliste)'],
    ['DUT', 'Device under Test (Prüfling)'],
    ['EMV', 'Elektromagnetische Verträglichkeit'],
    ['ESD', 'Electrostatic Discharge (elektrostatische Entladung)'],
    ['LP / PCB', 'Leiterplatte / Printed Circuit Board'],
    ['PCBA', 'Bestückte Leiterplatte (Baugruppe)'],
    ['MTBF', 'Mean Time Between Failures'],
    ['SOP', 'Start of Production (Serienstart)'],
  ], 'abbr');

  const envTable = () => table(['Merkmal', 'Anforderung', 'Norm / Prüfung'], [
    ['Betriebstemperatur', ph('−25 … +70 °C'), 'IEC 60068-2-1 / -2-2'],
    ['Lagertemperatur', ph('−40 … +85 °C'), 'IEC 60068-2-1 / -2-2'],
    ['Temperaturwechsel', ph('100 Zyklen, −40 … +85 °C'), 'IEC 60068-2-14'],
    ['Relative Luftfeuchte', ph('5 … 95 %, nicht kondensierend'), 'IEC 60068-2-78 / -2-30'],
    ['Schutzart', ph('IP65'), 'DIN EN 60529'],
    ['Vibration (sinusförmig)', ph('10 … 150 Hz, 2 g'), 'IEC 60068-2-6'],
    ['Schock', ph('30 g, 11 ms, Halbsinus'), 'IEC 60068-2-27'],
    ['Einsatzhöhe', `bis ${ph('2000')} m über NN`, '–'],
    ['Verschmutzungsgrad', ph('2'), 'IEC 60664-1'],
    ['Salznebel (optional)', ph('nicht gefordert'), 'IEC 60068-2-52'],
  ], 'env');

  const emcTable = () => table(['Prüfung', 'Norm', 'Prüfschärfe', 'Kriterium'], [
    ['Störaussendung', 'EN IEC 61000-6-3 (Wohnbereich) / EN IEC 61000-6-4 (Industrie)', ph('Klasse B'), '–'],
    ['Störfestigkeit (Fachgrundnorm)', 'EN IEC 61000-6-1 (Wohnbereich) / EN IEC 61000-6-2 (Industrie)', '–', '–'],
    ['Elektrostatische Entladung (ESD)', 'IEC 61000-4-2', ph('±4 kV Kontakt / ±8 kV Luft'), 'B'],
    ['Gestrahlte HF-Felder', 'IEC 61000-4-3', ph('10 V/m, 80 MHz … 6 GHz'), 'A'],
    ['Schnelle Transienten (Burst)', 'IEC 61000-4-4', ph('±2 kV'), 'B'],
    ['Stoßspannungen (Surge)', 'IEC 61000-4-5', ph('±1 kV'), 'B'],
    ['Leitungsgeführte HF', 'IEC 61000-4-6', ph('10 V, 150 kHz … 80 MHz'), 'A'],
    ['Magnetfelder (50 Hz)', 'IEC 61000-4-8', ph('30 A/m'), 'A'],
    ['Spannungseinbrüche / Unterbrechungen', 'IEC 61000-4-11 (AC) / IEC 61000-4-29 (DC)', ph('gemäß Norm'), 'B/C'],
  ], 'emc');

  const emcCriteria = () => p('Bewertungskriterien: <b>A</b> = keine Beeinträchtigung während und nach der Prüfung; <b>B</b> = vorübergehende Beeinträchtigung mit selbstständiger Erholung; <b>C</b> = vorübergehender Funktionsverlust, Benutzereingriff/Neustart zulässig.');

  const directives = () => table(['Richtlinie / Verordnung', 'Bezeichnung', 'Anwendbar'], [
    ['2014/30/EU', 'EMV-Richtlinie', ph('ja')],
    ['2014/35/EU', 'Niederspannungsrichtlinie (50–1000 V AC / 75–1500 V DC)', ph('nein')],
    ['2014/53/EU', 'Funkanlagenrichtlinie (RED)', ph('nein')],
    ['2011/65/EU + (EU) 2015/863', 'RoHS – Beschränkung gefährlicher Stoffe', 'ja'],
    ['(EG) 1907/2006', 'REACH', 'ja'],
    ['2012/19/EU', 'WEEE – Elektro- und Elektronik-Altgeräte', ph('ja')],
    ['(EU) 2024/2847', 'Cyber Resilience Act (Produkte mit digitalen Elementen)', ph('prüfen')],
  ], 'norms');

  const milestones = () => table(['Meilenstein', 'Inhalt', 'Termin'], [
    ['M1 Pflichtenheft', 'Freigabe des Pflichtenhefts durch den AG', ph('KW/Jahr')],
    ['M2 A-Muster', 'Funktionsmuster (Labormuster), Nachweis der Grundfunktionen', ph('KW/Jahr')],
    ['M3 B-Muster', 'Seriennahes Muster, EMV-Vorprüfung, Umweltvorprüfung', ph('KW/Jahr')],
    ['M4 C-Muster', 'Muster aus Serienwerkzeugen, Qualifikation, Zulassungen', ph('KW/Jahr')],
    ['M5 Serienfreigabe (SOP)', 'Erstmusterprüfung, Freigabe der Serienfertigung', ph('KW/Jahr')],
  ], 'milestones');

  /* ------------------------------------------------------------------ */
  /* Vorlage 1: Elektronik-Baugruppe vollständig                          */
  /* ------------------------------------------------------------------ */
  const elektronik = () => front('LASTENHEFT') +
    h(1, '1 Einleitung') +
    h(2, '1.1 Zweck des Dokuments') +
    p(`Dieses Lastenheft beschreibt die Gesamtheit der Anforderungen des Auftraggebers (AG) an die Lieferungen und Leistungen für die Entwicklung der elektronischen Baugruppe ${ph('Produktname')}. Es bildet die Grundlage für die Angebotserstellung und für das vom Auftragnehmer (AN) zu erstellende Pflichtenheft.`) +
    p('Das Lastenheft beschreibt, <b>was</b> und <b>wofür</b> etwas zu realisieren ist – nicht <b>wie</b>. Die technische Lösung beschreibt der AN im Pflichtenheft.') +
    h(2, '1.2 Geltungsbereich') +
    p(`Dieses Dokument gilt für ${ph('Produkt / Varianten / Hardware-Revisionen')}.`) +
    h(2, '1.3 Kennzeichnung der Anforderungen') +
    prioLegend() +
    h(2, '1.4 Begriffe und Abkürzungen') +
    abbreviations() +
    h(2, '1.5 Mitgeltende Unterlagen') +
    table(['Nr.', 'Dokument', 'Ausgabe / Version', 'Bemerkung'], [
      ['[1]', 'Pflichtenheft des AN', 'zu erstellen', ''],
      ['[2]', ph('System-Lastenheft / Kundenspezifikation'), '', ''],
      ['[3]', ph('Qualitätssicherungsvereinbarung'), '', ''],
    ]) +

    h(1, '2 Ausgangssituation (Ist-Zustand)') +
    h(2, '2.1 Ausgangslage') +
    p(ph('Beschreiben Sie die derzeitige Situation: vorhandenes Produkt bzw. Vorgängergerät, eingesetzte Technik, bekannte Probleme und Schwachstellen.')) +
    h(2, '2.2 Motivation') +
    p(ph('Warum wird die Neuentwicklung benötigt? z. B. Abkündigung von Bauteilen, Kostenreduktion, neue Funktionen, geänderte Normen.')) +

    h(1, '3 Zielsetzung (Soll-Zustand)') +
    h(2, '3.1 Produktbeschreibung') +
    p(ph('Kurzbeschreibung des zu entwickelnden Geräts bzw. der Baugruppe und seiner Hauptaufgabe.')) +
    h(2, '3.2 Einsatzbereich und Zielmarkt') +
    ul([
      `Einsatzumgebung: ${ph('Industrie / Wohnbereich / Fahrzeug / Medizin / Außenbereich')}`,
      `Zielmärkte: ${ph('EU, UK, USA, China')}`,
      `Anwender: ${ph('Fachpersonal / Laien')}`,
    ]) +
    h(2, '3.3 Stückzahlen und Lebenszyklus') +
    table(['Merkmal', 'Wert'], [
      ['Geplante Jahresstückzahl', ph('5.000 Stk./Jahr')],
      ['Typische Losgröße', ph('500 Stk.')],
      ['Geplanter Serienstart (SOP)', ph('Q3/2027')],
      ['Produktlebensdauer am Markt', ph('10 Jahre')],
    ]) +
    h(2, '3.4 Abgrenzung (Nicht-Ziele)') +
    p(`Folgende Punkte sind ausdrücklich <b>nicht</b> Bestandteil dieses Lastenhefts: ${ph('z. B. Gehäuseentwicklung, Zulassung für Nordamerika, Cloud-Anbindung')}.`) +

    h(1, '4 Systemübersicht') +
    h(2, '4.1 Blockschaltbild') +
    p(ph('Fügen Sie hier über „Einfügen → Bild“ ein Blockschaltbild ein.')) +
    h(2, '4.2 Systemgrenzen und Schnittstellen zur Umgebung') +
    p(ph('Beschreiben Sie, welche Komponenten zum Lieferumfang gehören und welche externen Systeme (Sensoren, Steuerungen, Netzteile, Bussysteme) angebunden werden.')) +

    h(1, '5 Funktionale Anforderungen') +
    p('Die folgenden Anforderungen beschreiben das geforderte Verhalten der Baugruppe.') +
    req('FUN', [
      [`Das Gerät muss die Messgröße ${ph('Druck')} im Bereich ${ph('0 … 10 bar')} erfassen.`, 'Muss', 'T'],
      [`Das Gerät muss den Messwert über ${ph('CAN')} mit einer Rate von mindestens ${ph('100 Hz')} ausgeben.`, 'Muss', 'T'],
      [`Das Gerät muss den Betriebszustand über eine ${ph('zweifarbige LED')} anzeigen.`, 'Muss', 'D'],
      [`Das Gerät soll innerhalb von ${ph('500 ms')} nach Anlegen der Versorgungsspannung betriebsbereit sein.`, 'Soll', 'T'],
      ['Das Gerät kann eine zyklische Selbstdiagnose durchführen und Fehler melden.', 'Kann', 'D'],
    ]) +

    h(1, '6 Elektrische Anforderungen') +
    h(2, '6.1 Spannungsversorgung') +
    param([
      ['Versorgungsspannung U<sub>B</sub>', 'Dauerbetrieb', ph('18'), ph('24'), ph('30'), 'V DC'],
      ['Stromaufnahme', 'U<sub>B</sub> = 24 V, Normalbetrieb', '–', ph('80'), ph('120'), 'mA'],
      ['Einschaltstrom', 'Spitzenwert', '–', '–', ph('1'), 'A'],
      ['Leistungsaufnahme', 'Standby', '–', '–', ph('0,5'), 'W'],
      ['Zulässige Restwelligkeit', 'auf U<sub>B</sub>', '–', '–', ph('5'), '%'],
    ]) +
    req('ELE', [
      ['Das Gerät muss dauerhaft gegen Verpolung der Versorgungsspannung geschützt sein.', 'Muss', 'T'],
      [`Das Gerät muss Überspannungen bis ${ph('36 V')} für ${ph('1 min')} ohne Schaden überstehen.`, 'Muss', 'T'],
      ['Alle Ausgänge müssen dauerhaft kurzschlussfest gegen GND und U<sub>B</sub> sein.', 'Muss', 'T'],
      [`Spannungsunterbrechungen bis ${ph('10 ms')} dürfen nicht zu einem Reset führen.`, 'Soll', 'T'],
      [`Die Kommunikationsschnittstellen sollen galvanisch von der Versorgung getrennt sein (Prüfspannung ${ph('1,5 kV')}).`, 'Soll', 'T'],
    ]) +
    h(2, '6.2 Ein- und Ausgänge') +
    table(['Kanal', 'Typ', 'Anzahl', 'Bereich / Pegel', 'Genauigkeit / Auflösung', 'Bemerkung'], [
      ['Analogeingang', '0–10 V / 4–20 mA', ph('2'), ph('0 … 10 V'), ph('±0,5 % v. E., 12 bit'), ''],
      ['Digitaleingang', '24 V, Typ 1 (IEC 61131-2)', ph('4'), '0 / 24 V', '–', ''],
      ['Digitalausgang', 'High-Side-Schalter', ph('2'), ph('0,5 A'), '–', 'kurzschlussfest'],
      ['Relaisausgang', 'Wechsler', ph('1'), ph('250 V AC / 5 A'), '–', ''],
    ]) +
    h(2, '6.3 Genauigkeit und Messtechnik') +
    p(ph('Anforderungen an Genauigkeit, Linearität, Temperaturdrift, Abtastrate, Langzeitstabilität und Kalibrierung.')) +

    h(1, '7 Schnittstellen') +
    h(2, '7.1 Kommunikationsschnittstellen') +
    table(['Schnittstelle', 'Standard / Protokoll', 'Parameter', 'Prio.'], [
      ['CAN', 'ISO 11898-2, CANopen (CiA 301)', ph('500 kbit/s'), 'Muss'],
      ['RS-485', 'Modbus RTU', ph('115,2 kbit/s'), 'Soll'],
      ['Ethernet', '10/100BASE-T, ' + ph('Modbus TCP'), '–', 'Kann'],
      ['USB', 'USB 2.0 Device (Service-Schnittstelle)', ph('USB-C'), 'Soll'],
      ['Funk', ph('Bluetooth LE 5.x / WLAN'), '–', 'Kann'],
    ]) +
    h(2, '7.2 Steckverbinder') +
    p(ph('Vorgaben zu Steckverbindern: Typ, Hersteller, Codierung, Polzahl, Steckzyklen, Pinbelegung.')) +
    h(2, '7.3 Bedien- und Anzeigeelemente (HMI)') +
    p(ph('LEDs, Taster, Display, Summer – Anzahl, Farben und Bedeutung.')) +
    h(2, '7.4 Programmier- und Testschnittstellen') +
    p(ph('Debug-/Programmierschnittstelle (z. B. SWD/JTAG), Testpunkte für die Fertigungsprüfung.')) +

    h(1, '8 Mechanische Anforderungen') +
    table(['Merkmal', 'Anforderung'], [
      ['Abmessungen (L × B × H)', `max. ${ph('100 × 60 × 25')} mm`],
      ['Gewicht', `max. ${ph('150')} g`],
      ['Gehäuse', `${ph('Kunststoff PA6 GF30 / Aluminium')}, Farbe ${ph('RAL 7035')}`],
      ['Befestigung', ph('Hutschiene TS35 nach EN 60715 / Schraubbefestigung')],
      ['Leiterplatte', `${ph('4')} Lagen, FR-4, T<sub>g</sub> ≥ ${ph('150 °C')}, Dicke ${ph('1,6 mm')}`],
      ['Kühlung', ph('passiv, keine Lüfter')],
      ['Kennzeichnung', 'Typenschild mit Typ, Seriennummer, Datumscode, CE-Kennzeichnung, WEEE-Symbol'],
    ]) +

    h(1, '9 Umgebungsbedingungen') +
    envTable() +

    h(1, '10 Elektromagnetische Verträglichkeit (EMV)') +
    p('Das Gerät muss die Anforderungen der EMV-Richtlinie 2014/30/EU erfüllen. Es gelten insbesondere die folgenden Prüfungen:') +
    emcTable() +
    emcCriteria() +
    note('<b>Hinweis:</b> Normenausgaben vor Freigabe auf Aktualität prüfen. Existiert eine Produktnorm (z. B. EN IEC 61326-1 für Mess-, Steuer- und Laborgeräte, CISPR 25 / ISO 7637 im Kfz-Bereich), hat diese Vorrang vor den Fachgrundnormen.') +

    h(1, '11 Sicherheit, Normen und Zulassungen') +
    h(2, '11.1 Richtlinien und Konformität') +
    directives() +
    h(2, '11.2 Produktsicherheit') +
    p(ph('Anzuwendende Sicherheitsnorm, z. B. IEC 62368-1 (Audio/Video/IT), IEC 61010-1 (Mess-, Steuer-, Laborgeräte), IEC 60335-1 (Haushalt), EN 60204-1 (Maschinen).')) +
    req('NOR', [
      [`Luft- und Kriechstrecken müssen nach ${ph('IEC 60664-1')} für Überspannungskategorie ${ph('II')} und Verschmutzungsgrad ${ph('2')} ausgelegt sein.`, 'Muss', 'A, I'],
      ['Gehäuse- und Leiterplattenmaterialien müssen mindestens die Brennbarkeitsklasse UL 94 V-0 erfüllen.', 'Muss', 'I'],
      ['Die Baugruppe soll für eine spätere UL/CSA-Zulassung vorbereitet sein.', 'Kann', 'A'],
    ]) +
    h(2, '11.3 Funktionale Sicherheit') +
    p(ph('Falls zutreffend: geforderter SIL nach IEC 61508, PL nach ISO 13849-1 oder ASIL nach ISO 26262.')) +

    h(1, '12 Firmware und Software') +
    req('FW', [
      [`Die Firmware muss im Feld über ${ph('USB / CAN')} aktualisierbar sein (Bootloader).`, 'Muss', 'D'],
      ['Ein abgebrochenes Update darf nicht zu einem funktionsunfähigen Gerät führen (Rückfall auf das vorherige Image).', 'Muss', 'T'],
      ['Die Firmware-Version muss über die Kommunikationsschnittstelle auslesbar sein.', 'Muss', 'D'],
      ['Firmware-Updates sollen kryptografisch signiert und vor der Installation geprüft werden (Secure Boot).', 'Soll', 'A'],
      ['Ein Watchdog muss die Programmausführung überwachen.', 'Muss', 'T'],
    ]) +

    h(1, '13 Zuverlässigkeit und Lebensdauer') +
    req('ZUV', [
      [`Die Lebensdauer muss mindestens ${ph('10 Jahre')} bei ${ph('8 h/Tag')} und ${ph('40 °C')} Umgebungstemperatur betragen.`, 'Muss', 'A'],
      [`Die MTBF muss mindestens ${ph('100.000 h')} betragen, berechnet nach ${ph('SN 29500 / IEC 61709')} bei ${ph('40 °C')}.`, 'Muss', 'A'],
      ['Bauteile sollen mit Derating betrieben werden (z. B. Spannung ≤ 80 %, Verlustleistung ≤ 60 % der Nennwerte).', 'Soll', 'A'],
      ['Für Elektrolytkondensatoren ist eine Lebensdauerberechnung für das Einsatzprofil vorzulegen.', 'Soll', 'A'],
      [`Bauteile sollen für mindestens ${ph('10 Jahre')} verfügbar sein; für kritische Bauteile ist eine Second Source zu benennen.`, 'Soll', 'A'],
    ]) +

    h(1, '14 Fertigung und Prüfung') +
    req('FER', [
      [`Fertigung und Abnahme der Baugruppen erfolgen nach IPC-A-610 Klasse ${ph('2')}.`, 'Muss', 'I'],
      ['Lötprozesse müssen IPC J-STD-001 entsprechen.', 'Muss', 'I'],
      [`Das Layout soll fertigungs- und prüfgerecht (DFM/DFT) sein, inkl. Testpunkten für ${ph('ICT / Flying-Probe')}.`, 'Soll', 'I'],
      ['Jede Baugruppe muss einen Funktionstest (End-of-Line) durchlaufen; die Ergebnisse sind seriennummernbezogen zu archivieren.', 'Muss', 'D'],
      ['Die Rückverfolgbarkeit soll über Seriennummer / Data-Matrix-Code bis zur Bauteilcharge gewährleistet sein.', 'Soll', 'I'],
      ['ESD-Schutz in Fertigung, Lagerung und Verpackung nach IEC 61340-5-1.', 'Muss', 'I'],
    ]) +

    h(1, '15 Dokumentation und Lieferumfang') +
    table(['Lieferobjekt', 'Format', 'Termin'], [
      ['Pflichtenheft', 'PDF', 'M1'],
      ['Schaltplan', `PDF + Originaldaten (${ph('Altium / KiCad')})`, 'M2'],
      ['Fertigungsdaten (Gerber/ODB++, Bohr- und Bestückungsdaten)', 'ZIP', 'M3'],
      ['Stückliste (BOM) mit Hersteller-Teilenummern und Alternativen', 'XLSX', 'M3'],
      ['Firmware (Quellcode und Binärdatei)', ph('Git-Repository'), 'M4'],
      ['Prüfspezifikation und Prüfberichte (EMV, Umwelt, Sicherheit)', 'PDF', 'M4'],
      ['Technische Dokumentation / Betriebsanleitung', 'PDF', 'M5'],
      ['Muster', ph('10 Stk. A-Muster, 30 Stk. B-Muster'), 'M2 / M3'],
    ]) +

    h(1, '16 Projektabwicklung, Termine und Kosten') +
    h(2, '16.1 Meilensteine') +
    milestones() +
    h(2, '16.2 Zielkosten') +
    table(['Kostenart', 'Zielwert'], [
      [`Herstellkosten pro Stück (bei ${ph('5.000 Stk./Jahr')})`, `≤ ${ph('xx,xx')} €`],
      ['Entwicklungskosten (einmalig)', `≤ ${ph('xx.xxx')} €`],
      ['Prüf- und Zulassungskosten', `≤ ${ph('x.xxx')} €`],
    ]) +
    h(2, '16.3 Projektorganisation') +
    p(ph('Ansprechpartner, Kommunikationswege, Review-Termine, Änderungsmanagement.')) +

    h(1, '17 Abnahme und Qualität') +
    p('Die Abnahme erfolgt anhand eines vom AN zu erstellenden und vom AG freizugebenden Abnahmeprüfplans, der jede Anforderung dieses Lastenhefts abdeckt (Anforderungs-Verifikationsmatrix).') +
    ul([
      'Alle Muss-Anforderungen sind nachweislich erfüllt.',
      'Prüfberichte eines akkreditierten Prüflabors für EMV und Produktsicherheit liegen vor.',
      `Erstmusterprüfbericht (${ph('VDA Band 2 / PPAP')}) ist freigegeben.`,
      `Das Qualitätsmanagementsystem des AN ist nach ISO 9001 ${ph('bzw. IATF 16949 / ISO 13485')} zertifiziert.`,
    ]) +

    h(1, '18 Anhang') +
    p(ph('Zeichnungen, Datenblätter, Pinbelegungen, Einsatzprofile …'));

  /* ------------------------------------------------------------------ */
  /* Vorlage 2: Kompakt (allgemeine Gliederung)                          */
  /* ------------------------------------------------------------------ */
  const kompakt = () => front('LASTENHEFT') +
    h(1, '1 Einleitung') +
    h(2, '1.1 Zweck und Ziel des Projekts') +
    p(ph('Was soll entwickelt werden und welches Ziel verfolgt der Auftraggeber?')) +
    h(2, '1.2 Projektbeteiligte') +
    table(['Rolle', 'Name / Firma', 'Kontakt'], [
      ['Auftraggeber', ph('Name'), ph('E-Mail / Telefon')],
      ['Projektleitung', ph('Name'), ph('E-Mail / Telefon')],
      ['Technischer Ansprechpartner', ph('Name'), ph('E-Mail / Telefon')],
    ]) +
    h(1, '2 Ist-Zustand') +
    p(ph('Beschreibung der aktuellen Situation und der Probleme.')) +
    h(1, '3 Soll-Zustand') +
    p(ph('Beschreibung des angestrebten Zustands nach Projektabschluss.')) +
    h(1, '4 Funktionale Anforderungen') +
    prioLegend() +
    req('FUN', [
      [ph('Anforderung beschreiben'), 'Muss', 'T'],
      [ph('Anforderung beschreiben'), 'Soll', 'D'],
    ]) +
    h(1, '5 Nicht-funktionale Anforderungen') +
    h(2, '5.1 Elektrische Kenndaten') +
    param([
      ['Versorgungsspannung', '', ph('…'), ph('…'), ph('…'), 'V'],
      ['Stromaufnahme', '', ph('…'), ph('…'), ph('…'), 'mA'],
    ]) +
    h(2, '5.2 Umgebungsbedingungen') +
    p(`Betriebstemperatur ${ph('−20 … +60 °C')}, Schutzart ${ph('IP54')} (DIN EN 60529), Luftfeuchte ${ph('≤ 90 % rel., nicht kondensierend')}.`) +
    h(2, '5.3 Normen und Richtlinien') +
    p('CE-Konformität (EMV-Richtlinie 2014/30/EU, RoHS 2011/65/EU), ' + ph('weitere Normen') + '.') +
    h(1, '6 Rahmenbedingungen') +
    ul([
      `Budget: ${ph('xx.xxx €')}`,
      `Zeitrahmen: ${ph('Projektstart – Projektende')}`,
      `Vorgaben: ${ph('bevorzugte Lieferanten, Bauteile, Werkzeuge')}`,
    ]) +
    h(1, '7 Lieferumfang') +
    ul(['Pflichtenheft', 'Schaltplan, Layout, Stückliste', ph('Muster: Anzahl'), 'Prüfberichte und Dokumentation']) +
    h(1, '8 Termine') +
    milestones() +
    h(1, '9 Abnahmekriterien') +
    p(ph('Unter welchen Bedingungen gilt das Projekt als erfolgreich abgeschlossen?')) +
    h(1, '10 Anhang') +
    p(ph('Ergänzende Unterlagen'));

  /* ------------------------------------------------------------------ */
  /* Vorlage 3: Leiterplatte & Baugruppenfertigung (EMS)                 */
  /* ------------------------------------------------------------------ */
  const leiterplatte = () => front('LASTENHEFT FERTIGUNG') +
    h(1, '1 Einleitung') +
    h(2, '1.1 Gegenstand') +
    p(`Dieses Lastenheft beschreibt die Anforderungen an die Herstellung der Leiterplatte und die Bestückung der Baugruppe ${ph('Bezeichnung, Sachnummer, Revision')} durch einen Fertigungsdienstleister (EMS).`) +
    h(2, '1.2 Kennzeichnung der Anforderungen') +
    prioLegend() +
    h(1, '2 Fertigungsunterlagen') +
    table(['Unterlage', 'Datei / Format', 'Revision'], [
      ['Leiterplattendaten', 'Gerber X2 / ODB++ / IPC-2581', ph('Rev. A')],
      ['Bohrdaten', 'Excellon', ph('Rev. A')],
      ['Stückliste (BOM)', 'XLSX / CSV', ph('Rev. A')],
      ['Bestückungsdaten (Pick & Place)', 'CSV', ph('Rev. A')],
      ['Bestückungsplan, Schaltplan', 'PDF', ph('Rev. A')],
      ['Lagenaufbau (Stack-up)', 'PDF', ph('Rev. A')],
      ['Prüfspezifikation', 'PDF', ph('Rev. A')],
    ]) +
    h(1, '3 Leiterplattenspezifikation') +
    table(['Merkmal', 'Anforderung'], [
      ['Basismaterial', `FR-4, T<sub>g</sub> ≥ ${ph('150 °C')}, halogenfrei ${ph('ja/nein')}`],
      ['Lagenanzahl', ph('4')],
      ['Enddicke', `${ph('1,6 mm')} ± 10 %`],
      ['Kupferdicke Außen-/Innenlagen', ph('35 µm / 35 µm')],
      ['Min. Leiterbahnbreite / -abstand', ph('0,15 mm / 0,15 mm')],
      ['Min. Enddurchmesser Bohrung', ph('0,3 mm')],
      ['Oberfläche', ph('ENIG (chem. Ni/Au)')],
      ['Lötstopplack / Bestückungsdruck', ph('grün LPI / weiß')],
      ['Impedanzkontrolle', ph('90 Ω differenziell (USB) ±10 %')],
      ['Qualifikation / Abnahme', `IPC-6012 Klasse ${ph('2')} / IPC-A-600 Klasse ${ph('2')}`],
      ['Brennbarkeit', 'UL 94 V-0, UL-Kennzeichnung auf der Leiterplatte'],
      ['Nutzen', ph('Ritzen / Fräsen mit Stegen, Passermarken, Nutzengröße')],
      ['Elektrischer Test', '100 % (Flying-Probe oder Adapter)'],
    ]) +
    h(1, '4 Bestückung und Lötung') +
    req('BST', [
      [`Bestückung ${ph('SMD beidseitig + THT')} nach Bestückungsdaten.`, 'Muss', 'I'],
      [`Ausführung und Abnahme nach IPC-A-610 Klasse ${ph('2')}.`, 'Muss', 'I'],
      ['Lötprozesse nach IPC J-STD-001, bleifrei und RoHS-konform.', 'Muss', 'I'],
      ['Handhabung feuchteempfindlicher Bauteile (MSL) nach IPC/JEDEC J-STD-033.', 'Muss', 'I'],
      ['Röntgenprüfung für BGA/QFN-Bauteile (Stichprobe bzw. Erstmuster).', 'Soll', 'I'],
      [`Schutzlackierung (Conformal Coating): ${ph('ja/nein')}, Material ${ph('…')}, nach IPC-CC-830, Aussparungen gemäß Zeichnung.`, 'Soll', 'I'],
    ]) +
    h(1, '5 Bauteilbeschaffung') +
    req('BES', [
      ['Bauteile dürfen ausschließlich vom Hersteller oder über autorisierte Distributoren bezogen werden.', 'Muss', 'I'],
      ['Alternativbauteile dürfen nur nach schriftlicher Freigabe durch den AG eingesetzt werden.', 'Muss', 'I'],
      [`Beigestellte Bauteile: ${ph('Liste')}.`, 'Muss', 'I'],
      ['Der AN informiert den AG unverzüglich über Abkündigungen (PCN/EOL).', 'Soll', 'I'],
    ]) +
    h(1, '6 Prüfung') +
    table(['Prüfschritt', 'Umfang', 'Bemerkung'], [
      ['Automatische optische Inspektion (AOI)', '100 %', ''],
      [ph('In-Circuit-Test (ICT) / Flying-Probe'), '100 %', ph('Prüfprogramm durch AN')],
      ['Programmierung der Firmware', '100 %', ph('Version gemäß Freigabe')],
      ['Funktionstest', '100 %', ph('Prüfadapter durch AG / AN')],
      ['Röntgenprüfung', ph('Stichprobe'), 'BGA/QFN'],
    ]) +
    h(1, '7 Kennzeichnung und Rückverfolgbarkeit') +
    p(`Jede Baugruppe erhält ein Label mit ${ph('Sachnummer, Revision, Seriennummer, Datumscode')} als Klartext und Data-Matrix-Code. Die Rückverfolgbarkeit bis zur Bauteilcharge ist für ${ph('10 Jahre')} sicherzustellen.`) +
    h(1, '8 Verpackung und Lieferung') +
    ul([
      'ESD-gerechte Verpackung nach IEC 61340-5-1.',
      'Trockenverpackung für feuchteempfindliche Baugruppen.',
      `Losgröße ${ph('…')}, Lieferzeit ${ph('… Wochen')}, Lieferbedingung ${ph('Incoterms 2020 DAP')}.`,
    ]) +
    h(1, '9 Qualität und Dokumentation') +
    ul([
      'Zertifiziertes Qualitätsmanagementsystem nach ISO 9001.',
      'Erstmusterprüfbericht und Freigabe vor Serienlieferung.',
      'Konformitätsbescheinigung (CoC) und Prüfprotokolle je Lieferung.',
      'Reklamationsbearbeitung nach 8D-Methode.',
    ]) +
    h(1, '10 Kosten und Termine') +
    table(['Position', 'Menge', 'Termin'], [
      ['Erstmuster', ph('10 Stk.'), ph('KW/Jahr')],
      ['Nullserie', ph('100 Stk.'), ph('KW/Jahr')],
      ['Serie', ph('… Stk./Jahr'), ph('ab KW/Jahr')],
    ]);

  /* ------------------------------------------------------------------ */
  /* Vorlage 4: Netzteil / Stromversorgung                               */
  /* ------------------------------------------------------------------ */
  const netzteil = () => front('LASTENHEFT') +
    h(1, '1 Einleitung') +
    p(`Dieses Lastenheft beschreibt die Anforderungen an ein ${ph('AC/DC-Netzteil / DC/DC-Wandler')} für ${ph('Anwendung')}.`) +
    prioLegend() +
    h(1, '2 Einsatzbereich') +
    ul([
      `Anwendung: ${ph('Einbaunetzteil / externes Steckernetzteil / Hutschienennetzteil')}`,
      `Umgebung: ${ph('Industrie / Wohnbereich')}`,
      `Schutzklasse: ${ph('I / II')}`,
    ]) +
    h(1, '3 Eingangskenndaten') +
    param([
      ['Eingangsspannung', 'Weitbereich', ph('90'), ph('230'), ph('264'), 'V AC'],
      ['Netzfrequenz', '', ph('47'), '50/60', ph('63'), 'Hz'],
      ['Einschaltstrom', 'Kaltstart, 230 V AC', '–', '–', ph('30'), 'A'],
      ['Leerlaufleistung', 'ohne Last', '–', '–', ph('0,1'), 'W'],
      ['Leistungsfaktor', 'Nennlast', ph('0,9'), '–', '–', ''],
    ]) +
    note('<b>Hinweis:</b> Für externe Netzteile gelten die Ökodesign-Anforderungen der Verordnung (EU) 2019/1782 (Mindestwirkungsgrad, Leerlaufleistung). Oberschwingungen nach EN 61000-3-2, Flicker nach EN 61000-3-3.') +
    h(1, '4 Ausgangskenndaten') +
    param([
      ['Ausgangsspannung', 'Nennlast', ph('23,5'), ph('24,0'), ph('24,5'), 'V'],
      ['Ausgangsstrom', 'Dauerbetrieb', '0', '–', ph('2,5'), 'A'],
      ['Ausgangsleistung', 'Dauerbetrieb', '–', '–', ph('60'), 'W'],
      ['Restwelligkeit / Rauschen', '20 MHz Bandbreite', '–', '–', ph('120'), 'mV<sub>pp</sub>'],
      ['Lastausregelung', '0 … 100 % Last', '–', '–', ph('±1'), '%'],
      ['Wirkungsgrad', '230 V AC, Nennlast', ph('90'), '–', '–', '%'],
      ['Netzausfallüberbrückung (Hold-up)', '230 V AC, Nennlast', ph('20'), '–', '–', 'ms'],
      ['Lastsprung 10 → 90 %', 'Abweichung / Ausregelzeit', '–', '–', ph('±5 % / 500 µs'), ''],
    ]) +
    h(1, '5 Schutzfunktionen') +
    req('SCH', [
      ['Überspannungsschutz am Ausgang (OVP).', 'Muss', 'T'],
      ['Überstrom- und Kurzschlussschutz (OCP/SCP), dauerkurzschlussfest mit selbstständigem Wiederanlauf.', 'Muss', 'T'],
      ['Übertemperaturschutz (OTP) mit selbstständigem Wiederanlauf.', 'Muss', 'T'],
      ['Eingangssicherung, nicht vom Anwender austauschbar.', 'Muss', 'I'],
      ['Power-Good-Signal / Status-LED.', 'Kann', 'D'],
    ]) +
    h(1, '6 Isolation und Sicherheit') +
    table(['Merkmal', 'Anforderung'], [
      ['Sicherheitsnorm', ph('IEC 62368-1 / IEC 61010-1 / IEC 60335-1')],
      ['Isolationsprüfspannung Primär–Sekundär', ph('3 kV AC, 1 min')],
      ['Isolationsprüfspannung Primär–PE', ph('1,5 kV AC, 1 min')],
      ['Ableitstrom', `≤ ${ph('0,25')} mA`],
      ['Luft- und Kriechstrecken', `nach ${ph('IEC 62368-1')}, verstärkte Isolierung`],
      ['Schutzart', ph('IP20')],
    ]) +
    h(1, '7 EMV') +
    table(['Prüfung', 'Norm', 'Anforderung'], [
      ['Störaussendung leitungsgeführt / gestrahlt', 'EN 55032 / EN IEC 61000-6-3', ph('Klasse B')],
      ['Oberschwingungsströme', 'EN IEC 61000-3-2', ph('Klasse A')],
      ['Spannungsschwankungen / Flicker', 'EN 61000-3-3', 'gemäß Norm'],
      ['Störfestigkeit', 'EN 55035 / EN IEC 61000-6-2', 'gemäß Norm'],
    ]) +
    h(1, '8 Umgebungsbedingungen') +
    envTable() +
    p(`Leistungsderating: ${ph('volle Leistung bis +50 °C, darüber linear 2,5 %/K bis +70 °C')}.`) +
    h(1, '9 Mechanik') +
    table(['Merkmal', 'Anforderung'], [
      ['Bauform', ph('offene Leiterplatte / Gehäuse / Hutschiene')],
      ['Abmessungen', ph('… × … × … mm')],
      ['Anschlüsse', ph('Schraubklemmen / Stecker')],
      ['Kühlung', 'Konvektion, kein Lüfter'],
    ]) +
    h(1, '10 Zuverlässigkeit') +
    req('ZUV', [
      [`MTBF ≥ ${ph('300.000 h')} nach ${ph('SN 29500 / IEC 61709')} bei ${ph('40 °C')}.`, 'Muss', 'A'],
      [`Elko-Lebensdauer ≥ ${ph('50.000 h')} bei ${ph('40 °C')} und Nennlast (Berechnung vorlegen).`, 'Muss', 'A'],
      [`Garantie / Gewährleistung ${ph('3 Jahre')}.`, 'Soll', '–'],
    ]) +
    h(1, '11 Kennzeichnung und Zulassungen') +
    p(`CE, ${ph('UKCA, cULus, CCC')}, Typenschild mit Eingangs-/Ausgangsdaten, Schutzklassensymbol, WEEE-Symbol.`) +
    h(1, '12 Abnahme') +
    p('Abnahme anhand eines Prüfplans, der alle Kenndaten unter Nenn- und Grenzbedingungen (U<sub>min</sub>/U<sub>max</sub>, T<sub>min</sub>/T<sub>max</sub>, Leerlauf/Volllast) nachweist.');

  /* ------------------------------------------------------------------ */
  /* Vorlage 5: Leeres Grundgerüst                                        */
  /* ------------------------------------------------------------------ */
  const leer = () => front('LASTENHEFT') +
    h(1, '1 Einleitung') + p('') +
    h(1, '2 Ausgangssituation') + p('') +
    h(1, '3 Anforderungen') +
    req('REQ', [[ph('Anforderung beschreiben'), 'Muss', 'T']]) +
    h(1, '4 Abnahme') + p('');

  const TEMPLATES = [
    { id: 'elektronik', icon: 'tplElec', name: 'Elektronik-Baugruppe (vollständig)', title: 'Lastenheft Elektronik-Baugruppe',
      desc: 'Umfassende Gliederung nach VDI 2519: elektrische Kenndaten, Schnittstellen, EMV, Umwelt, Normen, Firmware, Zuverlässigkeit, Fertigung.', build: elektronik },
    { id: 'kompakt', icon: 'tplShort', name: 'Kompakt (allgemein)', title: 'Lastenheft',
      desc: 'Klassische Gliederung Ist/Soll, funktionale und nicht-funktionale Anforderungen, Rahmenbedingungen, Abnahme (DIN 69901-5).', build: kompakt },
    { id: 'leiterplatte', icon: 'tplPcb', name: 'Leiterplatte & Bestückung (EMS)', title: 'Lastenheft Leiterplatten- und Baugruppenfertigung',
      desc: 'Für die Vergabe an einen Fertiger: LP-Spezifikation, IPC-Klassen, Bauteilbeschaffung, Prüfung, Verpackung.', build: leiterplatte },
    { id: 'netzteil', icon: 'tplPsu', name: 'Netzteil / Stromversorgung', title: 'Lastenheft Netzteil',
      desc: 'Eingangs-/Ausgangskenndaten, Schutzfunktionen, Isolation, EMV, Derating, Ökodesign.', build: netzteil },
    { id: 'leer', icon: 'tplEmpty', name: 'Leeres Grundgerüst', title: 'Lastenheft',
      desc: 'Deckblatt, Änderungshistorie, Inhaltsverzeichnis und eine leere Anforderungstabelle.', build: leer },
  ];

  const SNIPPETS = {
    cover: { name: 'Deckblatt', build: () => cover() },
    history: { name: 'Änderungshistorie', build: history },
    req: { name: 'Anforderungstabelle', build: () => req('REQ', [[ph('Anforderung beschreiben'), 'Muss', 'T']]) + '<p><br></p>' },
    param: { name: 'Kenndaten (Min/Typ/Max)', build: () => param([[ph('Parameter'), ph('Bedingung'), '', '', '', ph('Einheit')]]) + '<p><br></p>' },
    abbr: { name: 'Abkürzungsverzeichnis', build: () => abbreviations() + '<p><br></p>' },
    env: { name: 'Umgebungsbedingungen', build: () => envTable() + '<p><br></p>' },
    emc: { name: 'EMV-Prüfungen', build: () => emcTable() + emcCriteria() },
    norms: { name: 'Richtlinien / CE', build: () => directives() + '<p><br></p>' },
    milestones: { name: 'Meilensteinplan', build: () => milestones() + '<p><br></p>' },
    prio: { name: 'Prioritäten-Legende', build: prioLegend },
    note: { name: 'Hinweisbox', build: () => note('<b>Hinweis:</b> ' + ph('Text')) + '<p><br></p>' },
  };

  window.LH_TEMPLATES = TEMPLATES;
  window.LH_SNIPPETS = SNIPPETS;
  // gemeinsame Bausteine für die Pflichtenheft-Vorlagen (pflichtenheft.js)
  window.LH_HELPERS = { ph, field, h, p, ul, note, pagebreak, table, param, history, tocBlock, milestones, abbreviations, envTable, emcTable, emcCriteria, directives };
})();
