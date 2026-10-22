/* Lastenheft-/Pflichtenheft-Editor – Hauptlogik */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const page = $('#page');
  const canvas = $('#canvas');

  const MODE_KEY = 'lastenheft-editor:mode';
  const META_LABELS = {
    titel: 'Titel', projekt: 'Projekt / Produkt', dokNr: 'Dokumentnummer', version: 'Version', datum: 'Datum', status: 'Status',
    bezugLH: 'Bezug: Lastenheft (Dok.-Nr., Version)', auftraggeber: 'Auftraggeber', auftragnehmer: 'Auftragnehmer', autor: 'Verfasser',
  };
  // Dokumentarten: jede hat eigene Vorlagen, Bausteine, Eigenschaften und eine eigene Autosicherung
  const MODES = {
    LH: {
      type: 'lastenheft', label: 'Lastenheft', app: 'Lastenheft-Editor', lsKey: 'lastenheft-editor:autosave:v1', dokNr: 'LH-0001',
      fields: ['titel', 'projekt', 'dokNr', 'version', 'datum', 'status', 'auftraggeber', 'autor'],
      templates: window.LH_TEMPLATES, snippets: window.LH_SNIPPETS, unit: 'Anforderungen',
      snippetsLarge: [['history', 'history', 'Änderungs&shy;historie'], ['req', 'req', 'Anforderungs&shy;tabelle'], ['env', 'env', 'Umgebungs&shy;bedingungen'],
        ['emc', 'emc', 'EMV-Prüfungen'], ['norms', 'norm', 'Richtlinien / CE'], ['milestones', 'milestone', 'Meilen&shy;steine']],
      snippetsSmall: [['abbr', 'abbr', 'Abkürzungen'], ['prio', 'prio', 'Prioritäten-Legende'], ['param', 'param', 'Kenndaten']],
    },
    PH: {
      type: 'pflichtenheft', label: 'Pflichtenheft', app: 'Pflichtenheft-Editor', lsKey: 'lastenheft-editor:autosave-ph:v1', dokNr: 'PH-0001',
      fields: ['titel', 'projekt', 'dokNr', 'version', 'datum', 'status', 'bezugLH', 'auftraggeber', 'auftragnehmer', 'autor'],
      templates: window.PH_TEMPLATES, snippets: window.PH_SNIPPETS, unit: 'Umsetzungszeilen',
      snippetsLarge: [['trace', 'req', 'Umsetzungs&shy;matrix'], ['variants', 'scale', 'Varianten&shy;vergleich'], ['power', 'env', 'Verlust&shy;leistung'],
        ['parts', 'chip', 'Kritische Bauteile'], ['tests', 'test', 'Prüfplan'], ['deviations', 'deviation', 'Abwei&shy;chungen'],
        ['risks', 'risk', 'Risiko&shy;analyse'], ['signoff', 'sign', 'Freigabe']],
      snippetsSmall: [['history', 'history', 'Änderungshistorie'], ['milestones', 'milestone', 'Meilensteine'], ['workpackages', 'tasks', 'Arbeitspakete'],
        ['cost', 'cost', 'Herstellkosten'], ['legend', 'prio', 'Erfüllungsgrad-Legende'], ['abbr', 'abbr', 'Abkürzungen']],
    },
  };
  const FULFIL = ['erfüllt', 'teilweise', 'nicht erfüllt', 'Abweichung'];
  const typeToMode = (t) => (t === 'pflichtenheft' ? 'PH' : 'LH');
  // Aufruf von einem anderen Gerät im WLAN (z. B. iPad) statt direkt auf dem PC?
  const IS_REMOTE = /^https?:$/.test(location.protocol) && !['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
  // Als iPad-App über HTTPS (z. B. GitHub Pages): Dokumente im App-Speicher des Geräts statt auf einem PC-Server
  const IS_APP_HOST = location.protocol === 'https:';
  const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const STATUS = ['Entwurf', 'In Prüfung', 'Freigegeben', 'Abgelehnt'];
  const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];
  const SYMBOLS = 'Ω µ ± ° ≤ ≥ ≈ ≠ × ÷ √ ∞ Δ ∆ π φ λ τ η α β γ σ ε ϑ ² ³ ½ ¼ ‰ € → ← ↑ ↓ ⇒ ↔ • … – — ✓ ✗ ⚠ ⏚ ⎓ ∿ ⌀ ∑ ∫ ∂ ≙ ∠ ⊥ ∥'.split(' ');
  const PRIOS = ['Muss', 'Soll', 'Kann'];

  const today = () => new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  function defaultMeta(mode) {
    const m = MODES[mode || state.mode];
    return { titel: m.label, projekt: '', dokNr: m.dokNr, version: '0.1', datum: today(), status: 'Entwurf', bezugLH: '', auftraggeber: '', auftragnehmer: '', autor: '' };
  }

  let initialMode = 'LH';
  try { if (localStorage.getItem(MODE_KEY) === 'PH') initialMode = 'PH'; } catch (e) { /* kein Speicher */ }
  const state = { mode: initialMode, name: null, meta: null, dirty: false, server: false, docsDir: '', zoom: 100, savedAt: null, lastFontPt: 11, autoFit: true };
  state.meta = defaultMeta();
  const M = () => MODES[state.mode];

  /* ===================== Hilfsfunktionen ===================== */
  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = msg;
    $('#toasts').append(t);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    setTimeout(() => t.remove(), type === 'err' ? 7000 : 4000);
  }

  function modal({ title, html, buttons = [{ label: 'OK', value: true, primary: true }], init }) {
    return new Promise((resolve) => {
      const box = $('#modal');
      $('#modalTitle').textContent = title;
      const body = $('#modalBody');
      body.innerHTML = html;
      const bar = $('#modalButtons');
      bar.innerHTML = '';
      const val = (b) => (typeof b.value === 'function' ? b.value(body) : b.value);
      const close = (v) => { box.classList.add('hidden'); document.removeEventListener('keydown', onKey, true); resolve(v); };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
          e.preventDefault(); e.stopPropagation();
          const p = buttons.find((b) => b.primary);
          if (p) close(val(p));
        }
      };
      for (const b of buttons) {
        const el = document.createElement('button');
        el.textContent = b.label;
        if (b.primary) el.className = 'primary';
        el.onclick = () => close(val(b));
        bar.append(el);
      }
      document.addEventListener('keydown', onKey, true);
      box.classList.remove('hidden');
      if (init) init(body, close);
      const inp = body.querySelector('input');
      if (inp) { inp.focus(); inp.select(); } else bar.lastChild?.focus();
    });
  }
  const askText = (title, label, value = '') => modal({
    title, html: `<label>${label}</label><input value="${esc(value)}">`,
    buttons: [{ label: 'Abbrechen', value: null }, { label: 'OK', primary: true, value: (b) => b.querySelector('input').value.trim() }],
  });
  const confirmBox = (title, text, ok = 'OK') => modal({
    title, html: `<p>${text}</p>`, buttons: [{ label: 'Abbrechen', value: false }, { label: ok, primary: true, value: true }],
  });

  /* ---------- App-Speicher auf dem Gerät (IndexedDB) – nur im App-Betrieb ohne PC-Server ---------- */
  const LIB = {
    db: null,
    open() {
      return new Promise((resolve, reject) => {
        const r = indexedDB.open('lastenheft-editor', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' });
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    },
    async run(mode, fn) {
      if (!this.db) this.db = await this.open();
      return new Promise((resolve, reject) => {
        const t = this.db.transaction('docs', mode);
        const req = fn(t.objectStore('docs'));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error('Speichern abgebrochen (Speicher voll?)'));
      });
    },
    id: (name, type) => `${type}:${name}`,
    list() { return this.run('readonly', (st) => st.getAll()); },
    get(name, type) { return this.run('readonly', (st) => st.get(this.id(name, type))); },
    put(name, type, data) {
      const json = JSON.stringify(data);
      return this.run('readwrite', (st) => st.put({ id: this.id(name, type), name, type, modified: Date.now() / 1000, size: json.length, data }));
    },
    del(name, type) { return this.run('readwrite', (st) => st.delete(this.id(name, type))); },
  };

  /** Datei über das Teilen-Menü weitergeben (iPad: Word, „In Dateien sichern“ …), sonst herunterladen */
  async function shareOrDownload(blob, filename) {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'aborted';
      }
    }
    download(blob, filename);
    return 'downloaded';
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  }

  const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Lastenheft';
  const fileBase = () => safeName(state.name || [state.meta.dokNr, state.meta.titel].filter(Boolean).join(' '));

  async function api(method, url, body, type = 'application/json') {
    const res = await fetch(url, {
      method,
      headers: { 'X-Lastenheft': '1', ...(body !== undefined ? { 'Content-Type': type } : {}) },
      body: body === undefined ? undefined : (type === 'application/json' ? JSON.stringify(body) : body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      toast('Die Anmeldung ist abgelaufen – bitte den Zugangscode erneut eingeben.', 'err');
      setTimeout(() => location.reload(), 1500);
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  /* ===================== Auswahl / Editor-Befehle ===================== */
  let savedRange = null;
  let selectedImg = null;

  function liveRange() {
    const s = getSelection();
    if (s.rangeCount && page.contains(s.anchorNode)) return s.getRangeAt(0);
    return savedRange;
  }
  function restoreSel() {
    page.focus({ preventScroll: true });
    const s = getSelection();
    if (s.rangeCount && page.contains(s.anchorNode)) return;
    s.removeAllRanges();
    if (savedRange && page.contains(savedRange.startContainer)) s.addRange(savedRange);
    else {
      const r = document.createRange();
      r.selectNodeContents(page);
      r.collapse(false);
      s.addRange(r);
    }
  }
  function nodeEl(n) { return n ? (n.nodeType === 1 ? n : n.parentElement) : null; }
  function currentBlock() {
    let el = nodeEl(liveRange()?.startContainer);
    while (el && el !== page) {
      if (/^(P|H[1-6]|LI|DIV|TD|TH|PRE|BLOCKQUOTE)$/.test(el.tagName)) return el;
      el = el.parentElement;
    }
    return null;
  }
  /** Oberstes Blockelement (direktes Kind der Seite), in dem der Cursor steht */
  function topBlock() {
    let el = nodeEl(liveRange()?.startContainer);
    if (!el || !page.contains(el) || el === page) return null;
    while (el.parentElement && el.parentElement !== page) el = el.parentElement;
    return el;
  }

  function exec(cmd, val = null) {
    restoreSel();
    document.execCommand(cmd, false, val);
    changed();
  }

  function insertInline(html) {
    restoreSel();
    document.execCommand('insertHTML', false, html);
    changed();
  }

  /** Fügt Blockinhalt (Tabellen, Bausteine) nach dem aktuellen Absatz ein */
  function insertBlocks(html, { focusFirstPh = true } = {}) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const nodes = [...tpl.content.childNodes];
    if (!nodes.length) return;
    const top = topBlock();
    if (!top) page.append(...nodes);
    else if (top.tagName === 'P' && !top.textContent.trim() && !top.querySelector('img')) top.replaceWith(...nodes);
    else top.after(...nodes);
    const last = nodes[nodes.length - 1];
    if (!last.nextSibling) last.after(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
    const firstPh = focusFirstPh && nodes.map((n) => n.nodeType === 1 && (n.matches('.ph') ? n : n.querySelector('.ph'))).find(Boolean);
    placeCaret(firstPh || last, !!firstPh);
    updateFields();
    changed();
    return nodes;
  }

  function placeCaret(el, selectAll = false) {
    if (!el) return;
    page.focus({ preventScroll: true });
    const r = document.createRange();
    r.selectNodeContents(el);
    if (!selectAll) r.collapse(false);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    savedRange = r.cloneRange();
    nodeEl(el).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function setBlock(tag) {
    restoreSel();
    if (tag === 'note') {
      const b = currentBlock();
      if (!b) return;
      const n = b.closest('.note');
      if (n && page.contains(n)) n.replaceWith(...n.childNodes);
      else if (/^(P|H[1-6])$/.test(b.tagName)) {
        const d = document.createElement('div');
        d.className = 'note';
        b.replaceWith(d);
        d.append(b);
      }
      changed();
      return;
    }
    document.execCommand('formatBlock', false, tag === 'title' ? 'p' : tag);
    const b = currentBlock();
    if (b) {
      b.classList.remove('doc-title');
      if (tag === 'title') b.classList.add('doc-title');
      if (!b.className) b.removeAttribute('class');
    }
    changed();
  }

  /* ---------- Schriftgröße (pt) ---------- */
  function convertFontTags(pt) {
    const made = [];
    $$('font[size="7"]', page).forEach((f) => {
      const s = document.createElement('span');
      s.style.fontSize = `${pt}pt`;
      s.append(...f.childNodes);
      s.querySelectorAll('[style]').forEach((x) => { x.style.fontSize = ''; if (!x.getAttribute('style')) x.removeAttribute('style'); });
      f.replaceWith(s);
      made.push(s);
    });
    return made;
  }
  function applyFontSize(pt) {
    if (!pt) return;
    state.lastFontPt = pt;
    restoreSel();
    state.applyingFont = true; // verhindert, dass der input-Handler die Umwandlung vorwegnimmt
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    document.execCommand('styleWithCSS', false, true);
    state.applyingFont = false;
    const made = convertFontTags(pt);
    if (made.length) {
      const r = document.createRange();
      r.setStartBefore(made[0]);
      r.setEndAfter(made[made.length - 1]);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    changed();
  }
  function currentFontPt() {
    const el = nodeEl(liveRange()?.startContainer);
    if (!el) return 11;
    return Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75 * 2) / 2;
  }
  function stepFont(dir) {
    const cur = currentFontPt();
    const next = dir > 0 ? FONT_SIZES.find((s) => s > cur) : [...FONT_SIZES].reverse().find((s) => s < cur);
    applyFontSize(next || cur);
  }

  /* ===================== Tabellen ===================== */
  function cellCtx() {
    const el = nodeEl(liveRange()?.startContainer);
    const cell = el?.closest('td,th');
    if (!cell || !page.contains(cell)) return null;
    return { cell, row: cell.parentElement, table: cell.closest('table'), index: cell.cellIndex };
  }

  function makeTable(rows, cols) {
    const th = '<th><br></th>'.repeat(cols);
    const tr = `<tr>${'<td><br></td>'.repeat(cols)}</tr>`;
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr.repeat(Math.max(rows - 1, 0))}</tbody></table>`;
  }

  function newRowLike(row, forceTd = true) {
    const tr = document.createElement('tr');
    for (const c of row.cells) {
      const n = document.createElement(forceTd ? 'td' : c.tagName.toLowerCase());
      n.innerHTML = '<br>';
      if (c.colSpan > 1) n.colSpan = c.colSpan;
      tr.append(n);
    }
    return tr;
  }

  const tableOps = {
    rowAbove(c) {
      const inHead = c.row.parentElement.tagName === 'THEAD';
      const tr = newRowLike(c.row, !inHead);
      c.row.before(tr);
      placeCaret(tr.cells[0]);
    },
    rowBelow(c) {
      const tr = newRowLike(c.row);
      if (c.row.parentElement.tagName === 'THEAD') {
        const body = c.table.tBodies[0] || c.table.createTBody();
        body.prepend(tr);
      } else c.row.after(tr);
      placeCaret(tr.cells[0]);
    },
    colLeft(c) { insertCol(c, false); },
    colRight(c) { insertCol(c, true); },
    delRow(c) {
      c.row.remove();
      if (!c.table.querySelector('tr')) c.table.remove();
    },
    delCol(c) {
      for (const r of [...c.table.rows]) r.cells[Math.min(c.index, r.cells.length - 1)]?.remove();
      if (!c.table.querySelector('td,th')) c.table.remove();
    },
    delTable(c) { c.table.remove(); },
  };
  function insertCol(c, after) {
    for (const r of [...c.table.rows]) {
      const ref = r.cells[Math.min(c.index, r.cells.length - 1)];
      if (!ref) continue;
      const n = document.createElement(ref.tagName.toLowerCase());
      n.innerHTML = '<br>';
      if (after) ref.after(n); else ref.before(n);
    }
  }
  function tableCmd(name) {
    const c = cellCtx();
    if (!c) { toast('Bitte zuerst den Cursor in eine Tabelle setzen.'); return; }
    tableOps[name](c);
    changed();
    updateContext();
  }

  /* ===================== Anforderungen ===================== */
  const REQ_RE = /^(.*?)(\d+)\s*$/;
  function reqRows() { return $$('table.req tbody tr', page).filter((r) => r.cells.length >= 2); }
  function traceRows() { return $$('table.trace tbody tr', page).filter((r) => !r.classList.contains('grp') && r.cells.length >= 5); }
  /** Zeilen, die in Status- und Navigationsleiste gezählt werden (je nach Dokumentart) */
  const itemRows = () => (state.mode === 'PH' ? traceRows() : reqRows());
  const cellText = (r, i) => (r.cells[i]?.textContent || '').trim();
  function fulfilOf(r) {
    const v = cellText(r, 4).toLowerCase();
    if (!v || r.cells[4].querySelector('.ph')) return 'offen';
    if (v.startsWith('nicht')) return 'nicht erfüllt';
    if (v.startsWith('teil')) return 'teilweise';
    if (v.startsWith('abw')) return 'Abweichung';
    if (v.startsWith('erf')) return 'erfüllt';
    return 'offen';
  }
  /** Kurzstatistik als HTML (Navigationsbereich) */
  function statsHtml() {
    if (state.mode === 'PH') {
      const rows = traceRows();
      const c = { 'erfüllt': 0, teilweise: 0, 'nicht erfüllt': 0, Abweichung: 0, offen: 0 };
      rows.forEach((r) => { c[fulfilOf(r)]++; });
      return `<b>${rows.length}</b> Umsetzungszeilen<br><span class="prio-pill kann">erfüllt ${c['erfüllt']}</span><span class="prio-pill soll">teilw./Abw. ${c.teilweise + c.Abweichung}</span>` +
        `<span class="prio-pill muss">nicht ${c['nicht erfüllt']}</span><br>${c.offen} offen · ${$$('.ph', page).length} Platzhalter`;
    }
    const count = { Muss: 0, Soll: 0, Kann: 0 };
    const rows = reqRows();
    rows.forEach((r) => { const p = cellText(r, 2); if (count[p] !== undefined) count[p]++; });
    return `<b>${rows.length}</b> Anforderungen<br><span class="prio-pill muss">Muss ${count.Muss}</span><span class="prio-pill soll">Soll ${count.Soll}</span><span class="prio-pill kann">Kann ${count.Kann}</span><br>${$$('.ph', page).length} offene Platzhalter`;
  }
  function nextReqId(prefix) {
    let max = 0;
    let width = 3;
    for (const r of reqRows()) {
      const m = REQ_RE.exec(r.cells[0].textContent.trim());
      if (m && m[1] === prefix) { max = Math.max(max, +m[2]); width = Math.max(width, m[2].length); }
    }
    return prefix + String(max + 1).padStart(width, '0');
  }
  function reqRow(id, cols = 5) {
    const tr = document.createElement('tr');
    const vals = [esc(id), '<span class="ph">[Anforderung beschreiben]</span>', 'Muss', 'T', ''];
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.innerHTML = vals[i] || '<br>';
      if (!vals[i]) td.innerHTML = '<br>';
      tr.append(td);
    }
    return tr;
  }
  function traceRow(id = '<span class="ph">[LH-…]</span>', text = '<span class="ph">[Anforderung aus dem Lastenheft]</span>', prio = 'Muss', nachweis = 'T') {
    const tr = document.createElement('tr');
    tr.innerHTML = [id, text, esc(prio), '<span class="ph">[Lösung beschreiben]</span>', '<span class="ph">[offen]</span>', esc(nachweis)]
      .map((c) => `<td>${c || '<br>'}</td>`).join('');
    return tr;
  }
  function addReq() {
    const c = cellCtx();
    if (c && c.table.classList.contains('trace')) {
      const tr = traceRow();
      if (c.row.parentElement.tagName === 'THEAD') (c.table.tBodies[0] || c.table.createTBody()).prepend(tr);
      else c.row.after(tr);
      placeCaret(tr.querySelector('.ph'), true);
      changed();
      return;
    }
    if (c && c.table.classList.contains('req')) {
      const refRow = c.row.parentElement.tagName === 'THEAD' ? null : c.row;
      const sample = (refRow || c.table.tBodies[0]?.rows[0])?.cells[0]?.textContent.trim() || '';
      const m = REQ_RE.exec(sample);
      const tr = reqRow(nextReqId(m ? m[1] : 'LH-REQ-'), c.table.rows[0].cells.length);
      if (refRow) refRow.after(tr);
      else (c.table.tBodies[0] || c.table.createTBody()).prepend(tr);
      placeCaret(tr.querySelector('.ph'), true);
      changed();
      return;
    }
    if (state.mode === 'PH') {
      insertBlocks(PH_SNIPPETS.trace.build());
      return;
    }
    const id = nextReqId('LH-REQ-');
    const tbl = `<table class="req"><thead><tr><th>ID</th><th>Anforderung</th><th>Prio.</th><th>Nachweis</th><th>Bemerkung</th></tr></thead><tbody>${reqRow(id).outerHTML}</tbody></table>`;
    insertBlocks(tbl);
  }

  function showIssues(title, summary, issues) {
    const list = issues.length
      ? `<ul>${issues.map(([, id, t], i) => `<li><a href="#" data-issue="${i}">${esc(id)}</a> – ${t}</li>`).join('')}</ul>`
      : '<p>✓ Keine Auffälligkeiten gefunden.</p>';
    modal({
      title,
      html: summary + list,
      init: (body, close) => body.addEventListener('click', (e) => {
        const a = e.target.closest('[data-issue]');
        if (!a) return;
        e.preventDefault();
        close(null);
        const r = issues[+a.dataset.issue][0];
        placeCaret(r.cells[1] || r.cells[0], true);
        r.cells[0].scrollIntoView({ block: 'center' });
      }),
    });
  }

  function checkTrace() {
    const rows = traceRows();
    const ids = new Set();
    const issues = [];
    const c = { 'erfüllt': 0, teilweise: 0, 'nicht erfüllt': 0, Abweichung: 0, offen: 0 };
    for (const r of rows) {
      const id = r.cells[0].querySelector('.ph') ? '' : cellText(r, 0);
      const f = fulfilOf(r);
      c[f]++;
      if (!id) issues.push([r, '(ohne LH-ID)', 'Keine Lastenheft-ID zugeordnet']);
      else if (ids.has(id)) issues.push([r, id, 'Lastenheft-ID kommt mehrfach vor']);
      if (id) ids.add(id);
      if (!cellText(r, 3) || r.cells[3].querySelector('.ph')) issues.push([r, id || '–', 'Umsetzung / Lösung noch nicht beschrieben']);
      if (f === 'offen') issues.push([r, id || '–', 'Erfüllungsgrad offen (erfüllt / teilweise / nicht erfüllt / Abweichung)']);
      else if (cellText(r, 2) === 'Muss' && f !== 'erfüllt') issues.push([r, id, `Muss-Anforderung „${esc(f)}“ – im Kapitel „Abweichungen“ begründen und Zustimmung des AG einholen`]);
    }
    showIssues('Erfüllung prüfen',
      `<p><b>${rows.length}</b> Umsetzungszeilen: <span class="prio-pill kann">erfüllt ${c['erfüllt']}</span><span class="prio-pill soll">teilweise ${c.teilweise}</span>` +
      `<span class="prio-pill soll">Abweichung ${c.Abweichung}</span><span class="prio-pill muss">nicht erfüllt ${c['nicht erfüllt']}</span> · offen ${c.offen}</p>` +
      `<p>Offene Platzhalter im gesamten Dokument: <b>${$$('.ph', page).length}</b></p>`, issues);
  }

  function checkReqs() {
    if (state.mode === 'PH') { checkTrace(); return; }
    const rows = reqRows();
    const ids = new Map();
    const issues = [];
    const count = { Muss: 0, Soll: 0, Kann: 0 };
    for (const r of rows) {
      const id = r.cells[0].textContent.trim();
      const prio = (r.cells[2]?.textContent || '').trim();
      const verif = (r.cells[3]?.textContent || '').trim();
      if (count[prio] !== undefined) count[prio]++;
      if (!id) issues.push([r, '(ohne ID)', 'Keine ID vergeben']);
      else if (ids.has(id)) issues.push([r, id, 'ID ist doppelt vergeben']);
      ids.set(id, r);
      if (!PRIOS.includes(prio)) issues.push([r, id, `Priorität „${esc(prio) || '–'}“ ist nicht Muss/Soll/Kann`]);
      if (!verif) issues.push([r, id, 'Keine Nachweisart angegeben']);
      if (r.cells[1]?.querySelector('.ph')) issues.push([r, id, 'Enthält noch Platzhalter']);
    }
    showIssues('Anforderungsprüfung',
      `<p><b>${rows.length}</b> Anforderungen: <span class="prio-pill muss">Muss ${count.Muss}</span><span class="prio-pill soll">Soll ${count.Soll}</span><span class="prio-pill kann">Kann ${count.Kann}</span></p>` +
      `<p>Offene Platzhalter im gesamten Dokument: <b>${$$('.ph', page).length}</b></p>`, issues);
  }

  /* ===================== Felder, Gliederung, Verzeichnis ===================== */
  function updateFields() {
    for (const f of $$('.field', page)) {
      const key = f.dataset.field;
      const label = META_LABELS[key] || key;
      const v = state.meta[key];
      f.textContent = v || `[${label}]`;
      f.classList.toggle('empty', !v);
      f.contentEditable = 'false';
    }
  }

  function headings() {
    return $$('h1,h2,h3', page).filter((h) => !h.closest('.cover,.toc'));
  }
  const numberedHeadings = () => headings().filter((h) => !h.classList.contains('nonum'));

  function renumber() {
    const c = [0, 0, 0];
    for (const h of numberedHeadings()) {
      const lvl = +h.tagName[1] - 1;
      c[lvl]++;
      for (let i = lvl + 1; i < 3; i++) c[i] = 0;
      const num = c.slice(0, lvl + 1).join('.');
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 3) });
      const tn = walker.nextNode();
      if (!tn) { h.prepend(`${num} `); continue; }
      tn.nodeValue = `${num} ${tn.nodeValue.replace(/^\s*\d+(?:\.\d+)*\.?\s+(?=\S)/, '').replace(/^\s+/, '')}`;
    }
  }

  function updateToc() {
    const hs = numberedHeadings();
    hs.forEach((h, i) => { if (!h.id) h.id = `kap-${i + 1}-${Math.random().toString(36).slice(2, 6)}`; });
    for (const toc of $$('.toc', page)) {
      toc.contentEditable = 'false';
      toc.innerHTML = hs.length
        ? hs.map((h) => { const l = +h.tagName[1]; return `<p class="toc-l${l}" data-level="${l}"><a href="#${h.id}">${esc(h.textContent.trim())}</a></p>`; }).join('')
        : '<p class="ph">[Noch keine Überschriften vorhanden]</p>';
    }
  }

  function insertToc() {
    if ($('.toc', page)) { updateToc(); toast('Inhaltsverzeichnis aktualisiert.', 'ok'); changed(); return; }
    insertBlocks('<div class="toc" contenteditable="false"></div>', { focusFirstPh: false });
    updateToc();
  }

  function updateAll() {
    renumber();
    updateFields();
    updateToc();
    changed();
    toast('Nummerierung, Felder und Inhaltsverzeichnis aktualisiert.', 'ok');
  }

  /* ===================== Bilder ===================== */
  function readImage(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          if (img.naturalWidth <= MAX && file.size < 1.5e6) { resolve(fr.result); return; }
          const scale = Math.min(1, MAX / img.naturalWidth);
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.naturalWidth * scale);
          cv.height = Math.round(img.naturalHeight * scale);
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          resolve(file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  async function insertImageFile(file) {
    if (!file || !/^image\/(png|jpeg|gif)$/.test(file.type)) { toast('Bitte ein PNG-, JPEG- oder GIF-Bild wählen.', 'err'); return; }
    const url = await readImage(file);
    insertInline(`<img src="${url}" alt="${esc(file.name || 'Bild')}" style="width:80%">`);
  }
  function selectImage(img) {
    selectedImg?.classList.remove('selected');
    selectedImg = img;
    if (img) img.classList.add('selected');
    updateContext();
  }

  /* ===================== Inhalt einfügen (Einfügen) ===================== */
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP', 'P', 'BR', 'H1', 'H2', 'H3', 'H4',
    'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'A', 'IMG', 'DIV', 'SPAN', 'HR']);
  const KEEP_CLASSES = new Set(['ph', 'req', 'param', 'note', 'page-break', 'doc-title', 'nonum', 'field', 'toc', 'meta', 'cover', 'cover-kind', 'cover-sub', 'cover-note']);
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,meta,link,title,xml,o\\:p,colgroup,col').forEach((n) => n.remove());
    const walk = (el) => {
      for (const c of [...el.childNodes]) {
        if (c.nodeType === 8) { c.remove(); continue; }
        if (c.nodeType !== 1) continue;
        walk(c);
        let tag = c.tagName;
        if (tag === 'H5' || tag === 'H6') {
          const p = doc.createElement('p');
          p.append(...c.childNodes);
          c.replaceWith(p);
          continue;
        }
        if (!ALLOWED.has(tag)) { c.replaceWith(...c.childNodes); continue; }
        const keep = {
          href: tag === 'A' && /^(https?:|mailto:)/i.test(c.getAttribute('href') || '') ? c.getAttribute('href') : null,
          src: tag === 'IMG' && /^(data:image\/|https?:)/i.test(c.getAttribute('src') || '') ? c.getAttribute('src') : null,
          colspan: c.getAttribute('colspan'), rowspan: c.getAttribute('rowspan'),
          'data-field': c.getAttribute('data-field'),
          class: [...c.classList].filter((k) => KEEP_CLASSES.has(k)).join(' ') || null,
          style: tag === 'IMG' && /width:\s*\d+%/.test(c.getAttribute('style') || '') ? /width:\s*\d+%/.exec(c.getAttribute('style'))[0] : null,
        };
        for (const a of [...c.attributes]) c.removeAttribute(a.name);
        for (const [k, v] of Object.entries(keep)) if (v) c.setAttribute(k, v);
        if (tag === 'IMG' && !keep.src) { c.remove(); continue; }
        if (tag === 'SPAN' && !keep.class) c.replaceWith(...c.childNodes);
        if (keep.class === 'field') c.setAttribute('contenteditable', 'false');
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  /* ===================== Navigation & Status ===================== */
  function updateNav() {
    const filter = $('#navSearch').value.trim().toLowerCase();
    const hs = headings().filter((h) => !filter || h.textContent.toLowerCase().includes(filter));
    const list = $('#navList');
    list.innerHTML = hs.length ? '' : '<div class="nav-empty">Keine Überschriften. Formatieren Sie Text mit „Überschrift 1–3“, damit er hier erscheint.</div>';
    hs.forEach((h) => {
      const b = document.createElement('button');
      b.className = `nav-item l${h.tagName[1]}`;
      b.textContent = h.textContent.trim() || '(leer)';
      b.title = b.textContent;
      b.onclick = () => { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); placeCaret(h); };
      b._h = h;
      list.append(b);
    });
    $('#navStats').innerHTML = statsHtml();
  }

  const PRINT_PAGE_PX = (297 - 20 - 18) / 25.4 * 96;
  function pageInfo() {
    const breaks = $$('hr.page-break', page).map((b) => b.offsetTop);
    const bounds = [0, ...breaks, page.scrollHeight];
    let total = 0;
    const starts = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      starts.push([bounds[i], total]);
      total += Math.max(1, Math.ceil((bounds[i + 1] - bounds[i]) / PRINT_PAGE_PX));
    }
    let cur = 1;
    const el = nodeEl(savedRange?.startContainer);
    if (el && page.contains(el)) {
      const y = el.offsetTop;
      for (const [start, before] of starts) if (y >= start) cur = before + 1 + Math.floor((y - start) / PRINT_PAGE_PX);
    }
    return { cur: Math.min(cur, total), total };
  }

  function updateStatus() {
    const words = (page.innerText.match(/[\p{L}\p{N}][\p{L}\p{N}\-.,/]*/gu) || []).length;
    const pi = pageInfo();
    $('#stPages').textContent = `Seite ${pi.cur} von ${pi.total}`;
    $('#stWords').textContent = `${words.toLocaleString('de-DE')} Wörter`;
    $('#stReqs').textContent = `${itemRows().length} ${M().unit}`;
    $('#stSave').textContent = state.dirty ? 'Nicht gespeicherte Änderungen' : state.savedAt ? `Gespeichert ${state.savedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : '';
  }

  function updateTitle() {
    $('#docName').textContent = state.name || state.meta.titel || 'Unbenannt';
    $('#dirtyMark').textContent = state.dirty ? ' • nicht gespeichert' : '';
    document.title = `${state.name || state.meta.titel || 'Unbenannt'} – ${M().app}`;
    $('#appName').textContent = M().app;
  }

  let refreshTimer = 0;
  let autosaveTimer = 0;
  function changed() {
    state.dirty = true;
    updateTitle();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { updateNav(); updateStatus(); }, 250);
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosave, 1200);
  }
  function refreshAll() { updateFields(); updateNav(); updateStatus(); updateTitle(); }

  function autosave() {
    try {
      localStorage.setItem(M().lsKey, JSON.stringify({ name: state.name, meta: state.meta, html: cleanHtml(), dirty: state.dirty }));
    } catch (e) { /* Speicher voll (z. B. große Bilder) – Autosave überspringen */ }
  }

  /* ---------- Toolbar-Zustand ---------- */
  function updateUiState() {
    for (const b of $$('[data-state]')) {
      let on = false;
      try { on = document.queryCommandState(b.dataset.state); } catch (e) { /* ignorieren */ }
      b.classList.toggle('on', on);
    }
    const el = nodeEl(liveRange()?.startContainer);
    if (el && page.contains(el)) {
      const cs = getComputedStyle(el);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const sel = $('#fontFamily');
      const opt = [...sel.options].find((o) => o.value.toLowerCase() === fam.toLowerCase());
      sel.value = opt ? opt.value : 'Calibri';
      const pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
      const fs = $('#fontSize');
      const label = String(pt).replace('.', ',');
      if (![...fs.options].some((o) => o.value === label)) fs.add(new Option(label, label));
      fs.value = label;
      const block = currentBlock();
      let style = 'p';
      if (block) {
        if (/^H[1-3]$/.test(block.tagName)) style = block.tagName.toLowerCase();
        else if (block.classList.contains('doc-title')) style = 'title';
        if (block.closest('.note')) style = 'note';
      }
      $$('.style-tile').forEach((t) => t.classList.toggle('on', t.dataset.arg === style));
    }
    updateContext();
  }

  function updateContext() {
    const inTable = !!cellCtx();
    const tabT = $('#tabTable');
    const tabI = $('#tabImage');
    tabT.classList.toggle('hidden', !inTable);
    tabI.classList.toggle('hidden', !selectedImg);
    const active = $('.tab.active');
    if (active && active.classList.contains('hidden')) switchTab('start');
  }

  function switchTab(name) {
    $$('.tab[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
  }

  /* ===================== Zoom ===================== */
  function setZoom(z) {
    state.zoom = Math.max(50, Math.min(200, Math.round(z)));
    page.style.zoom = state.zoom / 100;
    $('#zoomRange').value = state.zoom;
    $('#zoomVal').textContent = `${state.zoom} %`;
  }
  const PAGE_PX = 210 / 25.4 * 96;
  /** Seite an die verfügbare Breite anpassen (z. B. iPad hochkant), höchstens 100 % */
  function autoFit() {
    if (!state.autoFit) return;
    const cs = getComputedStyle(canvas);
    const avail = canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
    setZoom(Math.min(100, Math.floor((avail / PAGE_PX) * 100)));
  }

  /* ===================== Speichern / Laden ===================== */
  /** Dokument-HTML ohne Editor-Zustände (z. B. Bildmarkierung) */
  function cleanHtml() {
    selectedImg?.classList.remove('selected');
    const html = page.innerHTML;
    selectedImg?.classList.add('selected');
    return html;
  }
  function serialize() {
    return { format: 'lastenheft-editor', version: 1, type: M().type, meta: state.meta, html: cleanHtml(), savedAt: new Date().toISOString() };
  }
  function loadData(data, name) {
    if (!data || typeof data.html !== 'string') throw new Error('Keine gültige Lastenheft-Datei');
    page.innerHTML = sanitizeLoaded(data.html);
    state.meta = { ...defaultMeta(), ...(data.meta || {}) };
    state.name = name || null;
    state.dirty = false;
    state.savedAt = data.savedAt ? new Date(data.savedAt) : null;
    selectImage(null);
    refreshAll();
    updateToc();
    autosave();
  }
  function sanitizeLoaded(html) {
    // gespeicherte Dateien stammen aus dem Editor; Skripte/Ereignis-Attribute trotzdem entfernen
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    tpl.content.querySelectorAll('script,iframe,object,embed').forEach((n) => n.remove());
    tpl.content.querySelectorAll('*').forEach((el) => {
      for (const a of [...el.attributes]) {
        if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
      }
    });
    const d = document.createElement('div');
    d.append(tpl.content);
    return d.innerHTML;
  }

  async function save(asNew = false) {
    let name = state.name;
    if (!name || asNew) {
      name = await askText(asNew ? 'Speichern unter' : 'Speichern', 'Dateiname', fileBase());
      if (!name) return;
      name = safeName(name);
    }
    updateFields();
    const data = serialize();
    if (state.server) {
      try {
        const r = await api('POST', `/api/save?name=${encodeURIComponent(name)}&type=${M().type}`, data);
        state.name = name;
        state.dirty = false;
        state.savedAt = new Date();
        toast(`Gespeichert: <b>${esc(r.file)}</b><br><span style="opacity:.75">${esc(r.path)}</span>`, 'ok');
      } catch (e) {
        toast(`Speichern fehlgeschlagen: ${esc(e.message)}`, 'err');
        return;
      }
    } else if (state.device) {
      try {
        await LIB.put(name, M().type, data);
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { /* optional */ });
        state.name = name;
        state.dirty = false;
        state.savedAt = new Date();
        toast(`Auf diesem Gerät gespeichert: <b>${esc(name)}</b>`, 'ok');
      } catch (e) {
        toast(`Speichern fehlgeschlagen: ${esc(e.message || e)}`, 'err');
        return;
      }
    } else {
      download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${name}.${M().type}.json`);
      state.name = name;
      state.dirty = false;
      state.savedAt = new Date();
      toast('Datei heruntergeladen. Tipp: Mit <b>start.bat</b> / <b>start.sh</b> wird direkt in den Ordner „dokumente“ gespeichert.', 'ok');
    }
    autosave();
    updateTitle();
    updateStatus();
    closeBackstage();
  }

  async function openFromServer(name, type = 'lastenheft') {
    switchMode(typeToMode(type), { quiet: true });
    if (state.dirty && !(await confirmBox('Dokument öffnen', `Nicht gespeicherte Änderungen am aktuellen ${M().label} gehen verloren. Fortfahren?`, 'Öffnen'))) return;
    try {
      let data;
      if (state.device) {
        const rec = await LIB.get(name, type);
        if (!rec) throw new Error('Dokument nicht gefunden');
        data = rec.data;
      } else data = await api('GET', `/api/load?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`);
      loadData(data, name);
      closeBackstage();
      toast(`${esc(M().label)} „${esc(name)}“ geöffnet.`, 'ok');
    } catch (e) { toast(`Öffnen fehlgeschlagen: ${esc(e.message)}`, 'err'); }
  }

  async function openLocalFile(file) {
    if (!file) return;
    const text = await file.text();
    try {
      const base = file.name.replace(/\.((lasten|pflichten)heft\.)?(json|html?)$/i, '');
      if (/\.json$/i.test(file.name)) {
        const data = JSON.parse(text);
        const type = data.type || (/\.pflichtenheft\.json$/i.test(file.name) ? 'pflichtenheft' : 'lastenheft');
        switchMode(typeToMode(type), { quiet: true });
        if (state.dirty && !(await confirmBox('Dokument öffnen', `Nicht gespeicherte Änderungen am aktuellen ${M().label} gehen verloren. Fortfahren?`, 'Öffnen'))) return;
        loadData(data, base);
      } else {
        if (state.dirty && !(await confirmBox('Dokument öffnen', 'Nicht gespeicherte Änderungen gehen verloren. Fortfahren?', 'Öffnen'))) return;
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const root = doc.querySelector('.page') || doc.body;
        loadData({ html: sanitize(root.innerHTML), meta: { titel: doc.title || base } }, base);
      }
      closeBackstage();
      toast(`„${esc(file.name)}“ geöffnet.`, 'ok');
    } catch (e) { toast(`Datei konnte nicht gelesen werden: ${esc(e.message)}`, 'err'); }
  }

  async function deleteFromServer(name, type = 'lastenheft') {
    if (!(await confirmBox('Löschen', `Soll „${esc(name)}“ wirklich gelöscht werden?`, 'Löschen'))) return;
    try {
      if (state.device) await LIB.del(name, type);
      else await api('POST', `/api/delete?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {});
      refreshDocList();
    }
    catch (e) { toast(`Löschen fehlgeschlagen: ${esc(e.message)}`, 'err'); }
  }

  function docTable(docs) {
    return `<table class="doc-table"><thead><tr><th>Name</th><th>Art</th><th>Geändert</th><th>Größe</th><th></th></tr></thead><tbody>${docs.map((d) => {
      const type = d.type || 'lastenheft';
      const pill = type === 'pflichtenheft' ? '<span class="type-pill ph">Pflichtenheft</span>' : '<span class="type-pill">Lastenheft</span>';
      return `<tr><td>📄 ${esc(d.name)}</td><td>${pill}</td><td>${new Date(d.modified * 1000).toLocaleString('de-DE')}</td><td>${(d.size / 1024).toFixed(1)} KB</td>` +
        `<td class="actions"><button data-open="${esc(d.name)}" data-type="${type}">Öffnen</button><button class="del" data-del="${esc(d.name)}" data-type="${type}">Löschen</button></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  async function refreshDocList() {
    const box = $('#docList');
    $('#btnFolder').classList.toggle('hidden', !state.server || IS_REMOTE);
    if (state.device) {
      try {
        const docs = (await LIB.list()).sort((a, b) => b.modified - a.modified);
        box.innerHTML = (docs.length ? docTable(docs) : '<p class="muted">Noch keine Dokumente in der App gespeichert.</p>') +
          '<p class="muted" style="margin-top:10px">Die Dokumente sind <b>auf diesem Gerät</b> gespeichert. Zum Austausch mit dem PC oder als Sicherung: ' +
          'Datei → Exportieren → <b>Projektdatei sichern</b> → „In Dateien sichern“ (z. B. iCloud Drive). Am PC bzw. hier über „Datei öffnen …“ wieder laden.</p>';
      } catch (e) { box.innerHTML = `<p class="muted">App-Speicher nicht verfügbar: ${esc(e.message || e)}</p>`; }
      return;
    }
    if (!state.server) {
      box.innerHTML = '<p class="muted">Der lokale Server läuft nicht (Datei direkt im Browser geöffnet). Gespeicherte <code>.lastenheft.json</code>- bzw. <code>.pflichtenheft.json</code>-Dateien können über „Datei vom Computer öffnen“ geladen werden.<br>Starten Sie <b>start.bat</b> (Windows) bzw. <b>start.sh</b> (macOS/Linux), um Dokumente direkt im Ordner <code>dokumente</code> zu verwalten.</p>';
      return;
    }
    try {
      const { docs, dir } = await api('GET', '/api/list');
      if (!docs.length) { box.innerHTML = `<p class="muted">Noch keine Dokumente gespeichert.<br>Speicherort: <code>${esc(dir)}</code></p>`; return; }
      box.innerHTML = docTable(docs) + `<p class="muted" style="margin-top:10px">Speicherort: <code>${esc(dir)}</code></p>`;
    } catch (e) { box.innerHTML = `<p class="muted">Liste konnte nicht geladen werden: ${esc(e.message)}</p>`; }
  }

  async function applyTemplate(id) {
    const tpl = M().templates.find((t) => t.id === id);
    if (!tpl) return;
    if (state.dirty && !(await confirmBox('Vorlage verwenden', `Das aktuelle ${M().label} wird durch die Vorlage „${esc(tpl.name)}“ ersetzt.<br><b>Nicht gespeicherte Änderungen gehen verloren.</b>`, 'Vorlage verwenden'))) return;
    page.innerHTML = tpl.build();
    state.meta = { ...defaultMeta(), titel: tpl.title };
    state.name = null;
    state.savedAt = null;
    selectImage(null);
    refreshAll();
    updateToc();
    state.dirty = false; // unveränderte Vorlage – nichts zu verlieren
    updateTitle();
    autosave();
    closeBackstage();
    canvas.scrollTop = 0;
    toast(`Vorlage „${esc(tpl.name)}“ geladen. Tragen Sie unter <b>Datei → Informationen</b> Titel, Projekt und Dokumentnummer ein.`, 'ok');
  }

  /* ===================== Export ===================== */
  const cssStr = (s) => `"${String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  function exportPdf() {
    updateFields();
    updateToc();
    const m = state.meta;
    const right = [m.dokNr && `Dok.-Nr. ${m.dokNr}`, m.version && `Version ${m.version}`].filter(Boolean).join(' · ');
    const left = [m.status, m.datum].filter(Boolean).join(' · ');
    const box = 'font-family: Calibri, Carlito, Arial, sans-serif; font-size: 8.5pt; color: #595959;';
    const hasCover = !!$('.cover', page);
    $('#printStyle').textContent = `@page {
      @top-left { content: ${cssStr(m.titel || 'Lastenheft')}; ${box} vertical-align: bottom; padding-bottom: 4mm; }
      @top-right { content: ${cssStr(right)}; ${box} vertical-align: bottom; padding-bottom: 4mm; }
      @bottom-left { content: ${cssStr(left)}; ${box} vertical-align: top; padding-top: 4mm; }
      @bottom-right { content: "Seite " counter(page) " von " counter(pages); ${box} vertical-align: top; padding-top: 4mm; }
    }
    ${hasCover ? '@page :first { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; } }' : ''}`;
    const oldTitle = document.title;
    document.title = fileBase();
    closeBackstage();
    const restore = () => { document.title = oldTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    if (IS_TOUCH) toast('<b>PDF auf dem iPad:</b> Im Druckdialog oben auf das Teilen-Symbol tippen → „In Dateien sichern“ (oder an eine App senden).', 'ok');
    setTimeout(() => window.print(), 50);
  }

  function buildDocx() {
    updateFields();
    updateToc();
    selectedImg?.classList.remove('selected');
    const z = page.style.zoom;
    page.style.zoom = '';
    try {
      return new Blob([LH_DOCX.build(page, state.meta)], { type: LH_DOCX.MIME });
    } finally {
      page.style.zoom = z;
      selectedImg?.classList.add('selected');
    }
  }

  async function wordOpen() {
    let blob;
    try { blob = buildDocx(); } catch (e) { console.error(e); toast(`Word-Export fehlgeschlagen: ${esc(e.message)}`, 'err'); return; }
    closeBackstage();
    if (state.device) {
      const how = await shareOrDownload(blob, `${fileBase()}.docx`);
      if (how === 'downloaded') toast('<b>Word-Datei geladen.</b> Oben rechts auf ⬇ (Downloads) tippen → Datei öffnen → Teilen → <b>Word</b>.', 'ok');
      else if (how === 'shared') toast('Word-Datei weitergegeben.', 'ok');
      return;
    }
    if (IS_REMOTE) {
      download(blob, `${fileBase()}.docx`);
      if (state.server) api('POST', `/api/docx?name=${encodeURIComponent(fileBase())}`, blob, LH_DOCX.MIME).catch(() => { /* Kopie auf dem PC optional */ });
      toast('<b>Word-Datei geladen.</b> In Safari oben rechts auf ⬇ (Downloads) tippen → Datei öffnen → Teilen → <b>Word</b>. Eine Kopie liegt zusätzlich auf dem PC im Ordner „dokumente“.', 'ok');
      return;
    }
    if (state.server) {
      try {
        const r = await api('POST', `/api/docx?name=${encodeURIComponent(fileBase())}&open=1`, blob, LH_DOCX.MIME);
        toast(r.opened
          ? `Word-Datei erstellt und geöffnet:<br><span style="opacity:.75">${esc(r.path)}</span>`
          : `Word-Datei gespeichert unter:<br><span style="opacity:.75">${esc(r.path)}</span><br>(Konnte nicht automatisch geöffnet werden: ${esc(r.error || 'keine Anwendung')})`, r.opened ? 'ok' : '');
        return;
      } catch (e) { toast(`Server-Export fehlgeschlagen (${esc(e.message)}) – Datei wird heruntergeladen.`, 'err'); }
    }
    download(blob, `${fileBase()}.docx`);
    toast('Word-Datei heruntergeladen – per Doppelklick in Word öffnen.', 'ok');
  }

  function wordDownload() {
    if (state.device) { wordOpen(); return; }
    try { download(buildDocx(), `${fileBase()}.docx`); toast('Word-Datei heruntergeladen.', 'ok'); }
    catch (e) { console.error(e); toast(`Word-Export fehlgeschlagen: ${esc(e.message)}`, 'err'); }
  }

  function collectCss() {
    let css = '';
    for (const sh of document.styleSheets) {
      try { for (const r of sh.cssRules) css += `${r.cssText}\n`; } catch (e) { /* nicht lesbar */ }
    }
    return css;
  }
  function htmlDownload() {
    updateFields();
    updateToc();
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(state.meta.titel)}</title>` +
      `<style>${collectCss()}\nbody{overflow:auto;padding:24px 0}.page .field{background:none;border:0}</style></head>` +
      `<body><div class="page">${cleanHtml().replace(/ contenteditable="(true|false)"/g, '')}</div></body></html>`;
    download(new Blob([html], { type: 'text/html' }), `${fileBase()}.html`);
  }
  function jsonDownload() {
    const blob = new Blob([JSON.stringify(serialize())], { type: 'application/json' });
    const name = `${fileBase()}.${M().type}.json`;
    if (state.device) {
      shareOrDownload(blob, name).then((how) => {
        if (how === 'shared') toast('Projektdatei weitergegeben – z. B. in iCloud Drive gesichert.', 'ok');
      });
      return;
    }
    download(blob, name);
  }

  /* ===================== Backstage ===================== */
  function openBackstage(pageName = 'new') {
    $('#backstage').classList.remove('hidden');
    showBsPage(pageName);
  }
  function closeBackstage() { $('#backstage').classList.add('hidden'); }
  function showBsPage(name) {
    $$('.bs-nav [data-bs]').forEach((b) => b.classList.toggle('on', b.dataset.bs === name));
    $$('.bs-page').forEach((p) => p.classList.toggle('on', p.dataset.bspage === name));
    if (name === 'open') refreshDocList();
    if (name === 'info') renderInfo();
    if (name === 'tablet') renderTablet();
  }

  function renderInfo(focusKey) {
    const form = $('#metaForm');
    form.innerHTML = M().fields.map((k) => {
      const label = META_LABELS[k];
      if (k === 'status') {
        return `<label>${label}</label><select name="${k}">${STATUS.map((s) => `<option${s === state.meta[k] ? ' selected' : ''}>${s}</option>`).join('')}</select>`;
      }
      return `<label>${label}</label><input name="${k}" value="${esc(state.meta[k])}">`;
    }).join('');
    const pi = pageInfo();
    $('#docStats').innerHTML = `<dl>
      <dt>Dateiname</dt><dd>${esc(state.name || '(noch nicht gespeichert)')}</dd>
      <dt>Speicherort</dt><dd>${state.server ? esc(state.docsDir) : state.device ? 'App-Speicher auf diesem Gerät' : 'Download-Ordner des Browsers'}</dd>
      <dt>Zuletzt gespeichert</dt><dd>${state.savedAt ? state.savedAt.toLocaleString('de-DE') : '–'}</dd>
      <dt>Seiten (ca.)</dt><dd>${pi.total}</dd>
      <dt>Wörter</dt><dd>${$('#stWords').textContent.replace(' Wörter', '')}</dd>
      <dt>Überschriften</dt><dd>${headings().length}</dd>
      <dt>Dokumentart</dt><dd>${M().label}</dd>
      <dt>${M().unit}</dt><dd>${statsHtml().replace(/<br>/g, ' ')}</dd>
    </dl>`;
    if (focusKey) setTimeout(() => form.querySelector(`[name="${focusKey}"]`)?.focus(), 30);
  }

  /* ===================== Popups ===================== */
  function openPopup(id, anchor) {
    closePopups();
    const pop = $(id);
    pop.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.min(r.left, innerWidth - pop.offsetWidth - 8)}px`;
    pop.style.top = `${r.bottom + 2}px`;
  }
  function closePopups() { $$('.popup').forEach((p) => p.classList.add('hidden')); }

  function buildGridPicker() {
    const gp = $('#gp');
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) {
      const s = document.createElement('span');
      s.dataset.r = r;
      s.dataset.c = c;
      gp.append(s);
    }
    gp.addEventListener('mouseover', (e) => {
      const t = e.target.closest('span');
      if (!t) return;
      const R = +t.dataset.r;
      const C = +t.dataset.c;
      gp.querySelectorAll('span').forEach((s) => s.classList.toggle('hl', +s.dataset.r <= R && +s.dataset.c <= C));
      $('#gpLabel').textContent = `Tabelle ${C} × ${R}`;
    });
    gp.addEventListener('click', (e) => {
      const t = e.target.closest('span');
      if (!t) return;
      closePopups();
      const nodes = insertBlocks(makeTable(+t.dataset.r, +t.dataset.c), { focusFirstPh: false });
      const first = nodes?.find((n) => n.tagName === 'TABLE')?.querySelector('th,td');
      if (first) placeCaret(first);
    });
  }
  function buildSymbolPicker() {
    $('#symbols').innerHTML = SYMBOLS.map((s) => `<button data-sym="${s}" title="${s}">${s}</button>`).join('');
    $('#symbols').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sym]');
      if (!b) return;
      closePopups();
      restoreSel();
      document.execCommand('insertText', false, b.dataset.sym);
      changed();
    });
  }
  function buildTemplateUI() {
    const m = M();
    $('#tplButtons').innerHTML = m.templates.map((t) =>
      `<button class="rb lg" data-cmd="template" data-arg="${t.id}" title="${esc(t.desc)}"><i data-i="${t.icon || 'template'}"></i>${esc(t.name)}</button>`).join('');
    const small = [];
    for (let i = 0; i < m.snippetsSmall.length; i += 3) {
      small.push(`<div class="rows">${m.snippetsSmall.slice(i, i + 3).map(([k, icon, label]) =>
        `<button class="rb" data-cmd="snippet" data-arg="${k}"><i data-i="${icon}"></i>${label}</button>`).join('')}</div>`);
    }
    $('#snippetButtons').innerHTML = m.snippetsLarge.map(([k, icon, label]) =>
      `<button class="rb lg" data-cmd="snippet" data-arg="${k}"><i data-i="${icon}"></i>${label}</button>`).join('') + small.join('');
    $('#tplGrid').innerHTML = m.templates.map((t) => `<button class="tpl-card" data-cmd="template" data-arg="${t.id}">
      <div class="tpl-thumb"><span class="ico"><i data-i="${t.icon || 'template'}" data-size="26"></i></span>
        <div class="k">${m.label.toUpperCase()}</div><div class="t">${esc(t.title)}</div>
        <div class="ln h"></div><div class="ln"></div><div class="ln" style="width:85%"></div><div class="ln h"></div><div class="ln"></div><div class="ln" style="width:70%"></div><div class="ln h"></div><div class="ln" style="width:90%"></div>
      </div>
      <div class="tpl-name">${esc(t.name)}</div><div class="tpl-desc">${esc(t.desc)}</div></button>`).join('');
    $('#tplGroupLabel').textContent = m.label;
    $('#bsNewKind').textContent = m.label;
    LH_renderIcons();
  }

  /* ===================== Lastenheft / Pflichtenheft umschalten ===================== */
  function applyModeUi() {
    document.body.classList.toggle('mode-ph', state.mode === 'PH');
    $('#modeLH').classList.toggle('on', state.mode === 'LH');
    $('#modePH').classList.toggle('on', state.mode === 'PH');
    $('#modeLH').setAttribute('aria-selected', String(state.mode === 'LH'));
    $('#modePH').setAttribute('aria-selected', String(state.mode === 'PH'));
  }

  /** Lädt das zuletzt bearbeitete Dokument der aktuellen Dokumentart (oder die erste Vorlage) */
  function loadModeDocument() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(M().lsKey) || 'null'); } catch (e) { saved = null; }
    if (saved && saved.html) {
      page.innerHTML = sanitizeLoaded(saved.html);
      state.meta = { ...defaultMeta(), ...saved.meta };
      state.name = saved.name || null;
      state.dirty = !!saved.dirty;
    } else {
      page.innerHTML = M().templates[0].build();
      state.meta = { ...defaultMeta(), titel: M().templates[0].title };
      state.name = null;
      state.dirty = false;
    }
    state.savedAt = null;
    return !!(saved && saved.html);
  }

  function switchMode(mode, { quiet = false } = {}) {
    if (!MODES[mode] || mode === state.mode) return;
    autosave(); // aktuelles Dokument dieser Dokumentart sichern
    selectImage(null);
    state.mode = mode;
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* kein Speicher */ }
    applyModeUi();
    loadModeDocument();
    buildTemplateUI();
    refreshAll();
    updateToc();
    canvas.scrollTop = 0;
    const open = $('.bs-page.on');
    if (!$('#backstage').classList.contains('hidden') && open) showBsPage(open.dataset.bspage);
    if (!quiet) toast(`${M().label}-Modus – Ihr ${M().label === 'Lastenheft' ? 'Pflichtenheft' : 'Lastenheft'} bleibt gesichert und erscheint beim Zurückschalten wieder.`, 'ok');
  }

  /* ===================== Anforderungen aus Lastenheft übernehmen ===================== */
  function pickLHFile() {
    return new Promise((resolve) => {
      const inp = $('#fileLH');
      inp.value = '';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) { resolve(null); return; }
        try { resolve(JSON.parse(await f.text())); } catch (e) { toast('Datei ist keine gültige Lastenheft-Datei.', 'err'); resolve(null); }
      };
      inp.click();
    });
  }

  async function importFromLH() {
    if (state.mode !== 'PH') return;
    const sources = [];
    try {
      const cur = JSON.parse(localStorage.getItem(MODES.LH.lsKey) || 'null');
      if (cur && cur.html) sources.push({ label: `Aktuelles Lastenheft im Editor: <b>${esc(cur.meta?.titel || 'Unbenannt')}</b> ${cur.meta?.dokNr ? `(${esc(cur.meta.dokNr)})` : ''}`, get: async () => cur });
    } catch (e) { /* ignorieren */ }
    if (state.server) {
      try {
        const { docs } = await api('GET', '/api/list');
        docs.filter((d) => (d.type || 'lastenheft') === 'lastenheft').forEach((d) => sources.push({
          label: `Gespeichert: <b>${esc(d.name)}</b> <span class="muted">(${new Date(d.modified * 1000).toLocaleString('de-DE')})</span>`,
          get: () => api('GET', `/api/load?name=${encodeURIComponent(d.name)}&type=lastenheft`),
        }));
      } catch (e) { /* Liste nicht verfügbar */ }
    }
    if (state.device) {
      try {
        (await LIB.list()).filter((d) => d.type === 'lastenheft').sort((a, b) => b.modified - a.modified).forEach((d) => sources.push({
          label: `In der App gespeichert: <b>${esc(d.name)}</b> <span class="muted">(${new Date(d.modified * 1000).toLocaleString('de-DE')})</span>`,
          get: async () => d.data,
        }));
      } catch (e) { /* App-Speicher nicht verfügbar */ }
    }
    sources.push({ label: 'Lastenheft-Datei wählen (.lastenheft.json, z. B. aus iCloud Drive) …', get: pickLHFile });
    const idx = await modal({
      title: 'Anforderungen aus Lastenheft übernehmen',
      html: '<p>Alle Anforderungstabellen des gewählten Lastenhefts werden – nach Kapiteln gruppiert – in die Umsetzungsmatrix übernommen. Eine vorhandene Umsetzungsmatrix wird dabei ersetzt.</p>' +
        `<div class="src-list">${sources.map((src, i) => `<label><input type="radio" name="lhsrc" value="${i}"${i === 0 ? ' checked' : ''}><span>${src.label}</span></label>`).join('')}</div>`,
      buttons: [{ label: 'Abbrechen', value: null }, { label: 'Übernehmen', primary: true, value: (b) => +(b.querySelector('input[name=lhsrc]:checked')?.value ?? -1) }],
    });
    if (idx === null || idx < 0) return;
    let data;
    try { data = await sources[idx].get(); } catch (e) { toast(`Lastenheft konnte nicht geladen werden: ${esc(e.message)}`, 'err'); return; }
    if (!data) return;
    if (data.type && data.type !== 'lastenheft') { toast('Die gewählte Datei ist kein Lastenheft.', 'err'); return; }
    applyLHImport(data);
  }

  function applyLHImport(data) {
    const tpl = document.createElement('template');
    tpl.innerHTML = sanitizeLoaded(data.html || '');
    const groups = [];
    let heading = '';
    let current = null;
    for (const el of tpl.content.querySelectorAll('h1, h2, h3, table.req')) {
      if (el.tagName !== 'TABLE') {
        if (!el.closest('.cover') && !el.classList.contains('nonum')) heading = el.textContent.trim();
        continue;
      }
      for (const r of el.querySelectorAll('tbody tr')) {
        if (r.cells.length < 2) continue;
        const id = (r.cells[0].textContent || '').trim();
        const text = sanitize(r.cells[1].innerHTML).trim();
        if (!id && !r.cells[1].textContent.trim()) continue;
        if (!current || current.title !== heading) { current = { title: esc(heading), rows: [] }; groups.push(current); }
        current.rows.push([
          esc(id) || '<span class="ph">[LH-…]</span>', text || '<br>', esc((r.cells[2]?.textContent || '').trim()),
          '<span class="ph">[Lösung beschreiben]</span>', '<span class="ph">[offen]</span>', esc((r.cells[3]?.textContent || '').trim()),
        ]);
      }
    }
    const total = groups.reduce((a, g) => a + g.rows.length, 0);
    if (!total) { toast('Im gewählten Lastenheft wurden keine Anforderungstabellen gefunden.', 'err'); return; }
    const html = PH_TRACE(groups);
    const existing = $('table.trace', page);
    if (existing) {
      const t = document.createElement('template');
      t.innerHTML = html;
      const tbl = t.content.firstElementChild;
      existing.replaceWith(tbl);
      $$('table.trace', page).slice(1).forEach((x) => x.remove());
      tbl.scrollIntoView({ block: 'start', behavior: 'smooth' });
      placeCaret(tbl.querySelector('.ph'), true);
    } else insertBlocks(html);
    const lm = data.meta || {};
    const ref = [lm.dokNr, lm.titel, lm.version && `Version ${lm.version}`, lm.datum].filter(Boolean).join(', ');
    if (ref) state.meta.bezugLH = ref;
    if (!state.meta.projekt && lm.projekt) state.meta.projekt = lm.projekt;
    if (!state.meta.auftraggeber && lm.auftraggeber) state.meta.auftraggeber = lm.auftraggeber;
    updateFields();
    changed();
    toast(`<b>${total}</b> Anforderungen aus dem Lastenheft übernommen${ref ? ` (${esc(ref)})` : ''}. Tragen Sie nun je Zeile Umsetzung und Erfüllungsgrad ein.`, 'ok');
  }

  /* ===================== Befehle ===================== */
  const commands = {
    undo: () => exec('undo'), redo: () => exec('redo'),
    cut: () => exec('cut'), copy: () => exec('copy'),
    bold: () => exec('bold'), italic: () => exec('italic'), underline: () => exec('underline'),
    strike: () => exec('strikeThrough'), sub: () => exec('subscript'), sup: () => exec('superscript'),
    clear: () => { exec('removeFormat'); exec('unlink'); },
    ul: () => exec('insertUnorderedList'), ol: () => exec('insertOrderedList'),
    indent: () => exec('indent'), outdent: () => exec('outdent'),
    left: () => exec('justifyLeft'), center: () => exec('justifyCenter'), right: () => exec('justifyRight'), justify: () => exec('justifyFull'),
    grow: () => stepFont(1), shrink: () => stepFont(-1),
    block: (a) => setBlock(a),
    snippet: (a) => { closePopups(); const s = M().snippets[a] || LH_SNIPPETS[a]; if (s) insertBlocks(s.build()); },
    mode: (a) => switchMode(a),
    importLH: importFromLH,
    template: (a) => applyTemplate(a),
    pagebreak: () => insertBlocks('<hr class="page-break"><p><br></p>', { focusFirstPh: false }),
    tablePicker: (a, el) => openPopup('#gridPicker', el),
    symbolPicker: (a, el) => openPopup('#symbolPicker', el),
    addReq, checkReqs, renumber: () => { renumber(); updateToc(); changed(); toast('Überschriften neu nummeriert.', 'ok'); },
    toc: insertToc, updateAll,
    image: () => $('#fileImage').click(),
    link: async () => {
      const r = liveRange();
      const text = r ? r.toString() : '';
      const url = await askText('Link einfügen', 'Adresse (https://…)', 'https://');
      if (!url || url === 'https://') return;
      restoreSel();
      if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
      if (text) exec('createLink', url);
      else insertInline(`<a href="${esc(url)}">${esc(url)}</a>&nbsp;`);
    },
    date: () => { restoreSel(); document.execCommand('insertText', false, today()); changed(); },
    hr: () => insertBlocks('<hr><p><br></p>', { focusFirstPh: false }),
    placeholder: () => {
      const r = liveRange();
      const t = r && !r.collapsed ? r.toString().replace(/^\[|\]$/g, '') : 'Platzhalter';
      insertInline(`<span class="ph">[${esc(t)}]</span>&#8203;`);
    },
    rowAbove: () => tableCmd('rowAbove'), rowBelow: () => tableCmd('rowBelow'),
    colLeft: () => tableCmd('colLeft'), colRight: () => tableCmd('colRight'),
    delRow: () => tableCmd('delRow'), delCol: () => tableCmd('delCol'), delTable: () => tableCmd('delTable'),
    imgWidth: (a) => { if (selectedImg) { selectedImg.style.width = `${a}%`; selectedImg.style.height = 'auto'; changed(); } },
    imgDelete: () => { if (selectedImg) { selectedImg.remove(); selectImage(null); changed(); } },
    nav: () => { $('#navpane').classList.toggle('hidden'); $('#btnNav').classList.toggle('on', !$('#navpane').classList.contains('hidden')); autoFit(); },
    markPh: () => { page.classList.toggle('mark-ph'); $('#btnPh').classList.toggle('on', page.classList.contains('mark-ph')); },
    zoom: (a) => { state.autoFit = false; setZoom(+a); },
    zoomIn: () => { state.autoFit = false; setZoom(state.zoom + 10); },
    zoomOut: () => { state.autoFit = false; setZoom(state.zoom - 10); },
    zoomFit: () => { state.autoFit = false; setZoom(((canvas.clientWidth - 48) / PAGE_PX) * 100); },
    save: () => save(false), saveAs: () => save(true),
    pdf: exportPdf, wordOpen, wordDownload, htmlDownload, jsonDownload,
    backstage: (a) => openBackstage(a || 'new'), closeBackstage,
    openFile: () => $('#fileOpen').click(),
    refreshList: refreshDocList,
    folder: async () => { try { await api('POST', '/api/open-folder', {}); } catch (e) { toast(`Ordner konnte nicht geöffnet werden: ${esc(e.message)}`, 'err'); } },
  };

  /* ===================== Ereignisse ===================== */
  function bind() {
    // Fokus im Dokument behalten, wenn Menüband-Schaltflächen geklickt werden
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('.rb:not(.color-btn), .style-tile, .qbtn, .tbtn, .popup')) e.preventDefault();
      if (!e.target.closest('.popup, [data-cmd="tablePicker"], [data-cmd="symbolPicker"]')) closePopups();
    });
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-cmd]');
      if (el && !el.closest('#gp')) {
        const fn = commands[el.dataset.cmd];
        if (fn) { e.preventDefault(); fn(el.dataset.arg, el); }
        return;
      }
      const tab = e.target.closest('.tab[data-tab]');
      if (tab) { switchTab(tab.dataset.tab); return; }
      const bs = e.target.closest('[data-bs]');
      if (bs) { showBsPage(bs.dataset.bs); return; }
      const op = e.target.closest('[data-open]');
      if (op) { openFromServer(op.dataset.open, op.dataset.type); return; }
      const del = e.target.closest('[data-del]');
      if (del) deleteFromServer(del.dataset.del, del.dataset.type);
    });

    document.addEventListener('selectionchange', () => {
      const s = getSelection();
      if (s.rangeCount && page.contains(s.anchorNode)) {
        savedRange = s.getRangeAt(0).cloneRange();
        cancelAnimationFrame(updateUiState._raf);
        updateUiState._raf = requestAnimationFrame(() => { updateUiState(); updateStatus(); });
      }
    });

    page.addEventListener('input', () => {
      if (!state.applyingFont && $('font[size="7"]', page)) convertFontTags(state.lastFontPt);
      changed();
    });

    page.addEventListener('click', (e) => {
      const img = e.target.closest('img');
      selectImage(img && page.contains(img) ? img : null);
      if (img) switchTab('imagetools');
      const f = e.target.closest('.field');
      if (f) { openBackstage('info'); renderInfo(f.dataset.field); return; }
      const ph = e.target.closest('.ph');
      if (ph && getSelection().isCollapsed && !ph.closest('.toc')) {
        const r = document.createRange();
        r.selectNodeContents(ph);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
    });
    page.addEventListener('dblclick', (e) => {
      const a = e.target.closest('.toc a');
      if (a) { const t = document.getElementById(a.getAttribute('href').slice(1)); t?.scrollIntoView({ behavior: 'smooth' }); }
    });

    // Platzhalter wie in Word: markierter Platzhalter wird beim Tippen durch normalen Text ersetzt
    page.addEventListener('beforeinput', (e) => {
      if (!/^insert(Text|ReplacementText|FromPaste|CompositionText)$/.test(e.inputType)) return;
      const s = getSelection();
      if (!s.rangeCount) return;
      const r = s.getRangeAt(0);
      const ph = nodeEl(r.startContainer)?.closest('.ph');
      if (!ph || r.collapsed || !ph.contains(r.endContainer) || r.toString() !== ph.textContent) return;
      const t = document.createTextNode(ph.textContent);
      ph.replaceWith(t);
      const nr = document.createRange();
      nr.selectNodeContents(t);
      s.removeAllRanges();
      s.addRange(nr);
    });

    page.addEventListener('paste', async (e) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); for (const f of files) await insertImageFile(f); return; }
      const html = e.clipboardData?.getData('text/html');
      if (!html) return;
      e.preventDefault();
      document.execCommand('insertHTML', false, sanitize(html));
      updateFields();
      changed();
    });
    page.addEventListener('dragover', (e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault(); });
    page.addEventListener('drop', async (e) => {
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (pos) { const s = getSelection(); s.removeAllRanges(); s.addRange(pos); savedRange = pos.cloneRange(); }
      for (const f of files) await insertImageFile(f);
    });

    page.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const c = cellCtx();
        e.preventDefault();
        if (c) {
          const cells = $$('th,td', c.table);
          let i = cells.indexOf(c.cell) + (e.shiftKey ? -1 : 1);
          if (i >= cells.length) { tableOps.rowBelow({ ...c, row: c.table.rows[c.table.rows.length - 1] }); changed(); return; }
          if (i < 0) i = 0;
          placeCaret(cells[i], true);
          return;
        }
        if (nodeEl(liveRange()?.startContainer)?.closest('li')) { exec(e.shiftKey ? 'outdent' : 'indent'); return; }
        document.execCommand('insertText', false, '    ');
        return;
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commands.pagebreak(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImg) { e.preventDefault(); commands.imgDelete(); }
      }
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        const map = { l: 'left', e: 'center', r: 'right', j: 'justify', k: 'link' };
        if (map[k] && !e.shiftKey && !e.altKey) { e.preventDefault(); commands[map[k]](); }
        if (e.shiftKey && (k === '>' || k === '.')) { e.preventDefault(); stepFont(1); }
        if (e.shiftKey && (k === '<' || k === ',')) { e.preventDefault(); stepFont(-1); }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!$('#modal').classList.contains('hidden')) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(e.shiftKey); }
      else if ((e.ctrlKey || e.metaKey) && k === 'p') { e.preventDefault(); exportPdf(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'o') { e.preventDefault(); openBackstage('open'); }
      else if (e.key === 'F9') { e.preventDefault(); updateAll(); }
      else if (e.key === 'F12') { e.preventDefault(); save(true); }
      else if (e.key === 'Escape') { closePopups(); closeBackstage(); }
    });

    $('#fontFamily').addEventListener('change', (e) => { exec('fontName', e.target.value); });
    $('#fontSize').addEventListener('change', (e) => applyFontSize(parseFloat(e.target.value.replace(',', '.'))));
    $('#foreColor').addEventListener('input', (e) => { $('#fcBar').style.background = e.target.value; });
    $('#foreColor').addEventListener('change', (e) => exec('foreColor', e.target.value));
    $('#hiliteColor').addEventListener('input', (e) => { $('#hcBar').style.background = e.target.value; });
    $('#hiliteColor').addEventListener('change', (e) => exec('hiliteColor', e.target.value));
    $('#zoomRange').addEventListener('input', (e) => setZoom(+e.target.value));
    $('#navSearch').addEventListener('input', updateNav);
    $('#fileOpen').addEventListener('change', (e) => { openLocalFile(e.target.files[0]); e.target.value = ''; });
    $('#fileImage').addEventListener('change', (e) => { insertImageFile(e.target.files[0]); e.target.value = ''; });
    canvas.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZoom(state.zoom + (e.deltaY < 0 ? 10 : -10)); } }, { passive: false });

    $('#metaForm').addEventListener('input', (e) => {
      const k = e.target.name;
      if (!k) return;
      state.meta[k] = e.target.value;
      updateFields();
      changed();
    });

    window.addEventListener('beforeunload', (e) => {
      autosave();
      if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  async function renderTablet() {
    const box = $('#tabletInfo');
    if (state.device) {
      box.innerHTML = `<div class="tablet-box"><p>${IS_STANDALONE ? 'Sie verwenden den Editor als <b>App</b>.' : 'Sie verwenden den Editor im Browser.'} Er läuft vollständig auf diesem Gerät – auch ohne Internet und ohne PC.</p><ul class="steps">
        ${IS_STANDALONE ? '' : '<li><b>Als App installieren:</b> In Safari auf Teilen → <b>Zum Home-Bildschirm</b> → Hinzufügen. Danach startet der Editor über das App-Symbol im Vollbild.</li>'}
        <li><b>Speichern</b> legt das Dokument im App-Speicher dieses Geräts ab (Datei → Öffnen zeigt alle Dokumente). Die Dokumente verlassen das Gerät nicht.</li>
        <li><b>Word:</b> „Word-Datei“ öffnet das Teilen-Menü → <b>Word</b> wählen (oder „In Dateien sichern“).</li>
        <li><b>PDF:</b> „PDF“ öffnet den Druckdialog → oben auf das Teilen-Symbol → <b>In Dateien sichern</b>.</li>
        <li><b>Austausch mit dem PC / Sicherung:</b> Datei → Exportieren → <b>Projektdatei sichern</b> → „In Dateien sichern“ (z. B. iCloud Drive). Am PC unter Datei → Öffnen → „Datei vom Computer öffnen“ laden – und umgekehrt hier über „Datei öffnen …“.</li>
        <li>Tipp: Wichtige Dokumente regelmäßig als Projektdatei in iCloud sichern. Wird die App vom Home-Bildschirm gelöscht, löscht iPadOS auch ihren Speicher.</li></ul></div>`;
      return;
    }
    if (IS_REMOTE) {
      box.innerHTML = `<div class="tablet-box"><p>Dieses Gerät ist mit dem Editor auf dem PC verbunden (<b>${esc(location.host)}</b>).</p><ul class="steps">
        <li>Dokumente werden auf dem PC im Ordner <code>dokumente</code> gespeichert – PC und iPad sehen dieselben Dateien (Datei → Öffnen).</li>
        <li><b>Word:</b> „Word-Datei“ lädt die .docx herunter. Danach in Safari oben rechts auf ⬇ (Downloads) tippen → Datei öffnen → Teilen → <b>Word</b>.</li>
        <li><b>PDF:</b> „PDF“ öffnet den Druckdialog. Dort oben auf das Teilen-Symbol tippen → <b>In Dateien sichern</b>.</li>
        <li><b>Wie eine App starten:</b> In Safari auf Teilen → <b>Zum Home-Bildschirm</b>.</li>
        <li>Der PC muss eingeschaltet sein und das schwarze Server-Fenster geöffnet bleiben.</li></ul></div>`;
      return;
    }
    if (!state.server) {
      box.innerHTML = '<div class="tablet-box"><p>Der lokale Server läuft nicht. Starten Sie <b>start.bat</b> (Windows) bzw. <b>start.command</b> (Mac) – danach erscheinen hier Adresse, Zugangscode und QR-Code für das iPad.</p></div>';
      return;
    }
    box.innerHTML = '<p class="muted">Lade Verbindungsdaten …</p>';
    let info;
    try { info = await api('GET', '/api/connect-info'); } catch (e) { box.innerHTML = `<p class="muted">Verbindungsdaten nicht verfügbar: ${esc(e.message)}</p>`; return; }
    if (!info.lan) {
      box.innerHTML = '<div class="tablet-box"><p>Der Zugriff von anderen Geräten ist ausgeschaltet (Server mit <code>LH_LAN=0</code> gestartet). Starten Sie den Server normal über start.bat / start.command.</p></div>';
      return;
    }
    if (!info.urls.length) {
      box.innerHTML = '<div class="tablet-box"><p>Es wurde keine Netzwerkadresse gefunden. Ist der PC mit dem WLAN bzw. Netzwerk verbunden? Danach den Server neu starten.</p></div>';
      return;
    }
    const main = info.urls[0];
    const others = info.urls.slice(1);
    box.innerHTML = `<div class="tablet-grid">
      <div class="qr-box">${LH_QR(`${main}?key=${info.pin}`)}<div class="muted">Mit der iPad-Kamera scannen</div></div>
      <div class="tablet-box">
        <h2 style="margin-top:0">So verbinden Sie Ihr iPad</h2>
        <ol class="steps">
          <li>iPad und PC müssen im <b>selben WLAN</b> sein.</li>
          <li>Die <b>Kamera-App</b> auf dem iPad öffnen und den QR-Code scannen – fertig.<br>
            Oder in Safari diese Adresse eingeben:<div class="tablet-big">${esc(main)}</div>
            und den Zugangscode eingeben: <span class="tablet-pin">${esc(info.pin)}</span></li>
          <li>Tipp: In Safari auf Teilen → <b>Zum Home-Bildschirm</b> – dann startet der Editor wie eine App.</li>
        </ol>
        ${others.length ? `<p>Falls die Adresse nicht funktioniert, eine dieser probieren: ${others.map((u) => `<code>${esc(u)}</code>`).join(', ')}</p>` : ''}
        <h2>Falls das iPad die Seite nicht lädt</h2>
        <ul class="steps">
          <li>Beim ersten Start fragt die <b>Windows-Firewall</b> nach – „<b>Zugriff zulassen</b>“ für private Netzwerke wählen. Wurde das abgelehnt: Windows-Sicherheit → Firewall- &amp; Netzwerkschutz → „Zugriff von App durch die Firewall zulassen“ → <b>Python</b> bzw. <b>Windows PowerShell</b> bei „Privat“ anhaken.</li>
          <li>Das WLAN muss in Windows als <b>privates Netzwerk</b> eingestellt sein (Einstellungen → Netzwerk und Internet → WLAN → Ihr Netzwerk → Netzwerkprofiltyp „Privat“).</li>
          <li>Gäste-WLANs trennen Geräte voneinander – iPad und PC ins normale WLAN.</li>
          <li>Der PC darf nicht im Energiesparmodus sein, und das Server-Fenster muss geöffnet bleiben.</li>
        </ul>
        <p class="muted">Der Zugangscode steht auch in <code>zugangscode.txt</code> im Programmordner. Wer ihn kennt, kann im selben WLAN auf Ihre Dokumente zugreifen. Für einen neuen Code: Datei löschen und Server neu starten (danach iPad neu verbinden).</p>
      </div></div>`;
  }

  async function checkServer() {
    const el = $('#serverState');
    try {
      const r = await api('GET', '/api/ping');
      state.server = true;
      state.docsDir = r.docsDir;
      el.classList.add('on');
      if (IS_REMOTE) {
        el.textContent = 'Mit PC verbunden';
        el.title = `Verbunden mit ${location.host} – Dokumente auf dem PC in: ${r.docsDir}`;
      } else {
        el.textContent = 'Lokaler Server verbunden';
        el.title = `Dokumente werden gespeichert in: ${r.docsDir}`;
        try {
          const ci = await api('GET', '/api/connect-info');
          if (ci.lan && ci.urls.length) {
            el.textContent = 'Server aktiv · iPad verbinden';
            el.title = `iPad: ${ci.urls[0]} · Zugangscode ${ci.pin} – klicken für QR-Code`;
          }
        } catch (e) { /* ältere Server-Version */ }
      }
    } catch (e) {
      state.server = false;
      state.device = IS_APP_HOST && 'indexedDB' in window;
      if (state.device) {
        document.body.classList.add('remote'); // Beschriftungen wie auf dem iPad („Word-Datei“)
        el.classList.add('on');
        el.textContent = IS_STANDALONE ? 'App · Speicher auf diesem Gerät' : 'Speicher auf diesem Gerät';
        el.title = 'Dokumente werden im App-Speicher dieses Geräts gespeichert – ohne PC und ohne Internet.';
        return;
      }
      el.classList.remove('on');
      el.textContent = 'Offline-Modus (Download)';
      el.title = 'Kein lokaler Server – Speichern und Word-Export erfolgen als Download. Starten Sie start.bat / start.sh.';
    }
  }

  /* ===================== Start ===================== */
  function init() {
    LH_renderIcons();
    buildGridPicker();
    buildSymbolPicker();
    bind();
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, true); } catch (e) { /* ältere Browser */ }
    document.body.classList.toggle('remote', IS_REMOTE);
    // Auf schmalen Bildschirmen (iPad hochkant) Navigationsbereich zunächst ausblenden
    if (window.innerWidth < 1100) $('#navpane').classList.add('hidden');
    $('#btnNav').classList.toggle('on', !$('#navpane').classList.contains('hidden'));
    let fitTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(autoFit, 150); });

    applyModeUi();
    buildTemplateUI();
    const restored = loadModeDocument();
    refreshAll();
    updateToc();
    setZoom(100);
    autoFit();
    checkServer();
    if (IS_APP_HOST && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* App läuft auch ohne Offline-Speicher */ });
    }
    if (IS_APP_HOST && IS_TOUCH && !IS_STANDALONE) {
      setTimeout(() => toast('<b>Als App installieren:</b> In Safari auf Teilen → „Zum Home-Bildschirm“.', 'ok'), 1500);
    }
    if (!restored) openBackstage('new');
    else toast('Letzte Sitzung wiederhergestellt.', 'ok');
  }

  init();
})();
