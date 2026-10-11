(async () => {
'use strict';
const tg = window.Telegram && window.Telegram.WebApp;
const tuser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
const uid = tuser ? tuser.id : null;
// ВНИМАНИЕ: проверка на клиенте — это удобство, а не защита (см. README).
const isAdmin = !!uid && (CFG.ADMIN_IDS || []).map(Number).includes(Number(uid));
if (tg) {
  tg.ready(); tg.expand();
  try { tg.setHeaderColor('#001e62'); tg.setBackgroundColor('#001e62'); } catch (e) {}
}

const MP = {
  ozon: { name: 'Ozon', color: '#005bff' },
  wb:   { name: 'Wildberries', color: '#cb11ab' },
  ym:   { name: 'Яндекс Маркет', color: '#e5a800' }
};
const MPK = Object.keys(MP);

/* ---------- утилиты ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Не хватило памяти браузера'); return false; } };
const fmt = n => (n == null || n === '' || isNaN(n)) ? null : new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const haptic = (t = 'light') => { try { tg && tg.HapticFeedback.impactOccurred(t); } catch (e) {} };
const openLink = u => { if (tg && tg.openLink) tg.openLink(u); else window.open(u, '_blank'); };
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const getPath = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  const t = ks.reduce((a, k) => a[k], o); t[last] = v;
}

/* ---------- данные ---------- */
let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
try {
  const r = await fetch(CFG.DATA_URL + '?t=' + Date.now(), { cache: 'no-store' });
  if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.products)) data = j; }
} catch (e) { /* нет data.json — используем стартовые данные */ }
if (isAdmin) { const d = load('rb_draft'); if (d && Array.isArray(d.products)) data = d; }
const saveDraft = () => save('rb_draft', data);

let cart = load('rb_cart', []);
let stats = load('rb_stats', { opens: 0, views: {}, adds: {}, out: { ozon: 0, wb: 0, ym: 0 } });
const stat = (a, b) => {
  if (b == null) stats[a] = (stats[a] || 0) + 1;
  else { stats[a][b] = (stats[a][b] || 0) + 1; }
  save('rb_stats', stats);
};
stat('opens');

const state = { hi: 0, tab: 'home', pid: null, vol: null, mp: 'ozon', qty: 1, aTab: 'products', aPid: null };
const P = id => data.products.find(p => p.id === id);

