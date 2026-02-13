// ── Party Colors (official) ──
const PH = {
  'AP': '#03B4F0',
  'LYP-ADN': '#A6131F',
  'APB-SUMATE': '#420855',
  'LIBRE': '#E65152',
  'FP': '#58C3F0',
  'MAS-IPSP': '#133982',
  'UNIDAD': '#FEB44B',
  'PDC': '#07626B'
};
const PORDER = ['PDC', 'LIBRE', 'UNIDAD', 'AP', 'APB-SUMATE', 'MAS-IPSP', 'FP', 'LYP-ADN'];
const SV_PARTIES = ['PDC', 'LIBRE'];

const meta = D.meta;
const data = D.data;

function num(n) { return n.toLocaleString('es-BO'); }

// ── Header ──
function updateHeader() {
  const isSV = S.round === 'sv';
  const sv = meta.sv;
  document.getElementById('hdrStats').innerHTML = isSV
    ? `<span class="header-pill">Segunda vuelta · ${sv.partic}% participación</span>
       <div><strong>${num(sv.total_val)}</strong> votos válidos</div>
       <div><strong>${num(meta.total_recintos)}</strong> recintos</div>`
    : `<span class="header-pill">Primera vuelta · ${meta.partic}% participación</span>
       <div><strong>${num(meta.total_val)}</strong> votos válidos</div>
       <div><strong>${num(meta.total_recintos)}</strong> recintos</div>`;
}
updateHeader();

// ── Credit ──
const creditBtn = document.getElementById('creditBtn');
const creditPanel = document.getElementById('creditPanel');
creditBtn.addEventListener('click', () => creditPanel.classList.toggle('open'));
document.addEventListener('click', e => { if (!e.target.closest('.credit')) creditPanel.classList.remove('open'); });

// ── Map ──
const map = L.map('map', { zoomControl: true, attributionControl: false }).setView([-16.5, -64.5], 6);

const basemaps = {
  'OSM': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
  'Claro': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
  'Oscuro': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
  'Sin mapa': L.tileLayer('', { maxZoom: 19 }),
};
let curBase = 'Claro';
basemaps[curBase].addTo(map);

function renderBmBar() {
  const bar = document.getElementById('basemapBar');
  bar.innerHTML = Object.keys(basemaps).map(k =>
    `<button class="basemap-btn ${k === curBase ? 'active' : ''}" data-bm="${k}">${k}</button>`
  ).join('');
  bar.querySelectorAll('.basemap-btn').forEach(b => b.addEventListener('click', () => {
    if (curBase !== 'Sin mapa') map.removeLayer(basemaps[curBase]);
    curBase = b.dataset.bm;
    if (curBase !== 'Sin mapa') basemaps[curBase].addTo(map);
    renderBmBar();
  }));
}
renderBmBar();

// ── State ──
let S = { round: 'pv', colorBy: 'ganador', filterDep: 'Todos', filterPart: 'Todos' };
let markers = L.layerGroup().addTo(map);

function getColor(r) {
  if (S.round === 'sv') return PH[r.svg] || '#999';
  if (S.colorBy === 'ganador') return PH[r.g] || '#999';
  if (S.colorBy === 'participacion') {
    const t = Math.max(0, Math.min(1, (r.par - 50) / 45));
    return `rgb(${Math.round(220 - t * 180)},${Math.round(60 + t * 140)},${Math.round(60 + t * 30)})`;
  }
  if (S.colorBy === 'margen') {
    const sv = Object.values(r.v).sort((a, b) => b - a);
    const m = sv.length > 1 && r.tv > 0 ? (sv[0] - sv[1]) / r.tv : 1;
    const t = Math.min(m * 2.5, 1);
    return `rgb(${Math.round(180 - t * 120)},${Math.round(180 - t * 100)},${Math.round(190 - t * 50)})`;
  }
  return PH[r.g] || '#999';
}

