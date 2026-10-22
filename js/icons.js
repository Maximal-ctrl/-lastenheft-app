/* Kleine SVG-Icon-Sammlung (24×24, Strich) im Stil der Office-Ribbon-Icons. */
(function () {
  'use strict';
  const T = (txt, size = 9, x = 12, y = 16, extra = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="currentColor" stroke="none" font-family="Segoe UI,Arial" ${extra}>${txt}</text>`;
  const doc = '<path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/>';

  const ICONS = {
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/><rect x="8" y="13" width="8" height="6"/>',
    saveAs: '<path d="M5 3h11l3 3v8"/><path d="M5 3v18h7"/><path d="M8 3v5h8V3"/><path d="M14 21l1-3 5-5 2 2-5 5z"/>',
    undo: '<path d="M9 6L4 11l5 5"/><path d="M4 11h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="M15 6l5 5-5 5"/><path d="M20 11H9a5 5 0 0 0 0 10h3"/>',
    cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 15.5L17 3M16 15.5L7 3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"/>',
    ul: '<circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="18" r="1.4" fill="currentColor"/><path d="M9 6h11M9 12h11M9 18h11"/>',
    ol: '<path d="M10 6h10M10 12h10M10 18h10"/>' + T('1', 7, 5, 8.5) + T('2', 7, 5, 14.5) + T('3', 7, 5, 20.5),
    left: '<path d="M4 5h16M4 9.5h10M4 14h16M4 18.5h10"/>',
    center: '<path d="M4 5h16M7 9.5h10M4 14h16M7 18.5h10"/>',
    right: '<path d="M4 5h16M10 9.5h10M4 14h16M10 18.5h10"/>',
    justify: '<path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16"/>',
    indent: '<path d="M11 6h9M11 10h9M11 14h9M4 18.5h16M4 7.5l3.5 3-3.5 3"/>',
    outdent: '<path d="M11 6h9M11 10h9M11 14h9M4 18.5h16M7.5 7.5l-3.5 3 3.5 3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14.5h18M9 4v16M15 4v16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="9.5" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>',
    pagebreak: '<path d="M6 3v6h12V3M6 21v-6h12v6"/><path d="M2 12h3M8 12h2.5M13.5 12H16M19 12h3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    date: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>' + T('31', 7, 12, 18.5),
    hr: '<path d="M3 12h18"/><path d="M6 7h12M6 17h12" opacity=".35"/>',
    symbol: T('Ω', 17, 12, 18.5),
    toc: '<path d="M4 5h10M4 10h13M7 15h10M7 20h8"/><path d="M18 5h2M20 10h0M18.5 15h1.5M17.5 20h2.5"/>',
    numbering: T('1.1', 10, 12, 15.5, 'font-weight="700"') + '<path d="M4 20h16"/>',
    req: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6.5 8.5l1.5 1.5 2.5-3M6.5 15l1.5 1.5 2.5-3M13 8.5h5M13 15h5"/>',
    reqAdd: '<rect x="3" y="3" width="13" height="18" rx="2"/><path d="M6 8.5l1.5 1.5 2.5-3M6 15l1.5 1.5 2.5-3"/><path d="M19.5 9v8M15.5 13h8" stroke="#107c41" stroke-width="2"/>',
    check: '<path d="M4 12.5l5 5L20 6"/>',
    template: doc + '<path d="M9 11h7M9 15h7M9 19h4"/>',
    tplElec: doc + '<path d="M8 12h2l1.5-3 2 6 1.5-3h2"/>',
    tplPcb: doc + '<rect x="8.5" y="10" width="7" height="7"/><path d="M10.5 8.5v1.5M13.5 8.5v1.5M10.5 17v1.5M13.5 17v1.5"/>',
    tplPsu: doc + '<path d="M13 9l-3 5h4l-3 5"/>',
    tplShort: doc + '<path d="M9 11h7M9 15h5"/>',
    tplEmpty: doc,
    snippet: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M17 13v8M13 17h8"/>',
    cover: doc + '<path d="M9 10h7" stroke-width="2.4"/><path d="M9 14h5M9 18h7"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    abbr: T('ABC', 8, 12, 15, 'font-weight="700"') + '<path d="M3 19h18"/>',
    env: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v7"/>',
    emc: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/><path d="M21 6v12" opacity=".5"/>',
    norm: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>' + T('CE', 6.5, 12, 15, 'font-weight="700"'),
    milestone: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    param: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M9 4v16"/>' + T('±', 8, 15, 17),
    prio: '<path d="M5 6h14M5 12h10M5 18h6"/><circle cx="20" cy="18" r="1" fill="currentColor"/>',
    note: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M6.5 4v16" stroke-width="3"/><path d="M11 9.5h6M11 14h6"/>',
    nav: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M5 8h2M5 11h2M5 14h2"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    zoomIn: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/>',
    zoomOut: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M7.5 10.5h6"/>',
    pageWidth: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M2 12h4M18 12h4M4 10l-2 2 2 2M20 10l2 2-2 2"/>',
    clear: '<path d="M6 4h12M12 4l-4 16M14 14l6 6M20 14l-6 6"/>',
    trash: '<path d="M4 6h16M9 6V4h6v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    rowAbove: '<rect x="3" y="11" width="18" height="10" rx="1"/><path d="M3 16h18M9 11v10M15 11v10"/><path d="M12 2v6M9 5h6" stroke="#107c41" stroke-width="2"/>',
    rowBelow: '<rect x="3" y="3" width="18" height="10" rx="1"/><path d="M3 8h18M9 3v10M15 3v10"/><path d="M12 16v6M9 19h6" stroke="#107c41" stroke-width="2"/>',
    colLeft: '<rect x="11" y="3" width="10" height="18" rx="1"/><path d="M16 3v18M11 9h10M11 15h10"/><path d="M2 12h6M5 9v6" stroke="#107c41" stroke-width="2"/>',
    colRight: '<rect x="3" y="3" width="10" height="18" rx="1"/><path d="M8 3v18M3 9h10M3 15h10"/><path d="M16 12h6M19 9v6" stroke="#107c41" stroke-width="2"/>',
    delRow: '<rect x="3" y="5" width="18" height="10" rx="1"/><path d="M3 10h18"/><path d="M14 15l6 6M20 15l-6 6" stroke="#c42b1c" stroke-width="2"/>',
    delCol: '<rect x="5" y="3" width="10" height="18" rx="1"/><path d="M10 3v18"/><path d="M15 14l6 6M21 14l-6 6" stroke="#c42b1c" stroke-width="2"/>',
    delTable: '<rect x="3" y="3" width="15" height="14" rx="1"/><path d="M3 8h15M3 12.5h15M8 3v14M13 3v14"/><path d="M15 15l6 6M21 15l-6 6" stroke="#c42b1c" stroke-width="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    open: '<path d="M3 19V6a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v3"/><path d="M3 19l3-8h16l-3 8z"/>',
    newdoc: doc + '<path d="M12.5 11v6M9.5 14h6"/>',
    pdf: '<path d="M7 2h9l4 4v16H7z" fill="#fff"/><path d="M16 2v4h4"/><rect x="2.5" y="10" width="14" height="8" rx="1.2" fill="#c42b1c" stroke="none"/>' +
      '<text x="9.5" y="16.3" font-size="5.8" font-weight="700" text-anchor="middle" fill="#fff" stroke="none" font-family="Arial">PDF</text>',
    word: '<path d="M8 2h9l4 4v16H8z" fill="#fff"/><path d="M17 2v4h4M12 11h6M12 14.5h6M12 18h6"/><rect x="2" y="6.5" width="11" height="11" rx="1.5" fill="#185abd" stroke="none"/>' +
      '<text x="7.5" y="15.4" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff" stroke="none" font-family="Arial">W</text>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M7 14h10v7H7z"/>',
    back: '<circle cx="12" cy="12" r="9"/><path d="M12.5 8l-4 4 4 4M8.5 12h7"/>',
    update: '<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M5 3v5h5M19 21v-5h-5"/>',
    width: '<path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    placeholder: T('[ ]', 11, 12, 16, 'font-weight="700"'),
    html: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    json: '<path d="M8 4c-2 0-2 2-2 4s-2 4-2 4 2 0 2 4 0 4 2 4M16 4c2 0 2 2 2 4s2 4 2 4-2 0-2 4 0 4-2 4"/>',
    tablet: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M10.5 18.5h3"/>',
    importReq: '<rect x="11" y="3" width="10" height="18" rx="1.5"/><path d="M14 8h4M14 12h4M14 16h4"/><path d="M2 12h7M6 8.5l3.5 3.5L6 15.5" stroke="#107c41" stroke-width="2"/>',
    deviation: '<path d="M4 18L10 6l4 8 2-4 4 8"/><path d="M3 21h18" opacity=".5"/>',
    risk: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v5M12 17.5v.5"/>',
    test: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    sign: '<path d="M3 20c3-1 4-5 6-5s1 4 3 4 3-3 5-3"/><path d="M15 4l5 5-8 8-5 1 1-5z"/>',
    cost: T('€', 15, 12, 17, 'font-weight="600"') + '<circle cx="12" cy="12" r="9.5"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><rect x="3" y="4.5" width="3" height="3"/><rect x="3" y="10.5" width="3" height="3"/><rect x="3" y="16.5" width="3" height="3"/>',
    grow: T('A', 13, 9, 18, 'font-weight="600"') + '<path d="M17 9l2.5-3 2.5 3"/>',
    shrink: T('A', 10, 9, 18, 'font-weight="600"') + '<path d="M17 6l2.5 3 2.5-3"/>',
  };

  function icon(name, size = 16) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function renderIcons(root = document) {
    root.querySelectorAll('i[data-i]').forEach((el) => {
      const size = el.closest('.lg') ? 30 : el.closest('.bs-card, .tpl-card') ? 34 : 16;
      el.outerHTML = icon(el.dataset.i, +(el.dataset.size || size));
    });
  }

  window.LH_ICON = icon;
  window.LH_renderIcons = renderIcons;
})();