function canSvg(p) {
  const c1 = esc(p.theme.c1), c2 = esc(p.theme.c2);
  const t = esc(String(p.name).split(' ')[0].toUpperCase().slice(0, 10));
  const fs = t.length > 8 ? 10 : t.length > 6 ? 12 : 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 260"><defs>
<linearGradient id="m" x1="0" x2="1"><stop offset="0" stop-color="#7d8794"/><stop offset=".35" stop-color="#f4f6f9"/><stop offset=".65" stop-color="#b9c0ca"/><stop offset="1" stop-color="#6b7480"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".18" stop-color="#000" stop-opacity=".05"/><stop offset=".3" stop-color="#fff" stop-opacity=".5"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
<clipPath id="c"><path d="M34 52Q34 36 48 30h44q14 6 14 22v158q0 14-14 20H48q-14-6-14-20z"/></clipPath></defs>
<ellipse cx="70" cy="246" rx="44" ry="7" fill="#000" opacity=".28"/>
<path d="M36 48Q36 36 50 30h40q14 6 14 18v8H36z" fill="url(#m)"/>
<ellipse cx="70" cy="30" rx="22" ry="5" fill="url(#m)"/><ellipse cx="70" cy="30" rx="17" ry="3.4" fill="#59616c"/>
<rect x="63" y="27.5" width="14" height="5" rx="2.5" fill="#d9dee5"/>
<g clip-path="url(#c)"><rect x="30" y="30" width="80" height="200" fill="url(#b)"/>
<path d="M30 92 110 130v40L30 132z" fill="#fff" opacity=".2"/>
<path d="M30 150 110 188v14L30 164z" fill="#000" opacity=".16"/>
<rect x="30" y="30" width="80" height="200" fill="url(#s)"/></g>
<path d="M34 214q0 14 14 20h44q14-6 14-20v8q0 12-14 18H48q-14-6-14-18z" fill="url(#m)"/>
<text x="70" y="124" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="${fs}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".6" letter-spacing=".4">${t}</text>
<text x="70" y="142" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="7" fill="#fff" opacity=".85" letter-spacing="1.5">ENERGY DRINK</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const img = p => p.image || canSvg(p);
const themeStyle = p => `--c1:${esc(p.theme.c1)};--c2:${esc(p.theme.c2)}`;

function searchUrl(mp, p, vol) {
  const q = encodeURIComponent(`Red Bull ${p.name} ${vol} мл`);
  return { ozon: `https://www.ozon.ru/search/?text=${q}`,
    wb: `https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`,
    ym: `https://market.yandex.ru/search?text=${q}` }[mp];
}
const variant = (p, vol) => p.variants.find(v => v.vol === vol);
const offer = (p, vol, mp) => { const v = variant(p, vol); return v && v.offers && v.offers[mp] || { url: '', price: null }; };
const linkFor = (p, vol, mp) => offer(p, vol, mp).url || searchUrl(mp, p, vol);

/* ---------- автоцена по ссылке (best-effort, только фронтенд) ---------- */
function findPrice(o) {
  if (!o || typeof o !== 'object') return null;
  for (const k of ['price', 'lowPrice']) {
    if (o[k] != null && !isNaN(parseFloat(o[k]))) return Math.round(parseFloat(o[k]));
  }
  for (const k in o) { const r = findPrice(o[k]); if (r) return r; }
  return null;
}
function parsePrice(html) {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const r = findPrice(JSON.parse(m[1])); if (r) return r; } catch (e) {}
  }
  const m = html.match(/(?:product:price:amount|og:price:amount|itemprop="price")[^>]*content="([\d.,\s]+)"/i)
    || html.match(/content="([\d.,\s]+)"[^>]*(?:product:price:amount|itemprop="price")/i);
  if (m) { const n = Math.round(parseFloat(m[1].replace(/\s/g, '').replace(',', '.'))); if (n) return n; }
  return null;
}
async function fetchPrice(url) {
  const proxies = [
    u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    u => 'https://corsproxy.io/?' + encodeURIComponent(u)
  ];
  for (const px of proxies) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000);
      const r = await fetch(px(url), { signal: ctrl.signal }); clearTimeout(to);
      if (!r.ok) continue;
      const price = parsePrice(await r.text());
      if (price) return price;
    } catch (e) {}
  }
  return null;
}

