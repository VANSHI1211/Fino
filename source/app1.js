/* Money On Call · app UI, part 1: core, home, conversation, voice, onboarding.
   Screens follow the Figma file "Personal Finance Assistant – IA" (page Screens). */
'use strict';
const E = window.Engine, Sync = window.Sync, V = window.Voice, A = window.ASSETS || {};
const KEY = 'money-on-call-v4';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f = (p, o) => E.fmt(p, o);

/* ---------- icons (24px stroke) ---------- */
const P = {
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>', back: '<path d="M15 5l-7 7 7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>', send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', chevR: '<path d="M10 6l6 6-6 6"/>', chevD: '<path d="M6 9.5l6 6 6-6"/>', chevU: '<path d="M6 14.5l6-6 6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', bars: '<path d="M5 20V10M10 20V5M15 20v-7M20 20v-4"/>', compare: '<path d="M7 4v14M4 15l3 3 3-3M17 20V6M14 9l3-3 3 3"/>',
  trend: '<path d="M4 16l5-5 4 4 7-7M15 8h5v5"/>', list: '<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>', info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  receipt: '<path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>', scan: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16M8 12h8"/>',
  phoneShot: '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M9.5 12.5l2 2 3.5-4"/>', pencil: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-4-4L4 16z"/>', bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-3 7.7-7 9.5-4-1.8-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>', lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  lang: '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 7M11 6c-.5 3-3 6-6 7.5M13 20l4-9 4 9M14.3 17h5.4"/>', sms: '<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v8a2.5 2.5 0 01-2.5 2.5H10l-4 3.5V17h0A2 2 0 014 15z"/><path d="M8 9h8M8 12.5h5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.3M12 17h.01"/>', q: '<path d="M9.6 9a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.3M12 17h.01"/>',
  limit: '<path d="M12 3.5a8.5 8.5 0 108.5 8.5"/><path d="M12 12l4-4"/>', home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 0-3 2.5-3 6s1.5 4 3 4v8"/>', car: '<path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v3h3v-3M16 16v3h3v-3M7.5 13h.01M16.5 13h.01"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 016 0V8"/>', cart: '<path d="M3 4h2.5l2.2 11h10l2-8H7M9.5 20h.01M17 20h.01"/>', users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 5.2a3.5 3.5 0 010 6.6M18 14.8c1.9.7 3.2 2.4 3.5 5.2"/>',
  film: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4"/>', heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0013.5 4h-7A2.5 2.5 0 004 6.5v7A2.5 2.5 0 006.5 16H8"/>',
  spark: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>', speakerOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 107.5-7.5H8M8 4.5L10.5 2M8 4.5L10.5 7"/>', share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 14h10"/>', pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>', bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M4 13h3M17 13h3M5 8l2.5 2M19 8l-2.5 2M5 19l2.5-2M19 19l-2.5-2"/>',
  idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>', wave: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>', theme: '<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v8a2.5 2.5 0 01-2.5 2.5H10l-4 3.5V17h0A2 2 0 014 15z"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>', widget: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
  wifi: '<path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.7 16a5 5 0 016.6 0M12 19.5h.01"/>', battery: '<rect x="3" y="7.5" width="16" height="9" rx="2"/><path d="M21 10.5v3M5.5 10h9v4h-9z"/>', signal: '<path d="M5 19v-3M9.5 19v-6M14 19V9.5M18.5 19V5.5"/>',
  replayob: '<path d="M4 12a8 8 0 108-8H8M8 4L10.5 1.5M8 4l2.5 2.5"/>', camera: '<path d="M4 8.5A2.5 2.5 0 016.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z"/><circle cx="12" cy="12.5" r="3.4"/>',
};
const ic = (n, cls = '', sz) => `<svg class="${cls}" ${sz ? `width="${sz}" height="${sz}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
/* Assistant mark — exported from the Figma component "Assistant mark" */
const MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><defs><linearGradient id="a" x1="2.2" y1="1.1" x2="19.8" y2="20.9" gradientUnits="userSpaceOnUse"><stop stop-color="#6A3DF5"/><stop offset=".5" stop-color="#9B3FE6"/><stop offset="1" stop-color="#D23A93"/></linearGradient><linearGradient id="b" x1="11" y1="0" x2="11" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><circle cx="11" cy="11" r="11" fill="url(#a)"/><circle cx="11" cy="11" r="11" fill="url(#b)"/><path d="M11 11C10.6562 8.59375 11.6875 6.01562 14.0938 5.32812C15.2969 7.21875 14.2656 9.79688 11 11Z" fill="#fff" fill-opacity=".96"/><path d="M11 11C12.912 9.49921 15.6603 9.10324 17.4589 10.8434C16.4231 12.8306 13.6747 13.2266 11 11Z" fill="#fff" fill-opacity=".72"/><path d="M11 11C13.2557 11.9055 14.9728 14.0876 14.3651 16.5152C12.1262 16.6119 10.4091 14.4297 11 11Z" fill="#fff" fill-opacity=".96"/><path d="M11 11C11.3438 13.4062 10.3125 15.9844 7.90625 16.6719C6.70312 14.7812 7.73438 12.2031 11 11Z" fill="#fff" fill-opacity=".72"/><path d="M11 11C9.088 12.5008 6.33966 12.8968 4.54114 11.1566C5.5769 9.16939 8.32525 8.77342 11 11Z" fill="#fff" fill-opacity=".96"/><path d="M11 11C8.74425 10.0945 7.02716 7.91239 7.63489 5.48476C9.87378 5.38814 11.5909 7.57029 11 11Z" fill="#fff" fill-opacity=".72"/></svg>';
const MARK_URI = 'data:image/svg+xml,' + encodeURIComponent(MARK_SVG);
// Drawn inline (not as an <img>) so it shows everywhere, including the hosted page.
let markN = 0;
const markSvg = (size, cls) => { const k = 'mk' + (++markN); return MARK_SVG.replace('<svg ', `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true" `).replace(/id="a"/, `id="${k}a"`).replace(/id="b"/, `id="${k}b"`).replace(/url\(#a\)/g, `url(#${k}a)`).replace(/url\(#b\)/g, `url(#${k}b)`); };
const mark = (size = 34) => markSvg(size, 'mark');
const CAT_IC = { Food: 'food', Travel: 'car', Shopping: 'bag', Household: 'home', Bills: 'bolt', Entertainment: 'film', Health: 'heart', Shared: 'users', Other: 'spark' };
const CAT_LABEL = { Household: 'Home & groceries' };
const catLabel = (id) => CAT_LABEL[id] || id || 'Other';
const LANG_NAME = { en: 'English', hi: 'हिंदी', hinglish: 'English' };
const VOICE_NAME = { female: 'Aria', male: 'Kabir' };

/* ---------- state ---------- */
const PREF_KEYS = ['dataSource', 'onboarded', 'lang', 'voice', 'speak', 'theme', 'notifOn', 'micOn', 'smsOn', 'history', 'asked', 'alerted', 'alertsOn', 'name', 'widgetOn'];
const DATA_KEYS = ['txns', 'rules', 'merchants', 'corrections', 'limits', 'questionsPerDay', 'nextRow', 'remNextRow', 'ruleRows', 'loadedAt'];
let S = E.newState();
S.alertsOn = true; S.widgetOn = true; S.lang = 'en';
function loadLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || s.v !== 4) return false;
    for (const k of PREF_KEYS) if (s[k] !== undefined) S[k] = s[k];
    if (s.offline) for (const k of DATA_KEYS) if (s.offline[k] !== undefined) S[k] = s.offline[k];
    return true;
  } catch (e) { return false; }
}
function save() {
  try {
    const o = { v: 4 };
    for (const k of PREF_KEYS) o[k] = S[k];
    if (Sync.mode !== 'live') { o.offline = {}; for (const k of DATA_KEYS) o.offline[k] = S[k]; }
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch (e) { /* storage blocked: keep in memory */ }
}
loadLocal();
if (S.lang !== 'hi') S.lang = 'en';
// Every time the app opens: splash → onboarding (1.1 – 1.4) → Home, as in the Figma flow.
S.onboarded = false;
const now = () => Date.now();
const ui = { splash: true, route: 'home', param: null, stack: [], sheet: null, drawer: false, thread: [], toast: null, banner: null, txFilter: 'all', txSearch: '', searchOpen: false, ob: 0, scroll: {}, voice: null, speakingIdx: null, loading: false, loadErr: null, obBusy: false, obErr: null };

function isDark() { return S.theme === 'dark' || (S.theme !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
function applyTheme() { const r = document.documentElement; if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme'); }
const art = (name) => A[name + (isDark() ? 'Dark' : 'Light')] || A[name] || '';

/* ---------- helpers ---------- */
const r0 = () => E.ranges(now());
const fmtTime = (ts) => E.time12(ts);
const fmtTimeU = (ts) => E.time12(ts).toUpperCase();
const dayLabel = (ts) => { const a = E.time.dayStart(ts), b = E.time.dayStart(now()); const t = E.time.p(ts); const base = `${E.time.DOW[t.dow]} ${t.d} ${E.time.MON[t.m]}`; return a === b ? `Today · ${base}` : a === b - E.time.DAY ? `Yesterday · ${base}` : base; };
const whenShort = (ts) => { const a = E.time.dayStart(ts), b = E.time.dayStart(now()); const t = E.time.p(ts); return a === b ? `Today, ${fmtTime(ts)}` : a === b - E.time.DAY ? `Yesterday, ${fmtTime(ts)}` : `${E.time.DOW[t.dow]} ${t.d} ${E.time.MON[t.m]}, ${fmtTime(ts)}`; };
const initial = (n) => (String(n || '?').trim()[0] || '?').toUpperCase();
const tx = (id) => S.txns.find((t) => t.id === id);
const needs = () => E.needsList(S, now());
const counts = (t) => E.spendOf(t) > 0;
const perWordOf = (p) => (p === 'daily' ? 'a day' : p === 'weekly' ? 'a week' : 'a month');
const periodThis = (p) => (p === 'daily' ? 'today' : p === 'weekly' ? 'this week' : 'this month');
const catLine = (t) => {
  if (t.kind === 'self') return 'Own transfer · not spending';
  if (t.kind === 'lent') return 'Money lent · not spending';
  if (t.kind === 'notspend') return 'Not a spend';
  if (t.kind === 'split') return `Split · your share ${f(t.share)}`;
  if (t.catStatus === 'needs') return 'Needs a category';
  if (t.catStatus === 'auto') return catLabel(t.cat);
  return t.sub || catLabel(t.cat);
};
const groupBy = (list) => { const g = []; let cur = null; for (const t of list) { const d = E.time.dayStart(t.ts); if (!cur || cur.d !== d) { cur = { d, items: [] }; g.push(cur); } cur.items.push(t); } return g; };
const firstName = () => (S.name || '').split(' ')[0] || '';

/* ============================================================ ORB (2.1 particle sphere) */
let orbRAF = null;
function mountOrb() {
  cancelAnimationFrame(orbRAF);
  const c = document.getElementById('orb'); if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = c.clientWidth || 260; c.width = size * dpr; c.height = size * dpr;
  const ctx = c.getContext && c.getContext('2d'); if (!ctx) return; ctx.scale(dpr, dpr);
  const N = 380, pts = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963; pts.push([Math.cos(th) * rad, y, Math.sin(th) * rad]); }
  const rgb = [[142, 197, 255], [124, 77, 255], [217, 92, 245], [255, 158, 210]];
  const mix = (t) => { const s = Math.min(2.999, Math.max(0, t * 3)); const i = Math.floor(s), k = s - i; const a = rgb[i], b = rgb[i + 1]; return a.map((v, j) => Math.round(v + (b[j] - v) * k)); };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let a = 0.6; const R = size * 0.4, cx = size / 2, cy = size / 2;
  function frame() {
    if (!document.body.contains(c)) return;
    ctx.clearRect(0, 0, size, size);
    const ca = Math.cos(a), sa = Math.sin(a), tilt = 0.3, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (const [x, y, z] of pts) {
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const wob = 1 + 0.035 * Math.sin(3 * y + a * 2);
      const px = cx + x1 * R * wob, py = cy + y2 * R * wob; const depth = (z2 + 1) / 2;
      const [r, g, b] = mix((x1 + 1) / 2 * 0.7 + (y2 + 1) / 2 * 0.3);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + depth * 0.75})`;
      ctx.beginPath(); ctx.arc(px, py, 0.5 + depth * 1.9, 0, 6.283); ctx.fill();
    }
    a += 0.004;
    if (!reduce) orbRAF = requestAnimationFrame(frame);
  }
  frame();
}

/* ============================================================ RENDER */
const app = document.getElementById('app');
function render(opts = {}) {
  const prev = $('.view .scroll');
  if (prev && !opts.resetScroll) ui.scroll[ui.route + (ui.param || '')] = prev.scrollTop;
  const active = document.activeElement && document.activeElement.id;
  const caret = active && document.activeElement.selectionStart;
  if (ui.splash && $('.view.splash')) { if (ui.splash === 'out') $('.view.splash').classList.add('out'); return; }
  let body;
  if (ui.splash) body = splashView();
  else if (!S.onboarded) body = onboarding();
  else if (ui.loading && !S.txns.length) body = loadingView();
  else if (ui.voice) body = voiceView();
  else body = view();
  app.innerHTML = `<div class="phone">${statusBar()}<div class="screen">${body}${S.onboarded && !ui.splash ? overlays() : ''}${toastHTML()}${bannerHTML()}</div><i class="home-ind" aria-hidden="true"></i></div>`;
  const sc = $('.view .scroll');
  if (sc) { if (opts.bottom) sc.scrollTop = sc.scrollHeight; else if (!opts.resetScroll) sc.scrollTop = ui.scroll[ui.route + (ui.param || '')] || 0; }
  mountOrb();
  const focusId = opts.focus || (active && !opts.noRefocus ? '#' + active : null);
  if (focusId) { const el = $(focusId); if (el && el.focus) { el.focus({ preventScroll: true }); try { if (caret != null && el.setSelectionRange && !opts.focus) el.setSelectionRange(caret, caret); } catch (e) { /* not a text input */ } } }
}
function go(route, param = null) { V.stopSpeaking(); ui.speakingIdx = null; ui.stack.push([ui.route, ui.param]); ui.route = route; ui.param = param; ui.drawer = false; ui.sheet = null; ui.searchOpen = false; render({ resetScroll: true, noRefocus: true }); }
function back() { const p = ui.stack.pop() || ['home', null]; ui.route = p[0]; ui.param = p[1]; ui.sheet = null; render({ noRefocus: true }); }
function home(newChat) { ui.stack = []; ui.route = 'home'; ui.param = null; ui.drawer = false; ui.sheet = null; if (newChat) { ui.thread = []; V.stopSpeaking(); ui.speakingIdx = null; } render({ noRefocus: true }); }

/* Android status bar with the real time (shown inside the desktop phone frame) */
function statusBar() {
  return `<div class="statusbar" aria-hidden="true"><span data-clock="hm">${E.clock(now())}</span><span class="row" style="gap:5px">${ic('signal', '', 15)}${ic('wifi', '', 15)}${ic('battery', '', 17)}</span></div>`;
}
const lockClock = () => { const t = E.time.p(now()); return `${(t.h % 12) || 12}:${String(t.mi).padStart(2, '0')}`; };
const lockDate = () => { const t = E.time.p(now()); return `${E.time.DOW[t.dow]}, ${t.d} ${E.time.MON[t.m]}`.toUpperCase(); };
const widgetDay = () => { const t = E.time.p(now()); return `${E.time.DOW_FULL[t.dow]}, ${t.d} ${E.time.MONTH_FULL[t.m]}`; };
function tickClock() {
  document.querySelectorAll('[data-clock]').forEach((el) => {
    const k = el.getAttribute('data-clock');
    if (k === 'hm') el.textContent = E.clock(now());
    else if (k === 'big') el.textContent = lockClock();
    else if (k === 'date') el.textContent = lockDate();
    else if (k === 'widgetday') el.textContent = widgetDay();
  });
}

function view() {
  switch (ui.route) {
    case 'txns': return txnsView();
    case 'txn': return txnView();
    case 'add': return addView();
    case 'bill': return billView();
    case 'insights': return insightsView();
    case 'limits': return limitsView();
    case 'catlimit': return limitEditView(ui.param || 'Travel');
    case 'overall': return limitEditView(null);
    case 'asked': return askedView();
    case 'settings': return settingsView();
    case 'remembered': return rememberedView();
    case 'help': return helpView();
    default: return homeView();
  }
}
function loadingView() {
  return `<section class="view">${topbar()}<div class="scroll pad"><div class="stack center" style="gap:14px;padding-top:40px;align-items:center"><div class="orb-wrap"><canvas id="orb" class="orb" aria-hidden="true"></canvas></div><div class="small">Reading your payment SMS…</div></div></div></section>`;
}
const topbar = () => `<div class="topbar pad">
    <button class="iconbtn" data-a="drawer" aria-label="Open menu">${ic('menu')}</button>
    <button class="assist-pill" data-a="newchat" aria-label="Assistant, start a new conversation">${mark(34)}<span><b>Assistant</b><span>Your money, on call</span></span></button>
    <button class="iconbtn" data-a="speaktoggle" aria-label="${S.speak ? 'Spoken answers on' : 'Spoken answers off'}" aria-pressed="${S.speak ? 'true' : 'false'}">${ic(S.speak ? 'speaker' : 'speakerOff')}</button></div>`;
const navbar = (title, right = '') => `<div class="navbar pad"><button class="iconbtn" data-a="back" aria-label="Back">${ic('back')}</button><h1>${esc(title)}</h1><div style="display:flex;justify-content:flex-end">${right}</div></div>`;
const msgbar = (ph) => `<form class="msgbar pad" data-form="ask" autocomplete="off">
    <div class="field-pill"><button type="button" class="round" data-a="sheet" data-v="attach" aria-label="Add a payment">${ic('plus')}</button>
    <input id="ask-input" name="q" placeholder="${esc(ph || 'Ask anything…')}" aria-label="Ask a question" enterkeyhint="send" data-input="ask"></div>
    <button type="button" class="fab" id="fab" data-a="fab" aria-label="Speak">${ic('mic')}</button></form>`;

/* ---------- 2.1 Home / 2.1b First use ---------- */
const GREET = { en: (n) => `Hi${n ? ' ' + n : ''}, I'm your money assistant` }; // app text is English only
const SUGG = [
  [['clock', 'Spent today?', 'How much did I spend today?'], ['limit', 'Food budget?', 'How much is left in my food limit?'], ['bars', 'Top spending?', 'Where did most of my money go this month?'], ['limit', 'Can I afford it?', 'Can I afford a ₹2,000 dinner?']],
  [['trend', 'Biggest expense?', 'What was my biggest expense this month?'], ['compare', 'Vs last month?', 'Why did I spend more this month?'], ['food', 'Swiggy spend?', 'How much on Swiggy this month?'], ['spark', 'Anything unusual?', 'Anything unusual this month?']],
];
function ringSvg(pct, size, w) {
  const rr = (size - w) / 2, c = 2 * Math.PI * rr, v = Math.min(100, Math.max(0, pct));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg);flex:none" aria-hidden="true"><defs><linearGradient id="g${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ec5ff"/><stop offset=".5" stop-color="#b58cff"/><stop offset="1" stop-color="#f06bb7"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="var(--track)" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="url(#g${size})" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}"/></svg>`;
}
function limitPill() {
  const st = E.limitStatus(S, now(), null);
  if (!st) return `<button class="limit-pill bordered" data-a="go" data-v="overall"><span class="eyebrow mono">Monthly limit</span><span class="t1 medium" style="margin-left:24px">Not set · Set one</span></button>`;
  return `<button class="limit-pill" data-a="go" data-v="limits">${ringSvg(st.pct, 16, 2.5)}<span class="eyebrow">Monthly budget</span><span class="ta num manrope medium">${st.left >= 0 ? f(st.left) + ' left' : f(-st.left) + ' over'} · ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'}</span></button>`;
}
function homeView() {
  if (ui.thread.length) {
    return `<section class="view">${topbar()}<div class="scroll pad"><div class="thread">${ui.thread.map(msgHTML).join('')}</div></div>${msgbar(ui.thread.length > 3 ? 'Ask anything…' : 'Ask a follow-up…')}</section>`;
  }
  const greet = GREET.en(firstName());
  const loadErr = ui.loadErr ? `<button class="callout" data-a="reload"><span class="tile">${ic('sms')}</span><span class="grow"><span class="title" style="display:block">Couldn't read your SMS just now</span><span class="sub">Tap to try again. You can still add payments by voice, typing or a bill.</span></span>${ic('chevR', 'chev')}</button>` : '';
  if (!S.txns.length) {
    return `<section class="view">${topbar()}<div class="scroll pad"><div class="stack" style="gap:16px;padding-bottom:12px">
      <div class="orb-wrap"><button class="orb-btn" data-a="voice" aria-label="Tap to speak"><canvas id="orb" class="orb" aria-hidden="true"></canvas></button></div>
      <div class="stack center" style="gap:6px"><div class="body">${esc(greet)}</div><h2 class="display">Let's track your<br>first payment</h2></div>
      <div style="display:flex;justify-content:center">${limitPill()}</div>
      ${loadErr || (!S.smsOn ? `<button class="callout" data-a="go" data-v="settings"><span class="tile">${ic('sms')}</span><span class="grow"><span class="title" style="display:block">SMS tracking is off</span><span class="sub">Add payments by voice, typing or a bill. Turn on SMS any time.</span></span>${ic('chevR', 'chev')}</button>` : '')}
      <div class="chips"><button class="chip" data-a="ask" data-v="₹200 on auto">${ic('plus')}Add ₹200 on auto</button><button class="chip" data-a="scanbill">${ic('scan')}Scan a bill</button><button class="chip" data-a="go" data-v="overall">${ic('limit')}Set a limit</button><button class="chip" data-a="go" data-v="help"><span class="ta" style="font-weight:500;width:16px;text-align:center">?</span>What can I ask?</button></div>
    </div></div>${msgbar('Try “₹200 on auto”')}</section>`;
  }
  const n = needs().length;
  return `<section class="view">${topbar()}<div class="scroll pad"><div class="stack" style="gap:0">
    <div class="orb-wrap" style="height:300px"><button class="orb-btn" data-a="voice" aria-label="Tap to speak"><canvas id="orb" class="orb" aria-hidden="true"></canvas></button></div>
    <div class="stack center" style="gap:8px"><div class="body">${esc(greet)}</div><h2 class="display">What would you like<br>to know today?</h2></div>
    <div style="display:flex;justify-content:center;margin-top:16px">${limitPill()}</div>
    ${n ? `<div style="display:flex;justify-content:center;margin-top:8px"><button class="chip m soft" data-a="clarify"><span style="font-weight:500">?</span>${n} payment${n > 1 ? 's' : ''} need${n > 1 ? '' : 's'} a category</button></div>` : ''}
    ${loadErr ? `<div style="margin-top:12px">${loadErr}</div>` : ''}
    </div></div>
    <div class="sugg"><div class="chips scrollx">${SUGG[0].map(([i, l, q]) => `<button class="chip" data-a="ask" data-v="${esc(q)}">${ic(i)}${esc(l)}</button>`).join('')}</div>
      <div class="chips scrollx">${SUGG[1].map(([i, l, q]) => `<button class="chip" data-a="ask" data-v="${esc(q)}">${ic(i)}${esc(l)}</button>`).join('')}</div></div>
    ${msgbar()}</section>`;
}

/* ---------- 2.2c / 2.3 conversation ---------- */
const FU_IC = (x) => (/show|payments|dikhao|where/i.test(x.label) ? 'list' : /limit|bacha|left|spend/i.test(x.label) ? 'limit' : /compare|vs|last|pichle/i.test(x.label) ? 'compare' : /categori/i.test(x.label) ? 'q' : /set|add/i.test(x.label) ? 'plus' : 'chevR');
const fuAttrs = (x) => (x.q ? `data-a="ask" data-v="${esc(x.q)}"` : `data-a="fu" data-v="${esc(x.action)}"`);
const HG_FU = { 'Compare with last week': 'Pichle hafte se compare karo', 'Compare with last month': 'Pichle mahine se compare karo' };
function fuLabel(x, lang) {
  if (lang !== 'hinglish') return x.label;
  let m = x.label.match(/^Show the (\d+) payments?$/); if (m) return `${m[1]} payment${m[1] === '1' ? '' : 's'} dikhao`;
  m = x.label.match(/^Check my (\w+) limit$/); if (m) return `${m[1][0].toUpperCase() + m[1].slice(1)} limit kitna bacha?`;
  return HG_FU[x.label] || x.label;
}
const speakingLbl = () => `<div class="speaking-lbl"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>Speaking</div>`;
function msgHTML(m, idx) {
  if (m.type === 'day') return `<div class="daytag eyebrow mono">${esc(m.text)}</div>`;
  if (m.type === 'you') return `<div class="you">${esc(m.text)}</div>`;
  if (m.pending) return `<div class="ai">${mark(30)}<div class="col"><div class="acard"><div class="row small" style="gap:10px"><span class="typing"><i></i><i></i><i></i></span>Analysing your transactions…</div></div></div></div>`;
  const a = m.a; const v = a.viz || {}; const lang = a.lang;
  const speaking = ui.speakingIdx === idx;
  const sl = speaking ? speakingLbl() : '';
  const line = a.line ? `<div class="line">${esc(a.line).replace(/(₹[\d,]+ (more|less|over|zyada|kam|ज़्यादा|कम))/g, '<em>$1</em>')}</div>` : '';
  let body = '';
  if (a.kind === 'amount') {
    const segs = v.segments || [];
    body = `<div class="acard">${sl}<div class="row" style="align-items:baseline;gap:8px;flex-wrap:wrap"><span class="big num">${esc(a.big)}</span><span class="t2">${esc(a.small)}</span></div>
      ${a.sub ? `<div class="sub-line">${esc(a.sub.replace(/^./, (c) => c.toUpperCase())).replace(/(₹[\d,]+ (more|less|zyada|kam|ज़्यादा|कम))/, '<em>$1</em>')}</div>` : ''}
      ${segs.length > 1 ? `<div class="segbar">${segs.map((s) => `<i style="flex:${Math.max(1, s.amount)}"></i>`).join('')}</div><div class="legend">${segs.map((s, i) => `<span><i class="dot ${['', 'b', 'c'][i]}"></i>${esc(s.label)} <b class="num t1">${f(s.amount)}</b></span>`).join('')}</div>` : ''}</div>`;
  } else if (a.kind === 'compare') {
    body = line + compareCard(v, sl);
  } else if (a.kind === 'bars') {
    const max = Math.max(...v.rows.map((x) => x.amount));
    body = line + `<div class="acard">${sl}<div class="row"><span class="eyebrow grow">Where it went · ${esc(v.label)}</span><span class="small num">${f(v.total)}</span></div>${v.rows.map((x) => `<div class="stack" style="gap:6px"><div class="row"><span class="grow">${esc(catLabel(x.label))}</span><b class="num medium">${f(x.amount)}</b></div><div class="bar thin"><i style="width:${(x.amount / max) * 100}%"></i></div></div>`).join('')}</div>`;
  } else if (a.kind === 'limit' && v.st) {
    const st = v.st; const extra = v.type === 'afford' ? v.amt : 0; const sp = Math.min(100, (st.spent / st.limit) * 100);
    body = line + `<div class="acard">${sl}<div class="row"><span class="eyebrow grow">${esc(v.label === 'Overall limit' ? 'Overall limit' : catLabel(v.label) + ' limit')}</span><span class="badge">${st.pct}% used</span></div>
      <div class="row" style="align-items:baseline;gap:8px"><span class="mid num">${f(Math.abs(st.left))} ${st.left >= 0 ? 'left' : 'over'}</span><span class="small">of ${f(st.limit)} ${periodThis(st.period)}</span></div>
      <div class="bar"><i style="width:${sp}%"></i>${extra ? `<i class="muted" style="left:${sp}%;width:${Math.max(0, Math.min(100 - sp, (extra / st.limit) * 100))}%"></i>` : ''}</div>
      <div class="small">${st.perDay ? `About ${f(st.perDay)} a day for the next ${st.daysLeft} days` : `Warns at ${f(st.warnAt)}`}</div></div>`;
  } else if (a.kind === 'list' && v.ids) {
    body = line + `<div class="acard" style="padding:6px 16px">${v.ids.map((id, i) => { const t = tx(id); return t ? txnRow(t, v.why ? v.why[i] : null) : ''; }).join('')}${v.more ? `<button class="small link" style="padding:6px 0 10px;text-align:left" data-a="fu" data-v="txns:all">+ ${v.more} more in Transactions</button>` : ''}</div>`;
  } else if (a.kind === 'recurring') {
    body = line + (v.rows.length ? `<div class="acard" style="padding:6px 16px">${v.rows.map((x) => `<div class="lrow"><span class="avatar">${initial(x.payee)}</span><span class="grow"><span class="ttl" style="display:block">${esc(x.payee)}</span><span class="sub">Every month · last ${whenShort(x.last)}</span></span><b class="num medium">${f(x.amount)}</b></div>`).join('')}</div>` : '');
  } else if (a.kind === 'scope') {
    body = `${line}<div class="acard" style="padding:12px 16px 4px"><div class="eyebrow">I can help with</div>${a.help.map((h, i) => `<button class="lrow" ${fuAttrs(h)}><span class="ic">${ic(['list', 'limit', 'plus'][i] || 'chevR')}</span><span class="grow ttl" style="font-size:14px">${esc(h.label)}</span>${ic('chevR', 'chev')}</button>`).join('')}</div>`;
  } else if (a.kind === 'unknown') {
    const chips = a.followups.filter((x) => x.action !== 'speak');
    body = `<div class="line">${esc(a.line)}</div><div class="chips">${chips.map((x) => `<button class="chip m" ${fuAttrs(x)}>${esc(x.label)}</button>`).join('')}<button class="chip m soft" data-a="voice">${ic('mic')}Speak again</button></div>`;
  } else if (a.kind === 'add') {
    const d = a.draft;
    if (m.done) body = `<div class="line">${esc(m.done)}</div>`;
    else body = `<div class="line">${esc(a.line || 'Add this payment?')}</div><div class="acard"><div class="row" style="align-items:baseline;gap:8px"><span class="big num">${f(d.amount)}</span><span class="t2">${esc(d.payee)}</span></div>
      <div class="chips">${E.CATS.filter((c) => c.id !== 'Shared').map((c) => `<button class="chip m ${d.cat === c.id ? 'sel' : ''}" data-a="draftcat" data-v="${idx}|${c.id}">${esc(catLabel(c.id))}</button>`).join('')}</div>
      <div class="small">${esc(d.cat ? (d.sub || E.defaultSub(d.cat)) : 'Pick a category')} · Cash · ${whenShort(d.ts)}</div>
      <div class="row"><button class="btn primary s" data-a="draftadd" data-v="${idx}" ${d.cat ? '' : 'disabled'}>Add payment</button><button class="btn ghost s" data-a="draftedit" data-v="${idx}">Edit details</button></div></div>`;
  } else if (a.kind === 'setlimit') {
    const d = a.draft;
    if (m.done) body = `<div class="line">${esc(m.done)}</div>`;
    else {
      const prev = d.catId ? S.limits.cats[d.catId] : S.limits.overall;
      const st = previewLimit(d.catId, d.amount, d.period);
      const what = d.catId ? catLabel(d.catId).toLowerCase() : 'all spending';
      body = `<div class="line">${prev ? `You already have ${f(prev.amount)} ${perWordOf(prev.period)} for ${d.catId ? what : 'your overall limit'}. Change it to ${f(d.amount)} ${perWordOf(d.period)}?` : `Keep ${what} under ${f(d.amount)} ${perWordOf(d.period)}?`}</div>
      <div class="acard"><div class="small">You've spent ${f(st.spent)} ${periodThis(d.period)}, so ${st.left >= 0 ? `${f(st.left)} is left${st.perDay ? `, about ${f(st.perDay)} a day for the next ${st.daysLeft} days` : ''}` : `you're already ${f(-st.left)} over`}. I'll warn you at ${f(st.warnAt)}.</div>
      <div class="row"><button class="btn primary s" data-a="draftlimit" data-v="${idx}">${prev ? 'Change limit' : 'Set limit'}</button><button class="btn ghost s" data-a="go" data-v="${d.catId ? 'catlimit' : 'overall'}" data-p="${d.catId || ''}">Adjust</button></div></div>`;
    }
  } else body = line ? (sl ? `<div class="acard">${sl}${line}</div>` : line) : '';
  const cover = a.coverage ? `<div class="cover">${ic('info')}<span>${esc(a.coverage)}</span></div>` : '';
  const stopBtn = '<button class="act on" data-a="stopspeak"><span class="sq"></span>Stop</button>';
  const acts = a.kind === 'amount' ? `<div class="acts">${speaking ? stopBtn : `<button class="act" data-a="replay" data-v="${idx}">${ic('replay')}Replay</button>`}<button class="act" data-a="share" data-v="${idx}">${ic('share')}Share</button></div>`
    : (speaking && !['add', 'setlimit'].includes(a.kind) ? `<div class="acts">${stopBtn}</div>` : '');
  let fus = '';
  const list = (a.followups || []);
  if (list.length && !['unknown', 'scope', 'add', 'setlimit'].includes(a.kind)) {
    if (a.kind === 'amount') {
      const open = m.fuOpen !== false;
      fus = `<div class="asknext"><button class="asknext-h" data-a="fuToggle" data-v="${idx}" aria-expanded="${open}">${ic('pulse', 'ta', 16)}<span class="grow">${lang === 'hinglish' ? 'Aage poochho' : 'Ask next'}</span>${ic(open ? 'chevD' : 'chevU', 'chev')}</button>${open ? list.map((x) => `<button class="lrow" ${fuAttrs(x)}><span class="ic">${ic(FU_IC(x))}</span><span class="grow ttl" style="font-size:14px">${esc(fuLabel(x, lang))}</span>${ic('chevR', 'chev')}</button>`).join('') : ''}</div>`;
    } else fus = `<div class="chips">${list.map((x) => `<button class="chip m ${/categori/i.test(x.label) ? 'soft' : ''}" ${fuAttrs(x)}>${/categori/i.test(x.label) ? '<span style="font-weight:500">?</span>' : ic(FU_IC(x))}${esc(x.label)}</button>`).join('')}</div>`;
  }
  return `<div class="ai">${mark(30)}<div class="col">${body}${cover}${acts}${fus}</div></div>`;
}
function compareCard(v, sl = '') {
  const rows = v.rows.filter((x) => x.a || x.b).slice(0, 4); const n = rows.length;
  if (!n) return '';
  const max = Math.max(...rows.map((x) => Math.max(x.a, x.b)), 1);
  const lastPrev = v.prevLabel.replace(/^\d+–/, '');
  return `<div class="acard">${sl}<div class="row"><span class="eyebrow mono grow">What changed</span>${v.pct != null ? `<span class="badge">${v.pct >= 0 ? '+' : '−'}${Math.abs(v.pct)}%</span>` : ''}</div>
    <div class="row" style="align-items:baseline;gap:8px;flex-wrap:wrap"><span class="mid num">${f(v.total)}</span><span class="small">vs ${f(v.prevTotal)} by ${esc(lastPrev)}</span></div>
    <div class="legend"><span><i class="sqdot c"></i>${esc(v.prevLabel)}</span><span><i class="sqdot"></i>${esc(v.curLabel)}</span></div>
    <div class="gchart" style="--n:${n}" role="img" aria-label="Spending by category, ${esc(v.prevLabel)} versus ${esc(v.curLabel)}">${rows.map((x) => `<div class="gcol"><span class="d ${x.delta < 0 ? 'neg' : ''}">${x.delta >= 0 ? '+' : '−'}${f(Math.abs(x.delta))}</span><div class="gbars"><i class="a" style="height:${Math.round((x.a / max) * 100)}px"></i><i class="b" style="height:${Math.round((x.b / max) * 100)}px"></i></div></div>`).join('')}</div>
    <div class="glabels" style="--n:${n}">${rows.map((x) => `<div><b>${esc(x.label === 'Household' ? 'Home' : x.label === 'Entertainment' ? 'Fun' : x.label)}</b><span>${f(x.b)}</span></div>`).join('')}</div></div>`;
}
function txnRow(t, why) {
  const off = !counts(t);
  const meta = why || `${catLine(t)} · ${t.method} · ${fmtTime(t.ts)}`;
  return `<button class="txn" data-a="go" data-v="txn" data-p="${esc(t.id)}"><span class="avatar">${initial(t.payee)}</span><span class="grow"><span class="name">${esc(t.payee)}${t.catStatus === 'remembered' ? `<span title="Remembered choice" class="ta" style="display:inline-flex">${ic('shield', '', 15)}</span>` : ''}</span><span class="meta">${esc(meta)}</span></span><span class="amt num ${off ? 'off' : ''}">${f(t.amount)}</span></button>`;
}
function previewLimit(catId, amount, period, alertPct = 80) {
  const fake = JSON.parse(JSON.stringify(S.limits));
  if (catId) fake.cats[catId] = { amount, period, alertPct }; else fake.overall = { amount, period: period || 'monthly', alertPct };
  return E.limitStatus({ ...S, limits: fake }, now(), catId);
}

/* ============================================================ ASKING */
const spokenOf = (a) => {
  if (!a) return '';
  if (a.kind === 'amount') return [a.line, a.sub].filter(Boolean).join(' ');
  if (a.kind === 'add') return `${a.line || 'Add this payment?'} ${f(a.draft.amount)}, ${a.draft.payee}.`;
  if (a.kind === 'setlimit') { const d = a.draft; return `Keep ${d.catId ? d.catId.toLowerCase() : 'all spending'} under ${f(d.amount)} ${perWordOf(d.period)}?`; }
  return a.line || '';
};
function speakIdx(idx) {
  const m = ui.thread[idx]; if (!m || !m.a) return;
  V.speak(spokenOf(m.a), { lang: m.a.lang || S.lang, gender: S.voice,
    onStart: () => { ui.speakingIdx = idx; refreshThread(); },
    onEnd: () => { if (ui.speakingIdx === idx) { ui.speakingIdx = null; refreshThread(); } } });
}
function refreshThread() { if (S.onboarded && !ui.voice && ui.route === 'home' && !ui.sheet) render(); }
const dayTag = () => `Today · ${fmtTimeU(now())}`;

let askSeq = 0;
async function ask(q, opts = {}) {
  q = String(q || '').trim(); if (!q) return;
  V.stopSpeaking(); ui.speakingIdx = null;
  const seq = ++askSeq;
  if (ui.route !== 'home') { ui.stack = []; ui.route = 'home'; ui.param = null; }
  ui.drawer = false; ui.sheet = null;
  const pend = { type: 'ai', pending: true };
  const startLen = ui.thread.length;
  if (!opts.voice) {
    if (!ui.thread.length) ui.thread.push({ type: 'day', text: dayTag(q) });
    ui.thread.push({ type: 'you', text: q, ts: now() }); ui.thread.push(pend);
    render({ bottom: true, noRefocus: true });
  }
  // Speech may mix scripts (English words written in Devanagari); normalise it and note which language was spoken.
  const sn = E.speechNormalize(q);
  let intent = null;
  if (V.sampleOk !== false && V.sample) intent = await Promise.race([V.understand(q, S, now()), new Promise((r) => setTimeout(() => r(null), 9000))]);
  if (seq !== askSeq) return;
  const lang = (intent && ['en', 'hi', 'hinglish'].includes(intent.lang) ? intent.lang : sn.lang);
  if (opts.voice) q = (intent && typeof intent.said === 'string' && intent.said.trim()) ? intent.said.trim() : (sn.lang === 'en' ? sn.text.replace(/\bi\b/g, 'I').replace(/^./, (c) => c.toUpperCase()) : q);
  const work = sn.text || q;
  let a;
  if (intent && intent.intent === 'unclear') a = E.answer(S, 'umm thing', now(), { lang, original: q });
  else {
    const canon = E.intentToQuery(intent);
    a = E.answer(S, canon || work, now(), { lang, original: q });
    if (canon && a.kind === 'unknown') a = E.answer(S, work, now(), { lang, original: q });
  }
  if (a.kind === 'action' && a.action === 'categorise') { ui.thread.length = startLen; ui.voice = null; openClarify(); return; }
  if (opts.voice) {
    ui.voice = null;
    if (!ui.thread.length) ui.thread.push({ type: 'day', text: dayTag(q, lang) });
    ui.thread.push({ type: 'you', text: q, ts: now(), voice: true }); ui.thread.push(pend);
  } else if (startLen === 0 && ui.thread[0] && ui.thread[0].type === 'day') ui.thread[0].text = dayTag(q, lang);
  Object.assign(pend, { pending: false, a });
  S.history.push({ q, ts: now(), kind: a.kind, voice: !!opts.voice, line: a.kind === 'amount' ? `${a.big}${a.sub ? ', ' + a.sub.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase()) : ''}` : (a.line || '').slice(0, 90) });
  S.history = S.history.filter((h) => h.ts > now() - 30 * E.time.DAY).slice(-200);
  save();
  render({ bottom: true, noRefocus: true });
  if (opts.voice && S.speak) speakIdx(ui.thread.indexOf(pend));
}

/* ============================================================ VOICE (2.2a listening / 2.2b thinking) */
let voiceTimer = null;
function micUnavailable(reason) {
  ui.voice = null; render({ focus: '#ask-input', noRefocus: true });
  toast(reason === 'nospeech' ? "I didn't hear anything · try again or type" : "Microphone isn't available here · type your question");
}
function startVoice() {
  V.stopSpeaking(); ui.speakingIdx = null; ui.drawer = false; ui.sheet = null; ui.banner = null;
  if (!V.canListen) { micUnavailable(); return; }
  ui.voice = { phase: 'listening', text: '', t0: now() };
  render({ noRefocus: true });
  clearInterval(voiceTimer);
  voiceTimer = setInterval(() => { const el = $('#voice-timer'); if (el && ui.voice) { const s = Math.floor((now() - ui.voice.t0) / 1000); el.textContent = `0:${String(s).padStart(2, '0')}`; } if (ui.voice && ui.voice.phase === 'listening' && now() - ui.voice.t0 > 15000) V.stopListening(); }, 250);
  V.listen({
    lang: S.lang,
    onInterim: (t) => { if (!ui.voice) return; ui.voice.text = t; const el = $('#voice-text'); if (el) el.innerHTML = transcriptHTML(t); },
    onError: (err) => { clearInterval(voiceTimer); if (!ui.voice || ui.voice.phase !== 'listening') return; micUnavailable(err === 'no-speech' || err === 'aborted' ? 'nospeech' : null); },
    onEnd: (text) => {
      clearInterval(voiceTimer);
      if (!ui.voice || ui.voice.phase !== 'listening') return;
      const said = (text || ui.voice.text || '').trim();
      if (!said) { micUnavailable('nospeech'); return; }
      thinkVoice(said);
    },
  });
}
function transcriptHTML(t) {
  const w = String(t || '').split(' ');
  if (w.length < 3) return `${esc(t)}<span class="caret-i"></span>`;
  return `${esc(w.slice(0, -1).join(' '))} <span class="t3">${esc(w.slice(-1).join(' '))}</span><span class="caret-i"></span>`;
}
function thinkVoice(text) { ui.voice = { phase: 'thinking', text }; render({ noRefocus: true }); ask(text, { voice: true }); }
function closeVoice() { clearInterval(voiceTimer); V.cancelListening(); askSeq++; ui.voice = null; render({ noRefocus: true }); }
function voiceView() {
  const v = ui.voice;
  if (v.phase === 'thinking') {
    return `<section class="view">${topbar()}<div class="scroll pad"><div class="voice-stage"><img class="ribbon calm" src="${A.ribbonCalm || ''}" alt=""></div>
      <div class="stack center" style="gap:12px;align-items:center"><div class="eyebrow ta">Thinking</div><div class="vtext">“${esc(v.text)}”</div><div class="body" style="margin-top:24px">Analysing your transactions…</div></div></div>
      <div class="msgbar pad"><div class="field-pill"><button class="round" data-a="voicekbd" aria-label="Type instead">${ic('keyboard')}</button><span class="grow row" style="justify-content:center;gap:10px"><span class="typing"><i></i><i></i><i></i></span><span class="t2">Thinking…</span></span></div><button class="fab" data-a="closevoice" aria-label="Cancel request">${ic('close')}</button></div></section>`;
  }
  return `<section class="view">${topbar()}<div class="scroll pad"><div class="voice-stage"><img class="ribbon live" src="${A.ribbon || ''}" alt=""></div>
    <div class="stack center" style="gap:12px;align-items:center"><div class="eyebrow ta">Listening</div><div class="vtext" id="voice-text" aria-live="polite">${v.text ? transcriptHTML(v.text) : '<span class="t3">Ask about your spending</span><span class="caret-i"></span>'}</div>
    <div class="small" style="margin-top:14px">Tap the words to fix them</div><button class="link small row" style="gap:6px" data-a="voicekbd">${ic('keyboard', '', 16)}Type instead</button></div></div>
    <div class="msgbar pad"><button class="round big" data-a="closevoice" aria-label="Cancel">${ic('close')}</button><div class="field-pill" style="justify-content:center;gap:14px;padding:0 18px"><span class="levels grow" aria-hidden="true">${'<i></i>'.repeat(18)}</span><span class="num t2" id="voice-timer">0:00</span></div><button class="fab" data-a="voicedone" aria-label="Send what you said">${ic('send')}</button></div></section>`;
}

/* ============================================================ SPLASH */
/* Figma 0.1 → 0.2 → 0.3: the mark zooms in from far away while spinning, rings and glow bloom,
   then it settles upward and the name "Fino" rises in, before onboarding (or Home) fades in. */
function splashView() {
  return `<section class="view splash" role="img" aria-label="Fino"><div class="sp-stage"><span class="sp-glow"></span><span class="sp-ring o"></span><span class="sp-ring i"></span>${markSvg(116, 'sp-mark')}<div class="sp-name">Fino</div><div class="sp-tag">Your money, on call</div></div></section>`;
}

/* ============================================================ ONBOARDING (1.1 – 1.4)
   The language picked here is the one the user will SPEAK (speech recognition).
   App text stays English. Each answer comes back in the language of the question. */
function langOptions() {
  return [['en', 'Aa', 'English', "I'll reply in English"], ['hi', 'अ', 'हिंदी', 'Hindi replies']].map(([k, g, n, s]) => `<button class="lang ${S.lang === k ? 'sel' : ''}" data-a="setlang" data-v="${k}" role="radio" aria-checked="${S.lang === k}"><span class="glyph">${g}</span><span class="grow"><b class="medium" style="display:block">${n}</b><span class="small">${s}</span></span><span class="radio">${S.lang === k ? ic('check', '', 12) : ''}</span></button>`).join('');
}
const VOICE_SAMPLE = { en: "Hi, I'm Fino, your money assistant. You've spent ₹1,840 on food this week.", hinglish: 'Hi, main Fino hoon. Is hafte food pe ₹1,840 gaye.', hi: 'नमस्ते, मैं फ़ीनो हूँ। इस हफ्ते खाने पर ₹1,840 खर्च हुए।' };
function voiceOptions() {
  return `<div class="voices">${[['female', 'Female', 'Calm, clear', A.waveAria], ['male', 'Male', 'Warm, upbeat', A.waveKabir]].map(([k, l, s, w]) => `<div class="voice-card ${S.voice === k ? 'sel' : ''}" role="radio" aria-checked="${S.voice === k}" tabindex="0" data-a="setvoice" data-v="${k}"><img src="${w || ''}" alt="" class="vwave"><div class="row" style="align-items:flex-end"><div class="grow"><b class="medium" style="display:block">${l}</b><span class="small">${s}</span></div><button class="play ${k === 'male' ? 'dark' : ''}" data-a="previewvoice" data-v="${k}" aria-label="Play ${l} voice"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5.5v13l10-6.5z"/></svg></button></div></div>`).join('')}</div>`;
}
function obHead(n) {
  const segs = Array.from({ length: 5 }, (_, i) => `<i class="${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}"></i>`).join('');
  return `<div class="navbar pad">${n > 1 ? `<button class="iconbtn" data-a="obback" aria-label="Back">${ic('back')}</button>` : '<span></span>'}<div class="progress" aria-label="Step ${n} of 5">${segs}</div><span></span></div>`;
}
function onboarding() {
  const step = ui.ob;
  if (step === 0) return `<section class="view ob"><div class="row pad" style="padding-top:30px;gap:8px">${mark(20)}<span class="eyebrow grow">Fino</span></div>
    <div class="scroll"><div class="orb-stage"><img src="${art('orbStage')}" alt="An assistant orb with a voice question and an answer"></div>
    <div class="pad stack" style="gap:14px;margin-top:58px"><h1 class="hero">Curious about your money, just ask!</h1><div class="body">Your money, your questions, answered</div></div></div>
    <div class="dock solo pad"><button class="btn primary" data-a="obnext">Get started</button></div></section>`;
  if (step === 1) return `<section class="view ob">${obHead(1)}<div class="scroll pad"><div class="stack" style="gap:14px;padding-top:91px;padding-bottom:12px"><h1 class="display-l">Which language<br>should we talk in?</h1><div class="body">Mixed sentences are fine. Change it any time.</div>
    <div class="stack" style="gap:12px;margin-top:20px">${langOptions()}</div>
    <div class="eyebrow" style="margin-top:28px">Pick a voice</div>${voiceOptions()}</div></div>
    <div class="dock solo pad"><button class="btn primary" data-a="obnext">Continue</button></div></section>`;
  if (step === 2) return `<section class="view ob">${obHead(2)}<div class="scroll"><div class="mic-stage"><img src="${art('micStage')}" alt="Microphone listening"></div>
    <div class="pad stack" style="gap:12px;margin-top:93px"><h1 class="display-l">Let’s talk about your<br>money.</h1><div class="body">Just tap the mic and ask.</div></div></div>
    <div class="dock pad"><button class="btn primary" data-a="obmic">Allow microphone</button><button class="btn ghost" data-a="obnext">Not now, I'll type</button></div></section>`;
  if (step === 3) return `<section class="view ob">${obHead(3)}<div class="scroll"><div class="lock pad"><div class="center"><div class="eyebrow" data-clock="date">${lockDate()}</div><div class="lock-time" data-clock="big">${lockClock()}</div></div>
    <div class="notif-stack"><i></i><i></i><div class="notif"><div class="row" style="gap:8px">${mark(22)}<span class="small t1 medium">Assistant</span><span class="small">now</span></div><div class="medium" style="margin:10px 0 12px;font-size:15px">₹150 to Rajesh Kumar. What for?</div><div class="row" style="gap:8px"><span class="chip m">Snacks &amp; meals</span><span class="chip m">Groceries</span><span class="mini-fab">${ic('mic', '', 14)}</span></div></div></div></div>
    <div class="pad stack" style="gap:12px;margin-top:176px"><h1 class="display-l">Quick nudges</h1><div class="body">Useful reminders, right when you need them.</div></div></div>
    <div class="dock pad"><button class="btn primary" data-a="obnotif" data-v="1">Allow notifications</button><button class="btn ghost" data-a="obnotif" data-v="0">Not now</button></div></section>`;
  if (step === 4) {
    const fileMode = Sync.mode === 'offline' && !window.EMBEDDED_SMS;
    return `<section class="view ob">${obHead(4)}<div class="scroll"><div class="sms-stage pad"><div class="sms-bubble"><span class="eyebrow" style="font-size:11px">VM-HDFCBK · SMS</span><br><span class="manrope">Rs.150 debited to RAJESH KUMAR</span></div>
      <div class="sms-link">${mark(26)}</div>
      <div class="sms-card"><span class="avatar">R</span><div class="grow"><div class="medium">Rajesh Kumar</div><div class="small">UPI · Today, 1:42 pm</div></div><b class="num" style="font-size:20px;font-weight:500">₹150</b></div></div>
      <div class="pad stack" style="gap:12px;margin-top:143px"><h1 class="display-l">Your payments,<br>tracked for you.</h1><div class="body">Capture expenses from bank SMS, effortlessly.</div>
      ${ui.obErr ? `<div class="small" style="color:var(--crit)">${esc(ui.obErr)}</div>` : ''}</div></div>
      <div class="dock pad">${fileMode ? `<label class="btn primary" for="ob-file" style="cursor:pointer">Allow SMS access</label><input id="ob-file" type="file" accept=".xlsx,.xls,.csv,text/csv" hidden data-file="import">`
        : `<button class="btn primary" data-a="obsms" ${ui.obBusy ? 'disabled' : ''}>${ui.obBusy ? 'Reading your SMS…' : ui.obErr ? 'Try again' : 'Allow SMS access'}</button>`}
      <button class="btn ghost" data-a="obskip" ${ui.obBusy ? 'disabled' : ''}>Skip, I'll add payments myself</button></div></section>`;
  }
  return `<section class="view ob">${obHead(5)}<div class="scroll pad"><div class="stack" style="gap:12px;padding-top:56px"><h1 class="display-l">You're all set.</h1><div class="body">A little setup now. Easier money tracking ahead.</div>
    <div class="card stack" style="gap:16px;margin-top:22px"><div class="widget-well"><div class="mini-widget">${mark(34)}<div class="grow"><div class="eyebrow" style="font-size:10px">Just say</div><div class="medium" style="font-size:12px;line-height:15px;white-space:normal">Got money on your mind?</div></div><span class="mini-fab big">${ic('mic', '', 18)}</span></div></div>
    <div class="row"><div class="grow"><div class="medium" style="font-size:14px">Bring your assistant home</div><div class="small">Ask anything in one tap</div></div><label class="switch"><input type="checkbox" id="ob-widget" data-a="toggle" data-v="widgetOn" ${S.widgetOn ? 'checked' : ''} aria-label="Bring your assistant home"><span></span></label></div></div>
    <button class="callout" data-a="obdone" data-v="limits"><span class="tile">${ic('limit')}</span><span class="grow"><span class="title" style="display:block">Set limits anytime</span><span class="sub">Choose a spending limit whenever you're ready.</span></span>${ic('chevR', 'chev ta')}</button></div></div>
    <div class="dock pad"><button class="btn primary" data-a="obdone">Go to Home</button><button class="btn ghost" data-a="obdone">Skip for now</button></div></section>`;
}
