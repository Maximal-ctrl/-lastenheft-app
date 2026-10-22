/*
 * HTML → DOCX (Office Open XML) – ohne externe Bibliotheken.
 * Wandelt den Editor-Inhalt in echte Word-Absätze, Formatvorlagen (Überschrift 1–3),
 * Listen, Tabellen, Bilder, Hyperlinks, Kopf-/Fußzeile und ein Word-Inhaltsverzeichnis um.
 */
(function () {
  'use strict';

  const enc = new TextEncoder();
  const xesc = (s) => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------- ZIP (stored) ---------------------------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zip(files) {
    const now = new Date();
    const dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true); // UTF-8-Dateinamen
      lh.setUint16(8, 0, true); // keine Kompression
      lh.setUint16(10, dtime, true);
      lh.setUint16(12, ddate, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dtime, true);
      ch.setUint16(14, ddate, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    const all = [...chunks, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
    let pos = 0;
    for (const a of all) { out.set(a, pos); pos += a.length; }
    return out;
  }

  /* ---------------------------- Hilfen ---------------------------- */
  const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'HR',
    'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'FIGURE', 'NAV', 'ASIDE']);
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const CONTENT_W = 9355; // A4 (11906) − 2,5 cm − 2 cm Rand, in Twips

  // Zeichenformat der Word-Formatvorlagen – alles, was im Editor davon abweicht, wird als direkte Formatierung exportiert
  const NORMAL = { bold: false, italic: false, color: '1F1F1F', size: 22, font: 'Calibri' };
  const STYLE_BASE = {
    Normal: NORMAL, ListParagraph: NORMAL, TableText: { ...NORMAL, size: 20 },
    Heading1: { ...NORMAL, bold: true, color: '1F3864', size: 32 },
    Heading2: { ...NORMAL, bold: true, color: '2F5496', size: 26 },
    Heading3: { ...NORMAL, bold: true, color: '2F5496', size: 24 },
    Heading4: { ...NORMAL, bold: true, italic: true, color: '2F5496', size: 22 },
    UeberschriftOhneNr: { ...NORMAL, bold: true, color: '1F3864', size: 32 },
    Title: { ...NORMAL, bold: true, color: '1F3864', size: 56 },
    Subtitle: { ...NORMAL, bold: true, color: '2F5496', size: 28 },
  };

  function hex(color) {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(color || '');
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const firstFont = (f) => (f || '').split(',')[0].replace(/["']/g, '').trim();

  class Converter {
    constructor(root, meta) {
      this.root = root;
      this.meta = meta || {};
      this.rels = [];
      this.media = [];
      this.nums = []; // {numId, start}
      this.nextNum = 2;
      this.relCount = 10;
      this.imgCount = 0;
      this.hasToc = false;
      this.styleCache = new Map();
      const rootStyle = getComputedStyle(root);
      this.contentPx = root.clientWidth - parseFloat(rootStyle.paddingLeft) - parseFloat(rootStyle.paddingRight);
    }

    rel(type, target, external) {
      const id = 'rId' + (++this.relCount);
      this.rels.push({ id, type: `${REL}/${type}`, target, external });
      return id;
    }

    cs(el) {
      let s = this.styleCache.get(el);
      if (!s) { s = getComputedStyle(el); this.styleCache.set(el, s); }
      return s;
    }

    /* Zeicheneigenschaften eines Elements (vererbte + nicht vererbte bis zum Block) */
    props(el, block) {
      const s = this.cs(el);
      const p = {
        bold: (parseInt(s.fontWeight, 10) || 400) >= 600,
        italic: s.fontStyle === 'italic' || s.fontStyle === 'oblique',
        color: hex(s.color),
        size: Math.round(parseFloat(s.fontSize) * 1.5), // px → halbe Punkt
        font: firstFont(s.fontFamily),
        underline: false, strike: false, bg: null, va: null,
      };
      for (let e = el; e && e !== block && e !== this.root; e = e.parentElement) {
        const es = this.cs(e);
        const deco = es.textDecorationLine || es.textDecoration || '';
        if (deco.includes('underline')) p.underline = true;
        if (deco.includes('line-through')) p.strike = true;
        if (!p.bg && !e.classList.contains('field') && !e.classList.contains('ph')) p.bg = hex(es.backgroundColor);
        if (!p.va) {
          if (e.tagName === 'SUB' || es.verticalAlign === 'sub') p.va = 'subscript';
          else if (e.tagName === 'SUP' || es.verticalAlign === 'super') p.va = 'superscript';
        }
      }
      return p;
    }

    rPr(p, base, opt) {
      let x = '';
      if (opt.link) x += '<w:rStyle w:val="Hyperlink"/>';
      if (p.font && p.font !== base.font) x += `<w:rFonts w:ascii="${xesc(p.font)}" w:hAnsi="${xesc(p.font)}" w:cs="${xesc(p.font)}"/>`;
      if (p.bold && !base.bold) x += '<w:b/>';
      else if (!p.bold && base.bold) x += '<w:b w:val="0"/>';
      if (p.italic && !base.italic) x += '<w:i/>';
      else if (!p.italic && base.italic) x += '<w:i w:val="0"/>';
      if (p.strike) x += '<w:strike/>';
      if (!opt.link && p.color && p.color !== base.color) x += `<w:color w:val="${p.color}"/>`;
      if (p.size && p.size !== base.size && !p.va) x += `<w:sz w:val="${p.size}"/><w:szCs w:val="${p.size}"/>`;
      if (!opt.link && p.underline) x += '<w:u w:val="single"/>';
      if (p.bg) x += `<w:shd w:val="clear" w:color="auto" w:fill="${p.bg}"/>`;
      if (p.va) x += `<w:vertAlign w:val="${p.va}"/>`;
      return x ? `<w:rPr>${x}</w:rPr>` : '';
    }

    /* ---------- Inline-Inhalt → Runs ---------- */
    collect(node, block, segs, link) {
      if (node.nodeType === 3) {
        if (node.nodeValue) segs.push({ text: node.nodeValue, el: node.parentElement, link });
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      if (this.cs(node).display === 'none') return;
      if (tag === 'BR') { segs.push({ br: true, link }); return; }
      if (tag === 'IMG') { segs.push({ raw: this.image(node), link }); return; }
      if (tag === 'A') {
        const href = node.getAttribute('href') || '';
        if (/^(https?:|mailto:|file:)/i.test(href)) link = this.rel('hyperlink', href, true);
      }
      for (const c of node.childNodes) this.collect(c, block, segs, link);
    }

    runs(nodes, block, opt = {}) {
      const segs = [];
      for (const n of nodes) this.collect(n, block, segs, null);
      // HTML-Leerraum zusammenfassen
      let prevSpace = true;
      for (const s of segs) {
        if (s.br) { prevSpace = true; continue; }
        if (s.raw) { prevSpace = false; continue; }
        let t = s.text.replace(/[ \t\n\r\f]+/g, ' ');
        if (prevSpace && t.startsWith(' ')) t = t.slice(1);
        if (t) prevSpace = t.endsWith(' ');
        s.text = t;
      }
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (s.br || s.raw) break;
        s.text = s.text.replace(/ +$/, '');
        if (s.text) break;
      }
      // Ein abschließendes <br> in einem Block erzeugt in HTML keine leere Zeile
      while (segs.length && segs[segs.length - 1].br) segs.pop();

      const base = opt.base || NORMAL;
      let xml = '';
      let openLink = null;
      for (const s of segs) {
        if (s.link !== openLink) {
          if (openLink) xml += '</w:hyperlink>';
          if (s.link) xml += `<w:hyperlink r:id="${s.link}" w:history="1">`;
          openLink = s.link;
        }
        if (s.br) { xml += '<w:r><w:br/></w:r>'; continue; }
        if (s.raw) { xml += s.raw; continue; }
        if (!s.text) continue;
        const rpr = this.rPr(this.props(s.el, block), base, { ...opt, link: !!s.link });
        xml += `<w:r>${rpr}<w:t xml:space="preserve">${xesc(s.text)}</w:t></w:r>`;
      }
      if (openLink) xml += '</w:hyperlink>';
      return xml;
    }

    /* ---------- Absätze ---------- */
    paragraph(el, nodes, ctx) {
      const tag = el.tagName;
      const s = this.cs(el);
      let style = 'Normal';
      if (/^H[1-6]$/.test(tag)) style = el.classList.contains('nonum') ? 'UeberschriftOhneNr' : `Heading${Math.min(+tag[1], 4)}`;
      else if (el.classList.contains('doc-title')) style = 'Title';
      else if (el.classList.contains('cover-kind')) style = 'Subtitle';
      else if (ctx.numPr) style = 'ListParagraph';
      else if (ctx.cell) style = 'TableText';
      let ppr = style === 'Normal' ? '' : `<w:pStyle w:val="${style}"/>`;

      if (ctx.numPr) ppr += `<w:numPr><w:ilvl w:val="${ctx.numPr.ilvl}"/><w:numId w:val="${ctx.numPr.numId}"/></w:numPr>`;
      if (ctx.note) {
        ppr += '<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="2F5496"/></w:pBdr>' +
          '<w:shd w:val="clear" w:color="auto" w:fill="EEF3FB"/>';
      }
      const ml = parseFloat(el.style.marginLeft) || 0;
      const ind = (ctx.indent || 0) + Math.round(ml * 15);
      if (ind && !ctx.numPr) ppr += `<w:ind w:left="${ind}"/>`;
      const ta = s.textAlign;
      const jc = ta === 'center' ? 'center' : (ta === 'right' || ta === 'end') ? 'right' : ta === 'justify' ? 'both' : null;
      if (jc) ppr += `<w:jc w:val="${jc}"/>`;
      const runs = this.runs(nodes, el, { base: STYLE_BASE[style] });
      return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${runs}</w:p>`;
    }

    blocks(parent, ctx) {
      let out = '';
      let pending = [];
      const flush = () => {
        const meaningful = pending.some((n) => n.nodeType === 1 || (n.nodeType === 3 && /\S| /.test(n.nodeValue)));
        if (meaningful) out += this.paragraph(parent, pending, ctx);
        pending = [];
      };
      for (const n of parent.childNodes) {
        if (n.nodeType === 1 && BLOCK.has(n.tagName)) {
          flush();
          out += this.block(n, ctx);
        } else if (n.nodeType === 1 || n.nodeType === 3) pending.push(n);
      }
      flush();
      return out;
    }

    block(el, ctx) {
      const tag = el.tagName;
      if (this.cs(el).display === 'none') return '';
      if (el.classList.contains('page-break')) return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (tag === 'HR') return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A6A6A6"/></w:pBdr></w:pPr></w:p>';
      if (tag === 'TABLE') return this.table(el, ctx);
      if (tag === 'UL' || tag === 'OL') return this.list(el, ctx, 0);
      if (el.classList.contains('toc')) return this.toc(el);
      if (el.classList.contains('note')) {
        return [...el.children].some((c) => BLOCK.has(c.tagName))
          ? this.blocks(el, { ...ctx, note: true })
          : this.paragraph(el, [...el.childNodes], { ...ctx, note: true });
      }
      if (tag === 'BLOCKQUOTE') return this.blocks(el, { ...ctx, indent: (ctx.indent || 0) + 720 });
      // Browser verschachteln beim Bearbeiten teils Listen/Absätze in <p> – dann blockweise zerlegen
      const hasBlockChild = [...el.children].some((c) => BLOCK.has(c.tagName));
      if (tag === 'PRE' || !hasBlockChild) return this.paragraph(el, [...el.childNodes], ctx);
      return this.blocks(el, ctx);
    }

    /* ---------- Listen ---------- */
    list(el, ctx, level) {
      let numId = 1;
      if (el.tagName === 'OL') {
        numId = this.nextNum++;
        this.nums.push({ numId, start: parseInt(el.getAttribute('start'), 10) || 1 });
      }
      let out = '';
      for (const child of el.children) {
        if (child.tagName === 'UL' || child.tagName === 'OL') { out += this.list(child, ctx, level + 1); continue; }
        if (child.tagName !== 'LI') { out += this.block(child, ctx); continue; }
        let pending = [];
        let first = true;
        const flush = () => {
          if (!pending.length) return;
          const lctx = first ? { ...ctx, numPr: { numId, ilvl: Math.min(level, 8) } } : { ...ctx, indent: 720 * (level + 1) };
          out += this.paragraph(child, pending, lctx);
          pending = [];
          first = false;
        };
        for (const n of child.childNodes) {
          if (n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) { flush(); out += this.list(n, ctx, level + 1); }
          else if (n.nodeType === 1 && BLOCK.has(n.tagName)) { pending.push(...n.childNodes); flush(); }
          else pending.push(n);
        }
        if (first && !pending.length) pending.push(document.createTextNode(''));
        flush();
      }
      return out;
    }

    /* ---------- Tabellen ---------- */
    table(tbl, ctx) {
      const rows = [...tbl.rows].filter((r) => this.cs(r).display !== 'none' && this.cs(r.parentElement).display !== 'none');
      if (!rows.length) return '';
      let cols = 0;
      for (const r of rows) cols = Math.max(cols, [...r.cells].reduce((a, c) => a + (c.colSpan || 1), 0));
      // Der Export läuft mit Zoom 100 %, Pixelmaße entsprechen also dem Seitenlayout
      const tblPx = tbl.getBoundingClientRect().width;
      const totalW = Math.round(CONTENT_W * Math.min(1, tblPx / (this.contentPx || tblPx || 1)));
      // Spaltenbreiten aus der ersten vollständigen Zeile übernehmen
      let grid = null;
      const full = rows.find((r) => r.cells.length === cols);
      if (full) {
        const widths = [...full.cells].map((c) => c.getBoundingClientRect().width);
        const sum = widths.reduce((a, b) => a + b, 0) || 1;
        grid = widths.map((w) => Math.max(300, Math.round((w / sum) * totalW)));
      } else grid = Array(cols).fill(Math.round(totalW / cols));

      let xml = `<w:tbl><w:tblPr><w:tblStyle w:val="LHTabelle"/><w:tblW w:w="${totalW}" w:type="dxa"/>` +
        '<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>' +
        `<w:tblGrid>${grid.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
      for (const r of rows) {
        const header = r.parentElement.tagName === 'THEAD' || [...r.cells].every((c) => c.tagName === 'TH');
        xml += `<w:tr><w:trPr><w:cantSplit/>${header ? '<w:tblHeader/>' : ''}</w:trPr>`;
        let ci = 0;
        for (const c of r.cells) {
          const span = Math.min(c.colSpan || 1, cols - ci);
          const w = grid.slice(ci, ci + span).reduce((a, b) => a + b, 0);
          ci += span;
          const fill = hex(this.cs(c).backgroundColor) || hex(this.cs(r).backgroundColor);
          let content = this.blocks(c, { ...ctx, cell: true, indent: 0, numPr: null });
          if (!content || content.endsWith('</w:tbl>')) content += '<w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr></w:p>';
          const va = this.cs(c).verticalAlign;
          xml += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}` +
            `${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}` +
            `${va === 'middle' ? '<w:vAlign w:val="center"/>' : ''}</w:tcPr>${content}</w:tc>`;
        }
        // fehlende Zellen auffüllen, damit das Raster gültig bleibt
        for (; ci < cols; ci++) xml += `<w:tc><w:tcPr><w:tcW w:w="${grid[ci]}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;
        xml += '</w:tr>';
      }
      return xml + '</w:tbl>';
    }

    /* ---------- Bilder ---------- */
    image(img) {
      const m = /^data:image\/(png|jpe?g|gif);base64,(.+)$/i.exec(img.getAttribute('src') || '');
      if (!m) return '<w:r><w:t>[Bild]</w:t></w:r>';
      const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const n = ++this.imgCount;
      const file = `media/bild${n}.${ext}`;
      this.media.push({ name: `word/${file}`, data: bytes });
      const rid = this.rel('image', file);
      const rect = img.getBoundingClientRect();
      let wPx = rect.width || img.naturalWidth || 300;
      let hPx = rect.height || img.naturalHeight || 200;
      const maxPx = CONTENT_W / 15; // Twips → px
      if (wPx > maxPx) { hPx *= maxPx / wPx; wPx = maxPx; }
      const cx = Math.round(wPx * 9525);
      const cy = Math.round(hPx * 9525);
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
        `<wp:docPr id="${n}" name="Bild ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
        `<pic:nvPicPr><pic:cNvPr id="${n}" name="bild${n}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    }

    /* ---------- Inhaltsverzeichnis als echtes Word-Feld ---------- */
    toc(el) {
      this.hasToc = true;
      const entries = [...el.querySelectorAll('[data-level]')].map((e) => ({ lvl: +e.dataset.level, text: e.textContent.trim() }));
      const begin = '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>';
      const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
      if (!entries.length) {
        return `<w:p>${begin}<w:r><w:t>Inhaltsverzeichnis: Rechtsklick → Feld aktualisieren (F9)</w:t></w:r>${end}</w:p>`;
      }
      return entries.map((e, i) => {
        const pre = i === 0 ? begin : '';
        const post = i === entries.length - 1 ? end : '';
        return `<w:p><w:pPr><w:pStyle w:val="TOC${Math.min(e.lvl, 3)}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${CONTENT_W}"/></w:tabs></w:pPr>` +
          `${pre}<w:r><w:t xml:space="preserve">${xesc(e.text)}</w:t></w:r>${post}</w:p>`;
      }).join('');
    }

    /* ---------- Paketteile ---------- */
    documentXml() {
      let body = this.blocks(this.root, {});
      body = body.replace(/<\/w:tbl><w:tbl>/g, '</w:tbl><w:p/><w:tbl>');
      if (!body || body.endsWith('</w:tbl>')) body += '<w:p/>';
      const hasCover = !!this.root.querySelector('.cover');
      this.headerId = this.rel('header', 'header1.xml');
      this.footerId = this.rel('footer', 'footer1.xml');
      const sect = `<w:sectPr><w:headerReference w:type="default" r:id="${this.headerId}"/><w:footerReference w:type="default" r:id="${this.footerId}"/>` +
        '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1134" w:left="1417" w:header="709" w:footer="567" w:gutter="0"/>' +
        `${hasCover ? '<w:titlePg/>' : ''}</w:sectPr>`;
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        `<w:body>${body}${sect}</w:body></w:document>`;
    }

    headerXml() {
      const m = this.meta;
      const right = [m.dokNr && `Dok.-Nr. ${m.dokNr}`, m.version && `Version ${m.version}`].filter(Boolean).join(' · ');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<w:p><w:pPr><w:pStyle w:val="Header"/><w:tabs><w:tab w:val="right" w:pos="${CONTENT_W}"/></w:tabs>` +
        '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="A6A6A6"/></w:pBdr></w:pPr>' +
        `<w:r><w:t xml:space="preserve">${xesc(m.titel || 'Lastenheft')}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:t xml:space="preserve">${xesc(right)}</w:t></w:r></w:p></w:hdr>`;
    }

    footerXml() {
      const m = this.meta;
      const left = [m.status, m.datum].filter(Boolean).join(' · ');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="${CONTENT_W}"/></w:tabs>` +
        '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="A6A6A6"/></w:pBdr></w:pPr>' +
        `<w:r><w:t xml:space="preserve">${xesc(left)}</w:t></w:r><w:r><w:tab/></w:r>` +
        '<w:r><w:t xml:space="preserve">Seite </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>' +
        '<w:r><w:t xml:space="preserve"> von </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>';
    }

    numberingXml() {
      const bullets = ['•', '◦', '▪', '•', '◦', '▪', '•', '◦', '▪'];
      const fmts = ['decimal', 'lowerLetter', 'lowerRoman', 'decimal', 'lowerLetter', 'lowerRoman', 'decimal', 'lowerLetter', 'lowerRoman'];
      const lvl = (i, fmt, text) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/>` +
        `<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${360 * (i + 1) + 360}" w:hanging="360"/></w:pPr></w:lvl>`;
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
      x += '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' +
        bullets.map((b, i) => lvl(i, 'bullet', b)).join('') + '</w:abstractNum>';
      x += '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' +
        fmts.map((f, i) => lvl(i, f, `%${i + 1}${i % 3 === 0 ? '.' : ')'}`)).join('') + '</w:abstractNum>';
      x += '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
      for (const n of this.nums) {
        x += `<w:num w:numId="${n.numId}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${n.start}"/></w:lvlOverride></w:num>`;
      }
      return x + '</w:numbering>';
    }

    stylesXml() {
      const heading = (id, name, lvl, sz, color, before, after, extra = '') =>
        `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${before}" w:after="${after}"/>${lvl !== null ? `<w:outlineLvl w:val="${lvl}"/>` : ''}</w:pPr>` +
        `<w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${extra}</w:rPr></w:style>`;
      const toc = (n) => `<w:style w:type="paragraph" w:styleId="TOC${n}"><w:name w:val="toc ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/>` +
        `<w:pPr><w:spacing w:after="60"/><w:ind w:left="${(n - 1) * 220}"/></w:pPr>${n === 1 ? '<w:rPr><w:b/></w:rPr>' : ''}</w:style>`;
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>' +
        '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="de-DE" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
        '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="1F1F1F"/></w:rPr></w:style>' +
        heading('Heading1', 'heading 1', 0, 32, '1F3864', 360, 120) +
        heading('Heading2', 'heading 2', 1, 26, '2F5496', 240, 80) +
        heading('Heading3', 'heading 3', 2, 24, '2F5496', 200, 60) +
        heading('Heading4', 'heading 4', 3, 22, '2F5496', 160, 40, '<w:i/>') +
        heading('UeberschriftOhneNr', 'Überschrift ohne Verzeichnis', null, 32, '1F3864', 360, 120) +
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
        '<w:pPr><w:spacing w:before="120" w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
        '<w:pPr><w:spacing w:before="1800" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="2F5496"/><w:spacing w:val="40"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Tabellentext"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr></w:style>' +
        toc(1) + toc(2) + toc(3) +
        '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:uiPriority w:val="99"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/>' +
        '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
        '<w:style w:type="table" w:styleId="LHTabelle"><w:name w:val="Lastenheft-Tabelle"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/>' +
        '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:left w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>' +
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:right w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>' +
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/></w:tblBorders>' +
        '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="85" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
        '</w:styles>';
    }

    settingsXml() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        (this.hasToc ? '<w:updateFields w:val="true"/>' : '') +
        '<w:defaultTabStop w:val="708"/><w:hyphenationZone w:val="425"/><w:characterSpacingControl w:val="doNotCompress"/>' +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
        '</w:settings>';
    }

    build() {
      const document_ = this.documentXml(); // erzeugt Relationen/Medien – zuerst ausführen
      const m = this.meta;
      const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
      const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>` +
        `<Relationship Id="rId2" Type="${REL}/numbering" Target="numbering.xml"/>` +
        `<Relationship Id="rId3" Type="${REL}/settings" Target="settings.xml"/>` +
        this.rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${xesc(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`).join('') +
        '</Relationships>';
      const files = [
        { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
          '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
          '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
          '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
          '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
          '</Types>' },
        { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>` +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
          `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>` +
          '</Relationships>' },
        { name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
          'xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          `<dc:title>${xesc(m.titel || 'Lastenheft')}</dc:title><dc:subject>${xesc(m.projekt || '')}</dc:subject>` +
          `<dc:creator>${xesc(m.autor || '')}</dc:creator><cp:lastModifiedBy>${xesc(m.autor || '')}</cp:lastModifiedBy>` +
          `<cp:revision>1</cp:revision><cp:version>${xesc(m.version || '')}</cp:version><cp:contentStatus>${xesc(m.status || '')}</cp:contentStatus>` +
          `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
          '</cp:coreProperties>' },
        { name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Lastenheft-Editor</Application></Properties>' },
        { name: 'word/document.xml', data: document_ },
        { name: 'word/_rels/document.xml.rels', data: rels },
        { name: 'word/styles.xml', data: this.stylesXml() },
        { name: 'word/numbering.xml', data: this.numberingXml() },
        { name: 'word/settings.xml', data: this.settingsXml() },
        { name: 'word/header1.xml', data: this.headerXml() },
        { name: 'word/footer1.xml', data: this.footerXml() },
        ...this.media,
      ];
      return zip(files);
    }
  }

  window.LH_DOCX = {
    build: (root, meta) => new Converter(root, meta).build(),
    MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
})();