/* ---------- тема вкуса ---------- */
const hex2rgb = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, k) => { const x = hex2rgb(a), y = hex2rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
function setTheme(p) {
  const r = document.documentElement.style;
  const c1 = p ? p.theme.c1 : '#db0a40', c2 = p ? p.theme.c2 : '#0a2a86';
  r.setProperty('--c1', c1); r.setProperty('--c2', c2);
  r.setProperty('--d1', mix(c1, '#0a0714', .7)); r.setProperty('--d2', mix(c2, '#060a22', .8));
}
const ruPlural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
const shortName = p => String(p.name).split(' ')[0];
const giantFs = (name, vw) => Math.max(46, Math.min(150, Math.round(vw * 1.1 / (name.length * 0.86))));
const canH = vol => Math.round(30 + Number(vol) / 473 * 52);
function fromPrice(p) {
  let m = null;
  p.variants.forEach(v => MPK.forEach(k => { const x = offer(p, v.vol, k).price; if (x != null && x !== '' && (m == null || Number(x) < m)) m = Number(x); }));
  return m;
}

/* ---------- главная: вкус на весь экран ---------- */
function renderHome() {
  const vw = Math.min(window.innerWidth || 390, 520);
  $('#main').innerHTML = `
    <div class="home">
      <div class="hdr"><span class="logo">Red Bull</span><span class="count">${data.products.length} ${ruPlural(data.products.length, ['вкус', 'вкуса', 'вкусов'])}</span></div>
      <div class="pager" id="pager">${data.products.map(p => {
        const nm = shortName(p).toUpperCase(); const from = fromPrice(p);
        return `<article class="slide" style="--s1:${esc(p.theme.c1)}">
          <div class="giant" style="--fs:${giantFs(nm, vw)}px" aria-hidden="true">${esc(nm)}</div>
          <div class="stage"><img src="${img(p)}" alt="${esc(p.name)}"></div>
          <div class="copy"><h2 class="pname">${esc(p.name)}</h2><p class="ptag">${esc(p.tagline)}</p>
            <div class="prow"><button class="cta go" data-act="open" data-id="${esc(p.id)}">Подробнее</button>${from ? `<span class="from">от ${fmt(from)}</span>` : ''}</div></div>
        </article>`; }).join('')}</div>
      <div class="rail" id="rail">${data.products.map((p, i) => `<button data-i="${i}" aria-label="${esc(p.name)}"><img src="${img(p)}" alt=""></button>`).join('')}</div>
    </div>`;
  initPager();
}
function initPager() {
  const pg = $('#pager'); if (!pg) return;
  const slides = [...pg.children]; const rail = [...document.querySelectorAll('#rail button')]; const rl = $('#rail');
  let cur = -1, raf = 0;
  const apply = idx => {
    if (idx === cur || !slides[idx]) return;
    const first = cur === -1; cur = idx; state.hi = idx; setTheme(data.products[idx]);
    rail.forEach((b, j) => b.classList.toggle('on', j === idx));
    const b = rail[idx]; if (b) rl.scrollTo({ left: b.offsetLeft - (rl.clientWidth - b.offsetWidth) / 2, behavior: first ? 'auto' : 'smooth' });
    if (!first) haptic();
  };
  const update = () => {
    raf = 0; const w = pg.clientWidth || 1; const x = pg.scrollLeft;
    slides.forEach((s, i) => s.style.setProperty('--o', ((i * w - x) / w).toFixed(3)));
    apply(Math.max(0, Math.min(slides.length - 1, Math.round(x / w))));
  };
  pg.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  rail.forEach((b, i) => b.addEventListener('click', () => pg.scrollTo({ left: i * pg.clientWidth, behavior: 'smooth' })));
  pg.scrollLeft = state.hi * pg.clientWidth;
  update();
}

/* ---------- карточка товара ---------- */
function openDetail(id) {
  const p = P(id); if (!p) return;
  state.pid = id; state.qty = 1;
  state.vol = p.variants.length ? p.variants[0].vol : null;
  state.mp = 'ozon';
  stat('views', id);
  setTheme(p);
  renderDetail();
  $('#detail').scrollTop = 0;
  setSheet('detail', true);
}
function minPrice(p, vol, mp) { const pr = offer(p, vol, mp).price; return pr == null || pr === '' ? null : Number(pr); }
function renderDetail() {
  const p = P(state.pid); if (!p) return;
  const el = $('#detail');
  const known = MPK.map(k => minPrice(p, state.vol, k)).filter(x => x != null);
  const best = known.length > 1 ? Math.min(...known) : null;
  const cur = minPrice(p, state.vol, state.mp);
  const nm = shortName(p).toUpperCase(); const vw = Math.min(window.innerWidth || 390, 520);
  el.innerHTML = `
    <div class="dhero" id="dhero">
      <button class="back glass" data-act="closeDetail" aria-label="Назад">‹</button>
      <div class="giant" style="--fs:${giantFs(nm, vw)}px" aria-hidden="true">${esc(nm)}</div>
      <div class="dglow"></div>
      <img class="dcan" id="dcan" src="${img(p)}" alt="${esc(p.name)}">
    </div>
    <div class="dtitle"><h2>${esc(p.name)}</h2><p>${esc(p.tagline)}</p></div>
    <div class="dbody">
      <section class="sec"><h3>О вкусе</h3><p class="lead">${esc(p.desc)}</p>
        <ul class="facts">${p.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>
      <section class="sec"><h3>Объём</h3>
        <div class="vols">${p.variants.map(v => `<button class="vol ${v.vol === state.vol ? 'on' : ''}" data-act="vol" data-v="${v.vol}"><img src="${img(p)}" style="height:${canH(v.vol)}px" alt=""><span>${v.vol} мл</span></button>`).join('')}</div></section>
      <section class="sec"><h3>Где купить</h3>
        <div class="shops">${MPK.map(k => {
          const o = offer(p, state.vol, k); const pr = fmt(o.price);
          const isBest = best != null && o.price != null && o.price !== '' && Number(o.price) === best;
          return `<button class="shop ${state.mp === k ? 'on' : ''}" data-act="mp" data-m="${k}">
            <span class="radio"></span>
            <span class="nm"><span class="n"><i style="background:${MP[k].color}"></i>${MP[k].name}${isBest ? '<em class="best">Дешевле всего</em>' : ''}</span><small>${o.url ? 'ссылка на товар' : 'откроется поиск'}</small></span>
            <span class="pr ${pr ? '' : 'none'}">${pr || 'цена на сайте'}</span></button>`;
        }).join('')}</div></section>
    </div>
    <div class="buybar glass">
      <div class="qty"><button data-act="qty" data-d="-1" aria-label="Меньше">−</button><span>${state.qty}</span><button data-act="qty" data-d="1" aria-label="Больше">+</button></div>
      <button class="cta" data-act="add">В корзину${cur ? ' · ' + fmt(cur * state.qty) : ''}</button>
    </div>`;
  attachTilt($('#dhero'), $('#dcan'));
}
function attachTilt(stage, can) {
  if (!stage || !can || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const set = (rx, ry) => { can.style.setProperty('--rx', rx + 'deg'); can.style.setProperty('--ry', ry + 'deg'); };
  const move = e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    can.classList.add('drag'); set((-y * 16).toFixed(1), (x * 36).toFixed(1));
  };
  const end = () => { can.classList.remove('drag'); set(0, 0); };
  stage.addEventListener('pointerdown', move); stage.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stage.addEventListener(t, end));
}
function addToCart() {
  const p = P(state.pid); if (!p || state.vol == null) return;
  const it = cart.find(i => i.pid === p.id && i.vol === state.vol && i.mp === state.mp);
  if (it) it.qty += state.qty; else cart.push({ pid: p.id, vol: state.vol, mp: state.mp, qty: state.qty });
  save('rb_cart', cart); stat('adds', p.id); haptic('medium'); updateBadge();
  toast(`${p.name} ${state.vol} мл · ${MP[state.mp].name} — в корзине`);
}