// ── Popup: Primera vuelta ──
function popupPV(h) {
  const maxV = Math.max(...Object.values(h.v));
  const bars = PORDER.map(p => {
    const v = h.v[p] || 0;
    const pct = h.tv > 0 ? (v / h.tv * 100) : 0;
    const w = maxV > 0 ? (v / maxV * 100) : 0;
    return `<div class="popup-bar-row">
      <span class="popup-bar-label">${p}</span>
      <div class="popup-bar-track"><div class="popup-bar-fill" style="width:${w}%;background:${PH[p]}"></div></div>
      <span class="popup-bar-val">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');
  let cand = '';
  if (h.cand && h.cand.length) {
    cand = `<div class="popup-cand">🗳️ <b>${h.cand.length} candidato${h.cand.length > 1 ? 's' : ''}</b> vota${h.cand.length > 1 ? 'n' : ''} aquí:<br>${h.cand.slice(0, 5).map(c => `• ${c.n} — ${c.p} (${c.ca})${c.w ? ' ✓' : ''}`).join('<br>')}${h.cand.length > 5 ? `<br>… y ${h.cand.length - 5} más` : ''}</div>`;
  }
  return `
    <div class="popup-name">${h.rec}</div>
    <div class="popup-sub">${h.loc} · ${h.mun} · ${h.dep} · Circ. ${h.circ}</div>
    <div class="popup-winner">
      <span class="party-dot" style="background:${PH[h.g]}"></span>
      <span class="popup-winner-name">${h.g}</span>
      <span class="popup-winner-pct">${h.gp}%</span>
    </div>
    ${bars}
    <div class="popup-meta">
      <div><div class="popup-meta-num">${num(h.hab)}</div><div class="popup-meta-label">habilitados</div></div>
      <div><div class="popup-meta-num">${num(h.emi)}</div><div class="popup-meta-label">emitidos</div></div>
      <div><div class="popup-meta-num">${h.par}%</div><div class="popup-meta-label">participación</div></div>
      <div><div class="popup-meta-num">${h.pj}%</div><div class="popup-meta-label">jóvenes 18-30</div></div>
    </div>
    ${cand}`;
}

// ── Popup: Segunda vuelta ──
function popupSV(h) {
  const svT = h.svPDC + h.svLIBRE;
  const pctPDC = svT > 0 ? (h.svPDC / svT * 100) : 0;
  const pctLIBRE = svT > 0 ? (h.svLIBRE / svT * 100) : 0;
  const winner = h.svg;
  const winPct = winner === 'PDC' ? pctPDC : pctLIBRE;
  return `
    <div class="popup-name">${h.rec}</div>
    <div class="popup-sub">${h.loc} · ${h.mun} · ${h.dep} · Circ. ${h.circ}</div>
    <div class="popup-winner">
      <span class="party-dot" style="background:${PH[winner]}"></span>
      <span class="popup-winner-name">${winner}</span>
      <span class="popup-winner-pct">${winPct.toFixed(1)}%</span>
    </div>
    <div class="popup-sv-bar">
      <div style="width:${pctPDC}%;background:${PH.PDC}"></div>
      <div style="width:${pctLIBRE}%;background:${PH.LIBRE}"></div>
    </div>
    <div class="popup-sv-items">
      <div class="popup-sv-item"><span class="party-dot" style="background:${PH.PDC}"></span>PDC: ${num(h.svPDC)} (${pctPDC.toFixed(1)}%)</div>
      <div class="popup-sv-item"><span class="party-dot" style="background:${PH.LIBRE}"></span>LIBRE: ${num(h.svLIBRE)} (${pctLIBRE.toFixed(1)}%)</div>
    </div>
    <div class="popup-meta">
      <div><div class="popup-meta-num">${num(h.hab)}</div><div class="popup-meta-label">habilitados</div></div>
      <div><div class="popup-meta-num">${num(h.sv_emi)}</div><div class="popup-meta-label">emitidos</div></div>
      <div><div class="popup-meta-num">${h.sv_par}%</div><div class="popup-meta-label">participación</div></div>
      <div><div class="popup-meta-num">${num(h.sv_bla)}</div><div class="popup-meta-label">blancos</div></div>
      <div><div class="popup-meta-num">${num(h.sv_nul)}</div><div class="popup-meta-label">nulos</div></div>
    </div>`;
}

// ── Render markers ──
function renderMarkers() {
  markers.clearLayers();
  const isSV = S.round === 'sv';
  const f = data.filter(r =>
    (S.filterDep === 'Todos' || r.dep === S.filterDep) &&
    (S.filterPart === 'Todos' || (isSV ? r.svg === S.filterPart : r.g === S.filterPart))
  );
  for (const r of f) {
    const c = getColor(r);
    const m = L.circleMarker([r.lat, r.lon], {
      radius: 5,
      fillColor: c,
      fillOpacity: .8,
      stroke: true,
      color: 'rgba(0,0,0,.08)',
      weight: .5,
    });
    const html = isSV ? popupSV(r) : popupPV(r);
    m.bindPopup(html, { className: 'custom-popup', maxWidth: 350, closeButton: true, autoPan: true });
    m.on('mouseover', function () { this.setStyle({ fillOpacity: 1, weight: 2, color: 'rgba(0,0,0,.3)' }); });
    m.on('mouseout', function () { if (!this.isPopupOpen()) this.setStyle({ fillOpacity: .8, weight: .5, color: 'rgba(0,0,0,.08)' }); });
    m.on('popupclose', function () { this.setStyle({ fillOpacity: .8, weight: .5, color: 'rgba(0,0,0,.08)' }); });
    markers.addLayer(m);
  }
  updateFiltered(f);
}

function updateFiltered(f) {
  const el = document.getElementById('filteredStats');
  if (!el) return;
  if (S.filterDep === 'Todos' && S.filterPart === 'Todos') { el.innerHTML = ''; return; }
  const isSV = S.round === 'sv';
  const order = isSV ? SV_PARTIES : PORDER;
  const fV = order.map(p => ({ p, v: f.reduce((s, r) => s + (isSV ? (p === 'PDC' ? r.svPDC : r.svLIBRE) : (r.v[p] || 0)), 0) })).sort((a, b) => b.v - a.v);
  const fT = fV.reduce((s, x) => s + x.v, 0);
  const fH = f.reduce((s, r) => s + r.hab, 0);
  const fE = f.reduce((s, r) => s + (isSV ? r.sv_emi : r.emi), 0);
  el.innerHTML = `
    <div class="sb-label">Filtro activo</div>
    <div class="results-panel">
      <div class="note-text">${f.length} recintos · ${num(fH)} hab. · ${fH > 0 ? (fE / fH * 100).toFixed(1) : '0'}% partic.</div>
      <div class="results-bar">${fV.map(x => { const p = fT > 0 ? x.v / fT * 100 : 0; return `<div style="width:${p}%;background:${PH[x.p] || '#999'}"></div>`; }).join('')}</div>
      <div class="results-items">${fV.map(x => { const p = fT > 0 ? (x.v / fT * 100).toFixed(1) : '0.0'; return `<div class="results-item"><span class="party-dot" style="background:${PH[x.p] || '#999'}"></span><span class="party-name">${x.p}</span><span class="party-pct">${p}%</span><span class="party-votes">${num(x.v)}</span></div>`; }).join('')}</div>
    </div>`;
}

// ── Sidebar ──
function buildSb() {
  const deps = [...new Set(data.map(r => r.dep))].sort();
  const isSV = S.round === 'sv';
  const partOpts = isSV ? SV_PARTIES : PORDER;

  let h = `
  <div class="sb-section">
    <div class="sb-label">Vuelta electoral</div>
    <div class="toggle-group" id="togR">
      <button class="${S.round === 'pv' ? 'active' : ''}" data-v="pv">Primera vuelta</button>
      <button class="${S.round === 'sv' ? 'active' : ''}" data-v="sv">Segunda vuelta</button>
    </div>
  </div>`;

  if (!isSV) {
    h += `<div class="sb-section">
      <div class="sb-label">Colorear por</div>
      <div class="toggle-group" id="togC">
        ${['ganador', 'participacion', 'margen'].map(v =>
      `<button class="${S.colorBy === v ? 'active' : ''}" data-v="${v}">${{ ganador: 'Ganador', participacion: 'Participación', margen: 'Margen' }[v]}</button>`
    ).join('')}
      </div>
    </div>`;
  }

  h += `
  <div class="sb-section">
    <div class="sb-label">Departamento</div>
    <select id="selD"><option value="Todos">Todos</option>${deps.map(d => `<option value="${d}" ${S.filterDep === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
  </div>
  <div class="sb-section">
    <div class="sb-label">Filtrar por ganador</div>
    <select id="selP"><option value="Todos">Todos</option>${partOpts.map(p => `<option value="${p}" ${S.filterPart === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
  </div>
  <div class="sb-section" id="filteredStats"></div>`;

  if (!isSV) {
    h += `<div class="sb-section">
      <div class="sb-label">Resultado nacional – Primera vuelta</div>
      <div class="results-panel">
        <div class="results-bar">${PORDER.map(p => { const pc = meta.pv[p] / meta.total_val * 100; return `<div style="width:${pc}%;background:${PH[p]}"></div>`; }).join('')}</div>
        <div class="results-items">${PORDER.map(p => { const v = meta.pv[p]; const pc = (v / meta.total_val * 100).toFixed(1); return `<div class="results-item"><span class="party-dot" style="background:${PH[p]}"></span><span class="party-name">${p}</span><span class="party-pct">${pc}%</span><span class="party-votes">${num(v)}</span></div>`; }).join('')}</div>
      </div>
    </div>`;
    if (S.colorBy === 'participacion') {
      h += `<div class="sb-section"><div class="sb-label">Escala participación</div>
        <div class="scale-bar" style="background:linear-gradient(to right,rgb(220,60,60),rgb(220,160,60),rgb(40,200,90))"></div>
        <div class="scale-labels"><span>50%</span><span>95%</span></div></div>`;
    }
    if (S.colorBy === 'margen') {
      h += `<div class="sb-section"><div class="sb-label">Escala margen de victoria</div>
        <div class="scale-bar" style="background:linear-gradient(to right,rgb(180,180,190),rgb(60,80,140))"></div>
        <div class="scale-labels"><span>Reñido</span><span>Amplio</span></div></div>`;
    }
  } else {
    const svT = meta.sv.PDC + meta.sv.LIBRE;
    h += `<div class="sb-section">
      <div class="sb-label">Segunda vuelta – PDC vs LIBRE</div>
      <div class="results-panel">
        <div class="note-text">${num(meta.sv.total_val)} votos válidos · ${meta.sv.partic}% participación</div>
        <div class="results-bar">
          <div style="width:${meta.sv.PDC / svT * 100}%;background:${PH.PDC}"></div>
          <div style="width:${meta.sv.LIBRE / svT * 100}%;background:${PH.LIBRE}"></div>
        </div>
        <div class="results-items">
          ${SV_PARTIES.map(p => { const v = meta.sv[p]; const pc = (v / svT * 100).toFixed(1); return `<div class="results-item"><span class="party-dot" style="background:${PH[p]}"></span><span class="party-name">${p}</span><span class="party-pct">${pc}%</span><span class="party-votes">${num(v)}</span></div>`; }).join('')}
        </div>
      </div>
    </div>`;
    const pdcW = data.filter(r => r.svg === 'PDC').length;
    const libreW = data.filter(r => r.svg === 'LIBRE').length;
    h += `<div class="sb-section">
      <div class="sb-label">Recintos ganados</div>
      <div class="sv-counters">
        <div class="sv-counter">
          <div class="sv-counter-num" style="color:${PH.PDC}">${num(pdcW)}</div>
          <div class="sv-counter-label">PDC</div>
        </div>
        <div class="sv-counter">
          <div class="sv-counter-num" style="color:${PH.LIBRE}">${num(libreW)}</div>
          <div class="sv-counter-label">LIBRE</div>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('sb').innerHTML = h;

  // Bind events
  document.querySelectorAll('#togR button').forEach(b => b.addEventListener('click', () => {
    S.round = b.dataset.v;
    S.filterPart = 'Todos';
    if (S.round === 'sv') S.colorBy = 'ganador';
    updateHeader(); buildSb(); renderMarkers();
  }));
  document.querySelectorAll('#togC button').forEach(b => b.addEventListener('click', () => {
    S.colorBy = b.dataset.v; buildSb(); renderMarkers();
  }));
  document.getElementById('selD')?.addEventListener('change', e => { S.filterDep = e.target.value; buildSb(); renderMarkers(); });
  document.getElementById('selP')?.addEventListener('change', e => { S.filterPart = e.target.value; buildSb(); renderMarkers(); });
}

// ── Init ──
buildSb();
renderMarkers();