/* ---------- корзина ---------- */
const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
function updateBadge() {
  const b = $('#badge'); const n = cartCount(); b.textContent = n; b.hidden = !n;
}
function renderCart() {
  cart = cart.filter(i => P(i.pid) && variant(P(i.pid), i.vol));
  if (!cart.length) {
    $('#main').innerHTML = `<div class="page"><h1 class="h1">Корзина</h1>
      <div class="empty"><p>Здесь пока пусто. Выбери вкус на главной и добавь его в корзину.</p>
      <button class="cta" data-act="tab" data-tab="home">К вкусам</button></div></div>`;
    return;
  }
  const groups = {}; cart.forEach((i, idx) => (groups[i.mp] = groups[i.mp] || []).push({ i, idx }));
  let total = 0, unknown = false;
  const html = MPK.filter(k => groups[k]).map(k => {
    let sub = 0;
    const rows = groups[k].map(({ i, idx }) => {
      const p = P(i.pid); const pr = minPrice(p, i.vol, i.mp);
      if (pr == null) unknown = true; else { total += pr * i.qty; sub += pr * i.qty; }
      return `<div class="line" style="${themeStyle(p)}">
        <div class="th"><img src="${img(p)}" alt=""></div>
        <div class="lm"><b>${esc(p.name)}</b><small>${i.vol} мл</small>
          <div class="qty"><button data-act="cq" data-i="${idx}" data-d="-1" aria-label="Меньше">−</button><span>${i.qty}</span><button data-act="cq" data-i="${idx}" data-d="1" aria-label="Больше">+</button></div></div>
        <div class="lr"><span class="lp">${pr == null ? 'цена на сайте' : fmt(pr * i.qty)}</span>
          <button class="x" data-act="rm" data-i="${idx}" aria-label="Удалить"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></div>`;
    }).join('');
    return `<section class="group"><div class="ghead"><i style="background:${MP[k].color}"></i><b>${MP[k].name}</b><span>${sub ? fmt(sub) : ''}</span></div>${rows}</section>`;
  }).join('');
  $('#main').innerHTML = `<div class="page"><h1 class="h1">Корзина</h1>${html}
    <div class="sum glass"><div class="srow"><span>Итого</span><b>${total ? fmt(total) : '—'}</b></div>
      ${unknown ? `<p class="snote">${total ? 'Цену части товаров смотри на сайте магазина.' : 'Цены откроются на сайте магазина.'}</p>` : ''}
      <button class="cta red" data-act="checkout">Заказать</button></div></div>`;
}
function checkout() {
  if (!cart.length) return;
  const links = cart.map(i => ({ i, p: P(i.pid), url: linkFor(P(i.pid), i.vol, i.mp) }));
  if (links.length === 1) { go(links[0]); return; }
  const groups = {};
  links.forEach(l => (groups[l.i.mp] = groups[l.i.mp] || []).push(l));
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="glass mbox"><h3>Оформление заказа</h3>
    <p>Маркетплейсы не принимают корзину извне, поэтому каждый товар откроется на своей странице — добавь его в корзину маркетплейса.</p>
    ${Object.keys(groups).map(k => `<div class="grp"><b>${MP[k].name}</b>
      ${groups[k].map(l => `<button class="cta" data-act="go" data-k="${links.indexOf(l)}">${esc(l.p.name)} ${l.i.vol} мл × ${l.i.qty}</button>`).join('')}</div>`).join('')}
    <button class="ghost" style="width:100%" data-act="closeModal">Закрыть</button></div>`;
  m._links = links;
}
function go(l) {
  stats.out[l.i.mp] = (stats.out[l.i.mp] || 0) + 1; save('rb_stats', stats);
  haptic('medium'); openLink(l.url);
}

/* ---------- Info ---------- */
function renderInfo() {
  $('#main').innerHTML = `<div class="page"><h1 class="h1">Info</h1>
    <div class="lead info-text">${esc(data.info || 'О проекте')}</div>
    ${isAdmin ? `<button class="cta red wide" data-act="openAdmin">Админ-панель</button>` : ''}</div>`;
}

/* ---------- навигация ---------- */
function setTab(t) {
  if (t === state.tab && $('#main').innerHTML) return;
  const order = ['home', 'cart', 'info'];
  state.tab = t;
  const bar = $('#tabbar'); bar.style.setProperty('--i', order.indexOf(t));
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const pill = $('#pill'); pill.classList.remove('move'); void pill.offsetWidth; pill.classList.add('move');
  haptic();
  renderTab();
}
function renderTab() {
  const m = $('#main');
  ({ home: renderHome, cart: renderCart, info: renderInfo })[state.tab]();
  m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
  m.classList.toggle('is-home', state.tab === 'home'); if (state.tab !== 'home') setTheme(null);
  m.scrollTop = 0; updateBadge();
}
function setSheet(name, open) {
  $('#' + name).classList.toggle('open', open);
  $('#' + name).setAttribute('aria-hidden', String(!open));
  const any = $('#detail').classList.contains('open') || $('#admin').classList.contains('open');
  if (name === 'detail' && !open) setTheme(state.tab === 'home' ? data.products[state.hi || 0] : null);
  document.body.classList.toggle('sheet-open', any);
  if (tg && tg.BackButton) { any ? tg.BackButton.show() : tg.BackButton.hide(); }
}
function closeTop() {
  if ($('#modal').hidden === false) { $('#modal').hidden = true; return; }
  if ($('#admin').classList.contains('open')) {
    if (state.aPid) { state.aPid = null; renderAdmin(); return; }
    setSheet('admin', false); renderTab(); return;
  }
  if ($('#detail').classList.contains('open')) setSheet('detail', false);
}
if (tg && tg.BackButton) tg.BackButton.onClick(closeTop);

/* ---------- админка ---------- */
function openAdmin() {
  if (!isAdmin) return;
  state.aTab = 'products'; state.aPid = null; renderAdmin();
  $('#admin').scrollTop = 0; setSheet('admin', true);
}
function renderAdmin() {
  const t = state.aTab;
  const tabs = [['products', 'Товары'], ['info', 'Info'], ['stats', 'Статистика'], ['data', 'Данные']];
  let body = '';
  if (t === 'products') body = state.aPid ? adminProduct(P(state.aPid)) : adminList();
  if (t === 'info') body = `<div class="glass box"><div class="field"><label>Текст вкладки Info</label>
      <textarea data-root="d" data-k="info" style="min-height:240px">${esc(data.info)}</textarea></div>
      <p class="note">Сохраняется автоматически. Опубликуй изменения во вкладке «Данные».</p></div>`;
  if (t === 'stats') body = adminStats();
  if (t === 'data') body = adminData();
  $('#admin').innerHTML = `<button class="back glass" data-act="closeAdmin" aria-label="Назад">‹</button>
    <div class="apage"><h1 class="h1">Админка</h1>
    <div class="atabs">${tabs.map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-act="atab" data-t="${k}">${n}</button>`).join('')}</div>
    ${body}</div>`;
}
function adminList() {
  return data.products.map(p => `<button class="glass arow" data-act="aedit" data-id="${esc(p.id)}">
      <img src="${img(p)}" alt=""><b>${esc(p.name)}</b><span>›</span></button>`).join('') +
    `<div class="btns"><button class="cta sm" data-act="anew">+ Добавить энергетик</button>
     <button class="ghost" data-act="arefresh">Обновить все цены по ссылкам</button></div>
     <p class="note" id="rst"></p>`;
}
function adminProduct(p) {
  if (!p) return '';
  const f = (label, k, val, tag = 'input', extra = '') => `<div class="field"><label>${label}</label>
    <${tag} data-root="p" data-k="${k}" ${tag === 'input' ? `value="${esc(val)}"` : ''} ${extra}>${tag === 'textarea' ? esc(val) + '</textarea>' : ''}${tag === 'input' ? '' : ''}</div>`;
  return `<div class="glass box">
    <button class="ghost" data-act="aback" style="margin-bottom:12px">‹ К списку</button>
    ${f('Название', 'name', p.name)}${f('Слоган', 'tagline', p.tagline)}
    ${f('Описание вкуса', 'desc', p.desc, 'textarea')}
    <div class="field"><label>Особенности (по одной в строке)</label>
      <textarea data-root="p" data-k="facts" data-lines="1">${esc(p.facts.join('\n'))}</textarea></div>
    <div class="two">
      <div class="field"><label>Цвет 1</label><input type="color" data-root="p" data-k="theme.c1" value="${esc(p.theme.c1)}"></div>
      <div class="field"><label>Цвет 2</label><input type="color" data-root="p" data-k="theme.c2" value="${esc(p.theme.c2)}"></div>
    </div>
    <div class="field"><label>Фото банки</label><input type="file" accept="image/*" data-act="photo"></div>
    ${p.image ? `<button class="ghost" data-act="rmphoto">Убрать фото</button>` : ''}
    ${p.variants.map((v, vi) => `
      <div class="vh"><span>${v.vol} мл</span><button class="ghost danger" data-act="rmvol" data-vi="${vi}">Удалить объём</button></div>
      ${MPK.map(k => { const o = (v.offers[k] = v.offers[k] || { url: '', price: null }); return `
        <div class="offer"><h4>${MP[k].name}</h4>
          <div class="field"><label>Ссылка на товар</label>
            <input data-root="p" data-k="variants.${vi}.offers.${k}.url" data-auto="${vi}|${k}" value="${esc(o.url)}" placeholder="https://..."></div>
          <div class="field"><label>Цена, ₽ (подтянется по ссылке или впиши вручную)</label>
            <input type="number" inputmode="numeric" id="pr-${vi}-${k}" data-root="p" data-num="1" data-k="variants.${vi}.offers.${k}.price" value="${o.price == null ? '' : esc(o.price)}"></div>
          <button class="ghost" data-act="getprice" data-vi="${vi}" data-k="${k}">Найти цену по ссылке</button>
          <div class="st" id="st-${vi}-${k}"></div></div>`; }).join('')}`).join('')}
    <div class="two" style="margin-top:10px"><div class="field"><label>Новый объём, мл</label><input type="number" id="newvol" inputmode="numeric" placeholder="330"></div>
      <div class="field"><label>&nbsp;</label><button class="cta sm" data-act="addvol">Добавить</button></div></div>
    <button class="ghost danger" style="margin-top:14px" data-act="adel">Удалить энергетик</button></div>`;
}
function adminStats() {
  const names = id => (P(id) ? P(id).name : id);
  const lst = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="stat"><span>${esc(names(k))}</span><b>${v}</b></div>`).join('') || '<p class="note">Пока нет данных</p>';
  return `<div class="glass box"><h3>Открытия приложения</h3><div class="stat"><span>Всего</span><b>${stats.opens || 0}</b></div>
    <h3 style="margin-top:14px">Просмотры вкусов</h3>${lst(stats.views)}
    <h3 style="margin-top:14px">Добавления в корзину</h3>${lst(stats.adds)}
    <h3 style="margin-top:14px">Переходы на маркетплейсы</h3>${MPK.map(k => `<div class="stat"><span>${MP[k].name}</span><b>${(stats.out || {})[k] || 0}</b></div>`).join('')}
    <p class="note">Статистика считается локально, в браузере этого устройства. Без сервера общую статистику по всем пользователям собрать нельзя.</p>
    <button class="ghost danger" data-act="resetstats">Сбросить статистику</button></div>`;
}
function adminData() {
  return `<div class="glass box"><h3>Публикация изменений</h3>
    <p class="note">Правки видны только на твоём устройстве. Чтобы увидели все: нажми «Скопировать JSON», сохрани как <b>data.json</b> рядом с index.html на хостинге и перезалей.</p>
    <div class="btns"><button class="cta sm" data-act="copyjson">Скопировать JSON</button>
    <button class="ghost" data-act="dljson">Скачать data.json</button></div>
    <div class="field" style="margin-top:14px"><label>Импорт: вставь JSON</label><textarea id="imp" placeholder='{"info":"...","products":[...]}'></textarea></div>
    <div class="btns"><button class="ghost" data-act="imp">Применить</button>
    <button class="ghost danger" data-act="resetdraft">Сбросить мои правки</button></div></div>`;
}
async function adminAutoPrice(vi, k, quiet) {
  const p = P(state.aPid); const o = p.variants[vi].offers[k];
  const st = document.getElementById(`st-${vi}-${k}`);
  if (!o.url) { if (st) st.textContent = 'Сначала вставь ссылку'; return false; }
  if (st) st.textContent = 'Ищу цену…';
  const price = await fetchPrice(o.url);
  if (price) {
    o.price = price; saveDraft();
    const inp = document.getElementById(`pr-${vi}-${k}`); if (inp) inp.value = price;
    if (st) st.textContent = 'Цена найдена: ' + fmt(price); return true;
  }
  if (st) st.textContent = 'Не удалось прочитать цену (сайт закрыт для автоматического чтения). Впиши вручную.';
  return false;
}
async function refreshAll() {
  const r = $('#rst'); let ok = 0, tot = 0;
  for (const p of data.products) for (const v of p.variants) for (const k of MPK) {
    const o = v.offers[k]; if (!o || !o.url) continue; tot++;
    if (r) r.textContent = `Обновляю ${tot}…`;
    const price = await fetchPrice(o.url); if (price) { o.price = price; ok++; }
  }
  saveDraft(); if (r) r.textContent = tot ? `Готово: обновлено ${ok} из ${tot}` : 'Нет товаров со ссылками';
}
function resizeImage(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 640 / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/webp', .85); if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
        res(out);
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
const download = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
};

/* ---------- события ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act; const d = el.dataset;
  const ap = () => P(state.aPid);
  switch (a) {
    case 'tab': setTab(d.tab); break;
    case 'open': openDetail(d.id); break;
    case 'closeDetail': setSheet('detail', false); break;
    case 'vol': state.vol = Number(d.v); renderDetail(); break;
    case 'mp': state.mp = d.m; renderDetail(); break;
    case 'qty': state.qty = Math.max(1, Math.min(99, state.qty + Number(d.d))); renderDetail(); break;
    case 'add': addToCart(); break;
    case 'cq': { const i = cart[d.i]; const q = i.qty + Number(d.d);
      if (q < 1) { cart.splice(Number(d.i), 1); toast('Удалено из корзины'); } else i.qty = Math.min(99, q);
      save('rb_cart', cart); renderCart(); updateBadge(); break; }
    case 'rm': cart.splice(Number(d.i), 1); save('rb_cart', cart); renderCart(); updateBadge(); haptic(); toast('Удалено из корзины'); break;
    case 'checkout': checkout(); break;
    case 'go': go($('#modal')._links[Number(d.k)]); break;
    case 'closeModal': $('#modal').hidden = true; break;
    case 'openAdmin': openAdmin(); break;
    case 'closeAdmin': setSheet('admin', false); renderTab(); break;
    case 'atab': state.aTab = d.t; state.aPid = null; renderAdmin(); break;
    case 'aedit': state.aPid = d.id; renderAdmin(); $('#admin').scrollTop = 0; break;
    case 'aback': state.aPid = null; renderAdmin(); break;
    case 'anew': {
      const id = 'p' + Date.now().toString(36);
      data.products.push({ id, name: 'Новый вкус', tagline: '', desc: '', facts: [], theme: { c1: '#db0a40', c2: '#001e62' }, image: null,
        variants: [250, 355, 473].map(vol => ({ vol, offers: { ozon: { url: '', price: null }, wb: { url: '', price: null }, ym: { url: '', price: null } } })) });
      saveDraft(); state.aPid = id; renderAdmin(); break; }
    case 'adel': if (confirm('Удалить этот энергетик?')) { data.products = data.products.filter(p => p.id !== state.aPid); state.aPid = null; saveDraft(); renderAdmin(); } break;
    case 'addvol': {
      const v = Number($('#newvol').value); const p = ap();
      if (!v || p.variants.some(x => x.vol === v)) { toast('Укажи новый объём'); break; }
      p.variants.push({ vol: v, offers: { ozon: { url: '', price: null }, wb: { url: '', price: null }, ym: { url: '', price: null } } });
      p.variants.sort((x, y) => x.vol - y.vol); saveDraft(); renderAdmin(); break; }
    case 'rmvol': ap().variants.splice(Number(d.vi), 1); saveDraft(); renderAdmin(); break;
    case 'rmphoto': ap().image = null; saveDraft(); renderAdmin(); break;
    case 'getprice': await adminAutoPrice(Number(d.vi), d.k); break;
    case 'arefresh': await refreshAll(); renderAdmin(); break;
    case 'resetstats': if (confirm('Сбросить статистику?')) { stats = { opens: 0, views: {}, adds: {}, out: { ozon: 0, wb: 0, ym: 0 } }; save('rb_stats', stats); renderAdmin(); } break;
    case 'copyjson': {
      const txt = JSON.stringify(data, null, 2);
      try { await navigator.clipboard.writeText(txt); toast('JSON скопирован'); } catch (err) { download('data.json', txt); }
      break; }
    case 'dljson': download('data.json', JSON.stringify(data, null, 2)); break;
    case 'imp': {
      try { const j = JSON.parse($('#imp').value); if (!Array.isArray(j.products)) throw 0; data = j; saveDraft(); toast('Импортировано'); renderAdmin(); }
      catch (err) { toast('Неверный JSON'); }
      break; }
    case 'resetdraft': if (confirm('Сбросить локальные правки?')) { localStorage.removeItem('rb_draft'); location.reload(); } break;
    case 'copyid': try { await navigator.clipboard.writeText(String(uid)); toast('ID скопирован'); } catch (err) { toast(String(uid)); } break;
  }
});

document.addEventListener('input', e => {
  const el = e.target; if (!el.dataset || !el.dataset.k) return;
  if (!isAdmin) return;
  const root = el.dataset.root === 'd' ? data : P(state.aPid); if (!root) return;
  let v = el.value;
  if (el.dataset.lines) v = v.split('\n').map(s => s.trim()).filter(Boolean);
  if (el.dataset.num) v = v === '' ? null : Number(v);
  setPath(root, el.dataset.k, v); saveDraft();
});
// авто-подтягивание цены сразу после вставки ссылки
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset && el.dataset.auto) {
    const [vi, k] = el.dataset.auto.split('|'); await adminAutoPrice(Number(vi), k);
  }
  if (el.dataset && el.dataset.act === 'photo' && el.files[0]) {
    try { const p = P(state.aPid); p.image = await resizeImage(el.files[0]); if (saveDraft()) { renderAdmin(); toast('Фото загружено'); } }
    catch (err) { toast('Не удалось загрузить фото'); }
  }
});

/* ---------- старт ---------- */
if (CFG.SHOW_ID_BANNER) {
  const b = $('#idbanner'); b.hidden = false;
  b.innerHTML = uid
    ? `Твой Telegram ID: <b>${uid}</b><button data-act="copyid">Копировать</button>`
    : 'Открой приложение внутри Telegram, чтобы увидеть ID';
}
/* ---------- видео-фон ---------- */
(function initBg() {
  const v = $('#bgvid'), bg = $('.bg');
  const list = (CFG.BG_VIDEOS || []).slice();
  const conn = navigator.connection;
  if (!v || !list.length || (conn && conn.saveData) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('webkit-playsinline', '');
  let i = -1, fails = 0;
  v.loop = list.length === 1;
  const play = () => { const r = v.play(); if (r && r.catch) r.catch(() => {}); };
  const next = () => {
    if (fails >= list.length) { v.classList.remove('on'); bg.classList.remove('vid'); return; }
    i = (i + 1) % list.length;
    v.classList.remove('on');
    setTimeout(() => { v.src = list[i]; v.load(); play(); }, v.getAttribute('src') ? 700 : 0);
  };
  v.addEventListener('playing', () => { fails = 0; v.classList.add('on'); bg.classList.add('vid'); });
  v.addEventListener('error', () => { fails++; next(); });
  v.addEventListener('ended', next);
  document.addEventListener('visibilitychange', () => { document.hidden ? v.pause() : v.getAttribute('src') && play(); });
  document.addEventListener('touchstart', () => { if (v.paused && v.getAttribute('src')) play(); }, { once: true, passive: true });
  next();
})();

updateBadge(); renderTab();
setTimeout(() => document.body.classList.remove('boot'), 1800);
})();
