/* ============================================================
   Money Assistant · engine
   Data model = the user's Google Sheet ("Money-Assistant-Data").
   SMS parsing ported from nishanthdn96/expense-tracker and fixed.
   Every number the app shows or speaks comes from this file.
   ============================================================ */
(function (root) {
  'use strict';
  const E = {};

  /* ---------- time: India (UTC+05:30), real clock ---------- */
  const TZ = 330 * 60000;
  const DAY = 86400000;
  const p = (ms) => { const d = new Date(ms + TZ); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), dow: d.getUTCDay() }; };
  const at = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m, d, h, mi) - TZ;
  const dayStart = (ms) => { const t = p(ms); return at(t.y, t.m, t.d); };
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  E.time = { p, at, dayStart, daysInMonth, MON, MONTH_FULL, DOW, DOW_FULL, DAY, TZ };
  E.clock = (ms) => { const t = p(ms); return `${String(t.h).padStart(2, '0')}:${String(t.mi).padStart(2, '0')}`; };
  E.time12 = (ms) => { const t = p(ms); return `${(t.h % 12) || 12}:${String(t.mi).padStart(2, '0')} ${t.h < 12 ? 'am' : 'pm'}`; };
  E.dateLong = (ms) => { const t = p(ms); return `${DOW[t.dow]}, ${t.d} ${MON[t.m]} ${t.y}`; };

  /* Sheet serials (Google Sheets / Excel: days since 1899-12-30) */
  E.toSerial = (ms) => { const t = p(ms); return Date.UTC(t.y, t.m, t.d) / DAY + 25569; };
  E.toTimeFrac = (ms) => { const t = p(ms); return Math.round(((t.h * 60 + t.mi) / 1440) * 1e6) / 1e6; };
  E.fromSerial = (serial, frac = 0) => { const base = Math.round((Number(serial) - 25569) * DAY); const d = new Date(base); return at(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + Math.round(frac * 1440) * 60000; };

  function parseSheetDate(s) {
    if (s == null || s === '') return null;
    if (typeof s === 'number') return E.fromSerial(s);
    s = String(s).trim();
    let m = s.match(/^(?:[A-Za-z]{3},?\s+)?(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -,]+(\d{2,4})$/);
    if (m) { const mi = MON.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase()); const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; if (mi >= 0) return at(y, mi, +m[1]); }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return at(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return at(y, +m[2] - 1, +m[1]); }
    m = s.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/); if (m) { const mi = MON.findIndex((x) => x.toLowerCase() === m[1].slice(0, 3).toLowerCase()); if (mi >= 0) return at(+m[3], mi, +m[2]); }
    if (/^\d{5}(\.\d+)?$/.test(s)) return E.fromSerial(+s);
    return null;
  }
  function parseSheetTime(s) {
    if (s == null || s === '') return 12 * 60;
    if (typeof s === 'number') return Math.round(s * 1440);
    const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?$/);
    if (!m) { if (/^0?\.\d+$/.test(String(s))) return Math.round(+s * 1440); return 12 * 60; }
    let h = +m[1]; const mi = +(m[2] || 0);
    if (m[3]) { const pm = /p/i.test(m[3]); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    return h * 60 + mi;
  }
  E.parseSheetDate = parseSheetDate; E.parseSheetTime = parseSheetTime;
  const money = (v) => { if (v == null || v === '' || v === '–' || v === '-') return 0; if (typeof v === 'number') return Math.round(v * 100); const n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : Math.round(n * 100); };
  E.money = money;

  function ranges(now, weekStartsMonday = true) {
    const t = p(now);
    const today = dayStart(now);
    const monthStart = at(t.y, t.m, 1);
    const pmY = t.m === 0 ? t.y - 1 : t.y, pmM = t.m === 0 ? 11 : t.m - 1;
    const pmDays = daysInMonth(pmY, pmM);
    const sameDay = Math.min(t.d, pmDays);
    const lastMonthStart = at(pmY, pmM, 1);
    const mondayOffset = (t.dow + 6) % 7;
    const weekStart = today - mondayOffset * DAY;
    return {
      now, today: [today, today + DAY], yesterday: [today - DAY, today],
      week: [weekStart, today + DAY], lastWeek: [weekStart - 7 * DAY, today - 6 * DAY],
      last7: [today - 6 * DAY, today + DAY], prev7: [today - 13 * DAY, today - 6 * DAY],
      month: [monthStart, today + DAY], lastMonthSame: [lastMonthStart, at(pmY, pmM, sameDay) + DAY],
      lastMonthFull: [lastMonthStart, monthStart],
      daysLeftMonth: daysInMonth(t.y, t.m) - t.d + 1,
      daysLeftWeek: 7 - mondayOffset,
      monthName: MONTH_FULL[t.m], prevMonthName: MONTH_FULL[pmM],
      label: { month: `1–${t.d} ${MON[t.m]}`, lastMonthSame: `1–${sameDay} ${MON[pmM]}` },
    };
  }
  E.ranges = ranges;

  E.fmt = (paise, opts = {}) => {
    const neg = paise < 0; const v = Math.abs(paise) / 100;
    const s = v.toLocaleString('en-IN', { maximumFractionDigits: opts.dec ? 2 : 0, minimumFractionDigits: opts.dec && v % 1 ? 2 : 0 });
    return (neg ? '−' : (opts.sign ? '+' : '')) + '₹' + s;
  };
  const toPaise = (s) => Math.round(parseFloat(String(s).replace(/,/g, '')) * 100);
  E.toPaise = toPaise;

  /* ---------- categories (the sheet's Lists tab) ---------- */
  E.CATS = [
    { id: 'Food', subs: ['Snacks & meals', 'Food delivery', 'Eating out', 'Tea & coffee'] },
    { id: 'Travel', subs: ['Auto or cab', 'Metro', 'Bus or train', 'Fuel'] },
    { id: 'Shopping', subs: ['Online order', 'Clothes', 'Gadgets', 'Personal care'] },
    { id: 'Household', subs: ['Groceries', 'Household items', 'Rent', 'Bills & recharge'] },
    { id: 'Shared', subs: ['Split with friends'] },
  ];
  /* The Figma category list: Food, Travel, Shopping, Home & groceries (incl. rent and bills), Shared, Other.
     Older names in the sheet are folded into it. */
  const CAT_ALIAS = { Bills: ['Household', 'Bills & recharge'], Entertainment: ['Other', 'Other'], Health: ['Other', 'Other'], 'Home & groceries': ['Household', null], Home: ['Household', null] };
  E.normCat = (cat, sub) => { if (!cat) return { cat, sub }; const a = CAT_ALIAS[String(cat).trim()]; if (!a) return { cat: String(cat).trim(), sub }; return { cat: a[0], sub: a[1] || sub }; };
  E.CAT_IDS = E.CATS.map((c) => c.id);
  E.cat = (id) => E.CATS.find((c) => c.id === id) || { id: 'Other', subs: ['Other'] };
  E.catName = (id) => id || 'Other';
  E.subToCat = (sub) => { for (const c of E.CATS) if (c.subs.some((s) => s.toLowerCase() === String(sub).toLowerCase())) return c.id; return null; };
  E.QUICK_OPTIONS = [
    { sub: 'Snacks & meals', cat: 'Food' }, { sub: 'Groceries', cat: 'Household' },
    { sub: 'Auto or cab', cat: 'Travel' }, { sub: 'Split with friends', cat: 'Shared' },
  ];
  const DEFAULT_SUB = { Food: 'Food delivery', Travel: 'Auto or cab', Shopping: 'Online order', Household: 'Groceries', Shared: 'Split with friends', Other: 'Other' };
  E.defaultSub = (cat) => DEFAULT_SUB[cat] || E.cat(cat).subs[0];

  /* Merchants keyword list: whole-word, any case, LAST match wins (same as the sheet's formula). */
  const FALLBACK_MERCHANTS = [['ZOMATO', 'Food'], ['SWIGGY', 'Food'], ['DOMINOS', 'Food'], ['CHAI POINT', 'Food'], ['CANTEEN', 'Food'], ['CAFE', 'Food'], ['BLINKIT', 'Household'], ['ZEPTO', 'Household'], ['DMART', 'Household'], ['GROCERY', 'Household'], ['KIRANA', 'Household'], ['UBER', 'Travel'], ['OLA', 'Travel'], ['RAPIDO', 'Travel'], ['METRO', 'Travel'], ['IRCTC', 'Travel'], ['AMAZON', 'Shopping'], ['FLIPKART', 'Shopping'], ['MYNTRA', 'Shopping'], ['NETFLIX', 'Entertainment'], ['SPOTIFY', 'Entertainment'], ['BOOKMYSHOW', 'Entertainment'], ['RECHARGE', 'Bills'], ['JIO', 'Bills'], ['AIRTEL', 'Bills'], ['APOLLO', 'Health'], ['PHARMACY', 'Health']];
  const SUB_HINT = [
    [/swiggy|zomato|eatsure/i, 'Food delivery'], [/chai|tea|coffee|starbucks|cafe/i, 'Tea & coffee'], [/canteen|restaurant|dhaba|dominos|pizza|kfc|burger|mcdonald|haldiram|bakery|theobroma|sweets/i, 'Eating out'],
    [/uber|ola|rapido|taxi|auto/i, 'Auto or cab'], [/metro/i, 'Metro'], [/irctc|redbus|bus|train|indigo|air india/i, 'Bus or train'], [/petrol|fuel|fastag/i, 'Fuel'],
    [/amazon|flipkart|meesho/i, 'Online order'], [/myntra|ajio/i, 'Clothes'], [/croma|decathlon/i, 'Gadgets'], [/nykaa/i, 'Personal care'],
    [/blinkit|zepto|dmart|big ?basket|instamart|grocery|kirana|store|supermarket|reliance fresh/i, 'Groceries'],
    [/jio|airtel|recharge|dth/i, 'Mobile recharge'], [/electricity|bescom/i, 'Electricity'], [/broadband/i, 'Internet'],
    [/spotify|netflix|hotstar|youtube/i, 'Streaming'], [/pvr|inox|bookmyshow/i, 'Movies'],
    [/apollo|pharmacy|medplus|1mg|pharmeasy/i, 'Medicines'], [/hospital|clinic/i, 'Doctor'],
  ];
  function merchantMatch(name, merchants) {
    const hay = ' ' + String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    let hit = null;
    for (const [kw, cat] of (merchants && merchants.length ? merchants : FALLBACK_MERCHANTS)) {
      const k = String(kw || '').toUpperCase().trim(); if (!k || !cat) continue;
      if (hay.includes(' ' + k + ' ')) hit = cat;
    }
    if (!hit) return null;
    const nc = E.normCat(hit); hit = nc.cat;
    if (nc.sub && nc.sub !== 'Other') return { cat: hit, sub: nc.sub };
    if (hit === 'Other') return { cat: 'Other', sub: 'Other' };
    const sh = SUB_HINT.find(([re]) => re.test(name));
    const sub = sh && E.subToCat(sh[1]) === hit ? sh[1] : E.defaultSub(hit);
    return { cat: hit, sub };
  }
  E.merchantMatch = merchantMatch;
  const BUSINESS = /\b(pvt|ltd|limited|llp|store|stores|services|enterprises|traders|foods|cafe|mart|shop|centre|center|restaurant|hotel|pharmacy|medical|agency|bank|india|technologies|solutions|stall|xerox|motors|canteen|card|recharge)\b/i;
  E.looksLikePerson = (name, merchants) => {
    if (!name || merchantMatch(name, merchants) || BUSINESS.test(name) || /self/i.test(name)) return false;
    const w = String(name).trim().split(/\s+/);
    return w.length >= 1 && w.length <= 3 && w.every((x) => /^[A-Za-z][A-Za-z.']*$/.test(x));
  };
  const key = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  E.payeeKey = key;

  /* ---------- SMS parser (SmsParser.kt, fixed) ---------- */
  const BANKS = [[/HDFC/i, 'HDFC'], [/SBI/i, 'SBI'], [/ICICI/i, 'ICICI'], [/AXIS/i, 'Axis'], [/KOTAK/i, 'Kotak'], [/PNB/i, 'PNB'], [/BOB|BARODA/i, 'Bank of Baroda'], [/CANBNK|CANARA/i, 'Canara'], [/IDFC/i, 'IDFC First'], [/YESB/i, 'Yes Bank']];
  const APPS = [[/PHONPE|PHONEPE/i, 'PhonePe'], [/GPAY|GOOGLEPAY/i, 'Google Pay'], [/PAYTM/i, 'Paytm'], [/AMAZONPAY|APAY/i, 'Amazon Pay']];
  const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  function cleanPayee(s) {
    if (!s) return null;
    let n = s.replace(/\b(refno|ref no|ref|upi|imps|neft|rtgs|on|via|avl|bal)\b.*$/i, '').replace(/[^A-Za-z0-9 .&'-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[\-]+$/, '').trim();
    if (n.length < 2 || /^(a\/?c|acct|account|your|ac|x+\d*)$/i.test(n) || /^(a\/c|acct|account)\b/i.test(n)) return null;
    return /^[A-Z0-9 .&'-]+$/.test(n) ? titleCase(n) : n;
  }
  E.parseSms = (sender, body, ts) => {
    const raw = String(body || ''); const b = raw.replace(/\s+/g, ' ').trim(); const low = b.toLowerCase();
    const res = { sender, body: raw, ts };
    if (/\b(otp|one[- ]time password|verification code|passcode)\b|do not share|don'?t share/i.test(b)) return { ...res, ignored: 'otp' };
    if (/\b(will be debited|is due|due on|due date|bill generated|statement|minimum amount due|auto-?debit scheduled|request(ed)? money|collect request)\b/i.test(b)) return { ...res, ignored: 'reminder' };
    if (/\b(offer|win|won|congratulations|download|apply now|pre-?approved|limited period|voucher|coupon|eligible|% off|flat rs|flat ₹|hurry)\b/i.test(b) && !/\b(debited|credited|spent|sent rs|paid rs)\b/i.test(b)) return { ...res, ignored: 'promo' };
    if (!/\b(debited|credited|spent|sent|paid|withdrawn|received|refund(ed)?|reversed|deposited|trf to|transferred)\b/i.test(b)) return { ...res, ignored: 'notxn' };
    const forAmount = b.replace(/(avl\.?\s*bal(ance)?|available bal(ance)?|avl\.?\s*lmt|avl\.?\s*limit|available limit|bal)\s*[:\-]?\s*(rs\.?|inr|₹)?\s*[\d,]+(\.\d+)?/gi, '');
    let amount = null;
    for (const re of [/(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/i, /debited\s+by\s+([\d,]+(?:\.\d{1,2})?)/i, /credited\s+by\s+([\d,]+(?:\.\d{1,2})?)/i]) { const m = forAmount.match(re); if (m) { amount = toPaise(m[1]); break; } }
    if (!amount || !(amount > 0)) return { ...res, ignored: 'notxn' };
    const di = low.search(/\b(debited|spent|sent|paid|withdrawn|trf to|transferred|purchase)\b/);
    const ci = low.search(/\b(credited|received|refund|reversed|deposited)\b/);
    const dir = di >= 0 && (ci < 0 || di <= ci) ? 'debit' : ci >= 0 ? 'credit' : 'debit';
    const tryRe = (re) => { const m = b.match(re); return m ? cleanPayee(m[1]) : null; };
    let payee = dir === 'debit'
      ? (tryRe(/;\s*([A-Za-z][A-Za-z .&'-]{1,40}?)\s+credited/i) || tryRe(/\b(?:trf to|transferred to|sent to|paid to|to vpa|to)\s+([A-Za-z][A-Za-z0-9 .&'-]{1,40}?)(?=\s+(?:on|via|ref|refno|upi|at|from|avl|using|thru|for)\b|[;,(]|\.\s|\.$|\s*$)/i) || tryRe(/\bat\s+([A-Za-z][A-Za-z0-9 .&'-]{1,40}?)(?=\s+(?:on|via|ref|avl|using)\b|[.;,]|\s*$)/i))
      : (tryRe(/\b(?:refund of [^.]*?from|from|by)\s+(?:neft\s+from\s+|imps\s+from\s+)?([A-Za-z][A-Za-z0-9 .&'-]{1,40}?)(?=\s+(?:on|via|ref|refno|upi|has|is|avl|to)\b|[.;,]|\s*$)/i));
    if (payee && /^(a\/c|your|neft|imps)/i.test(payee)) payee = null;
    const method = /\bcard\b|\bpos\b/i.test(b) ? 'Card' : /\bupi\b|vpa|@/i.test(b) ? 'UPI' : /\b(neft|imps|rtgs)\b/i.test(b) ? 'Bank' : /\batm\b|withdrawn/i.test(b) ? 'Cash' : 'UPI';
    const acctM = b.match(/(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*(?:ending\s*(?:with\s*)?)?[xX*]+\s?(\d{3,4})/i);
    const refM = b.match(/(?:upi\s*ref(?:erence)?(?:\s*no)?|ref\s*no|refno|upi|rrn|txn\s*id|ref)\s*[:.#-]?\s*(\d{9,12})/i);
    let bank = null, app = null;
    for (const [re, n] of BANKS) if (re.test(sender || '') || re.test(b)) { bank = n; break; }
    for (const [re, n] of APPS) if (re.test(sender || '') || new RegExp('using ' + n, 'i').test(b)) { app = n; break; }
    const self = /\b(own a\/?c|own account|self transfer|to self|\(self\)|self a\/?c)\b/i.test(b);
    if (self) payee = 'Self transfer';
    return { ...res, ok: true, amount, dir, payee, method, bank, app, acct: acctM ? acctM[1] : null, upiRef: refM ? refM[1] : null, self, refund: dir === 'credit' && /\b(refund|reversed|reversal)\b/i.test(b) };
  };

  /* ---------- state ---------- */
  let seq = 0;
  E.uid = (pfx = 'a') => pfx + Date.now().toString(36) + (seq++).toString(36);
  E.newState = () => ({
    v: 3, onboarded: false, name: '', lang: 'en', voice: 'female', speak: true, theme: null, notifOn: false, micOn: null, smsOn: false,
    questionsPerDay: 3, txns: [], rules: {}, merchants: [], corrections: {},
    limits: { overall: null, cats: {} }, history: [], asked: { day: null, count: 0 }, alerted: {}, loadedAt: null,
  });

  /* ---------- categorise ---------- */
  E.categorize = (t, S) => {
    if (t.manualCat) { t.cat = t.manualCat; t.sub = t.manualSub || E.defaultSub(t.manualCat); t.catStatus = 'confirmed'; }
    else if (S.rules[key(t.payee)]) { const r = S.rules[key(t.payee)]; t.cat = r.cat; t.sub = r.sub || E.defaultSub(r.cat); t.catStatus = 'remembered'; }
    else if (/self/i.test(t.payee || '')) { t.cat = null; t.sub = null; t.catStatus = 'na'; }
    else { const mm = merchantMatch(t.payee, S.merchants); if (mm) { t.cat = mm.cat; t.sub = mm.sub; t.catStatus = 'auto'; } else { t.cat = null; t.sub = null; t.catStatus = 'needs'; } }
    // what it counts as
    if (t.dir === 'credit') t.kind = t.kind || 'income';
    else if (t.manualCat === 'Transfer' || /self/i.test(t.payee || '')) { t.kind = 'self'; t.cat = null; t.catStatus = 'na'; }
    else if (t.notSpend) { t.kind = /lent/i.test(t.note || '') ? 'lent' : 'notspend'; }
    else if (t.share && t.share < t.amount) { t.kind = 'split'; t.cat = t.cat || 'Shared'; }
    else t.kind = 'spend';
    if (t.catStatus === 'needs') t.suggestion = E.suggestFor(t, S); else delete t.suggestion;
    return t;
  };
  E.suggestFor = (t, S) => {
    const prev = S.corrections[key(t.payee)]; if (prev) return prev;
    const mm = merchantMatch(t.payee, S.merchants); if (mm) return mm;
    const r = t.amount / 100;
    if (r >= 800) return { cat: 'Shared', sub: 'Split with friends' };
    if (r <= 300) return { cat: 'Food', sub: 'Snacks & meals' };
    return { cat: 'Household', sub: 'Groceries' };
  };

  /* ---------- build from sheet rows ---------- */
  E.loadFromSheet = (S, data) => {
    const out = { rows: 0, needs: 0 };
    S.merchants = (data.merchants || []).filter((r) => r && r[0] && r[1]).map((r) => [String(r[0]), String(r[1]).trim()]);
    S.rules = {}; S.ruleRows = {};
    (data.remembered || []).forEach((r, i) => { if (r && r[0] && r[1]) { { const nc = E.normCat(String(r[1]).trim(), r[2] ? String(r[2]) : ''); S.rules[key(r[0])] = { payee: String(r[0]), cat: nc.cat, sub: nc.sub, on: r[3] || '' }; } S.ruleRows[key(r[0])] = i + 2; } });
    S.remNextRow = 2 + (data.remembered || []).reduce((mx, r, i) => (r && r[0] ? i + 1 : mx), 0);
    if (data.settings) {
      const g = (i) => (data.settings[i] && data.settings[i][0] != null ? data.settings[i][0] : '');
      if (g(0)) S.name = String(g(0));
      const lim = money(g(1));
      const period = String(g(2) || 'Monthly').toLowerCase();
      const warn = parseFloat(String(g(3)).replace('%', '')) || 80;
      S.limits.overall = lim ? { amount: lim, period: /day/.test(period) ? 'daily' : /week/.test(period) ? 'weekly' : 'monthly', alertPct: warn <= 1 ? Math.round(warn * 100) : Math.round(warn) } : null;
      S.questionsPerDay = parseInt(g(4), 10) || 3;
      const lang = String(g(5) || '').toLowerCase();
      if (lang) S.lang = /hinglish/.test(lang) ? 'hinglish' : /hindi|हिं/.test(lang) ? 'hi' : 'en';
    }
    S.limits.cats = {}; S.catLimitRows = {};
    (data.catLimits || []).forEach((r, i) => {
      if (!r || !r[0] || !money(r[1])) return;
      const per = String(r[2] || 'Monthly').toLowerCase();
      const warn = parseFloat(String(r[3] || '80').replace('%', '')) || 80;
      S.limits.cats[String(r[0]).trim()] = { amount: money(r[1]), period: /day/.test(per) ? 'daily' : /week/.test(per) ? 'weekly' : 'monthly', alertPct: warn <= 1 ? Math.round(warn * 100) : Math.round(warn) };
      S.catLimitRows[String(r[0]).trim()] = i + 2;
    });
    const keepLocal = {}; for (const t of S.txns) if (t.pending) keepLocal[t.id] = t;
    S.txns = [];
    let maxRow = 1;
    (data.transactions || []).forEach((r, i) => {
      if (!r) return;
      const row = i + 2;
      if (r[0] || r[2] || r[3]) maxRow = Math.max(maxRow, row);
      const d = parseSheetDate(r[0]); const amt = money(r[2]);
      if (d == null || !amt) return;
      const t = {
        id: String(r[20] || 'r' + row), row, ts: d + parseSheetTime(r[1]) * 60000, amount: amt, payee: String(r[3] || 'Unknown'),
        method: String(r[4] || 'UPI'), bank: String(r[5] || ''), source: String(r[6] || 'SMS'), sms: r[7] ? [{ body: String(r[7]), sender: r[5] ? r[5] + ' Bank' : 'SMS' }] : [],
        manualCat: r[8] ? (String(r[8]).trim() === 'Transfer' ? 'Transfer' : E.normCat(String(r[8]).trim()).cat) : null, manualSub: r[8] ? (E.normCat(String(r[8]).trim(), r[9] ? String(r[9]) : null).sub) : null, share: money(r[10]) || null, notSpend: /^y/i.test(String(r[11] || '')), note: String(r[12] || ''), dir: 'debit',
      };
      if (t.share) t.people = Math.max(2, Math.round(t.amount / t.share));
      E.categorize(t, S); S.txns.push(t); out.rows++;
    });
    for (const id in keepLocal) if (!S.txns.some((t) => t.id === id)) S.txns.push(keepLocal[id]);
    S.nextRow = maxRow + 1;
    out.needs = E.needsList(S).length;
    return out;
  };

  /* row values for the sheet (A–M + U; N–T are the sheet's formulas, sent as null = untouched) */
  E.rowValues = (t) => [E.toSerial(t.ts), E.toTimeFrac(t.ts), t.amount / 100, t.payee, t.method || 'UPI', t.bank || '', t.source || 'Manual', t.sms && t.sms[0] ? t.sms[0].body : '',
    t.manualCat || '', t.manualCat ? (t.manualSub || '') : '', t.share ? t.share / 100 : '', t.notSpend ? 'Yes' : '', t.note || '', null, null, null, null, null, null, null, t.id];
  E.answerValues = (t) => [t.manualCat || '', t.manualCat ? (t.manualSub || '') : '', t.share ? t.share / 100 : '', t.notSpend ? 'Yes' : '', t.note || ''];

  /* ---------- changes ---------- */
  E.setCategory = (S, t, cat, sub, remember, extra = {}) => {
    t.manualCat = cat; t.manualSub = sub;
    if (cat === 'Shared' && extra.people) { t.people = extra.people; t.share = Math.round(t.amount / extra.people); }
    else if (cat !== 'Shared') { t.share = null; t.people = null; }
    t.notSpend = false;
    S.corrections[key(t.payee)] = { cat, sub };
    let rule = null;
    if (remember) { rule = { payee: t.payee, cat, sub, on: E.dateLong(Date.now()) }; S.rules[key(t.payee)] = rule; }
    E.categorize(t, S);
    return rule;
  };
  E.setKind = (S, t, kind, extra = {}) => {
    if (kind === 'split') { t.people = extra.people || t.people || 2; t.share = Math.round(t.amount / t.people); t.notSpend = false; if (!t.manualCat || t.manualCat === 'Transfer') { t.manualCat = 'Shared'; t.manualSub = 'Split with friends'; } t.note = t.note.replace(/money lent/i, '').trim(); }
    else if (kind === 'lent') { t.notSpend = true; t.share = null; if (!/money lent/i.test(t.note)) t.note = (t.note ? t.note + ' · ' : '') + 'Money lent'; if (t.manualCat === 'Transfer') t.manualCat = null; }
    else if (kind === 'self') { t.manualCat = 'Transfer'; t.manualSub = ''; t.notSpend = false; t.share = null; }
    else { t.notSpend = false; t.share = null; t.people = null; if (t.manualCat === 'Transfer' || (t.manualCat === 'Shared' && kind === 'spend')) { t.manualCat = null; t.manualSub = null; } t.note = t.note.replace(/\s*·?\s*money lent/i, '').trim(); }
    E.categorize(t, S);
  };
  E.newTxn = (S, f) => {
    const t = { id: E.uid('a'), row: null, ts: f.ts, amount: f.amount, payee: f.payee || f.sub || f.cat || 'Cash', method: f.method || 'Cash', bank: f.bank || '', source: f.source || 'Manual',
      sms: f.sms ? [{ body: f.sms, sender: f.sender || 'SMS' }] : [], manualCat: f.cat || null, manualSub: f.cat ? (f.sub || E.defaultSub(f.cat)) : null, share: null, notSpend: !!f.notSpend, note: f.note || '', dir: 'debit', bill: f.bill || null };
    if (f.auto) { t.manualCat = null; t.manualSub = null; }
    E.categorize(t, S);
    S.txns.push(t);
    return t;
  };
  E.findDuplicate = (S, ps) => S.txns.find((o) => o.amount === ps.amount && Math.abs(o.ts - ps.ts) < 15 * 60000 && ((ps.upiRef && o.sms[0] && o.sms[0].body.includes(ps.upiRef)) || key(o.payee) === key(ps.payee)));
  E.matchBill = (S, bill) => {
    const words = key(bill.store);
    return S.txns.filter((t) => t.kind === 'spend' && t.amount === bill.amount && Math.abs(t.ts - bill.ts) < 48 * 3600000 && !t.bill)
      .sort((a, b) => (key(b.payee) === words) - (key(a.payee) === words) || Math.abs(a.ts - bill.ts) - Math.abs(b.ts - bill.ts))[0] || null;
  };

  /* ---------- maths ---------- */
  E.spendOf = (t) => (t.dir !== 'debit' ? 0 : t.kind === 'spend' ? (t.refundedBy ? 0 : t.amount) : t.kind === 'split' ? (t.share || 0) : 0);
  E.catOf = (t) => (t.kind === 'split' ? (t.cat || 'Shared') : t.cat || 'Other');
  E.needsList = (S, now) => { const ms = now ? ranges(now).month[0] : 0; return S.txns.filter((t) => t.kind === 'spend' && t.catStatus === 'needs' && t.ts >= ms).sort((a, b) => b.ts - a.ts); };
  E.inRange = (S, [a, b], f) => S.txns.filter((t) => t.ts >= a && t.ts < b && E.spendOf(t) > 0 && (!f || f(t)));
  E.sum = (list) => list.reduce((s, t) => s + E.spendOf(t), 0);
  E.byCat = (list) => { const m = {}; for (const c of E.CAT_IDS) m[c] = 0; m.Other = 0; for (const t of list) m[E.catOf(t)] = (m[E.catOf(t)] || 0) + E.spendOf(t); return m; };
  E.coverage = (list) => { const sms = list.filter((t) => /sms/i.test(t.source)).length; return { count: list.length, sms, other: list.length - sms, needs: list.filter((t) => t.catStatus === 'needs').length }; };

  /* ---------- limits ---------- */
  const periodRange = (r, period) => (period === 'daily' ? r.today : period === 'weekly' ? r.week : r.month);
  const daysLeftFor = (r, period) => (period === 'daily' ? 1 : period === 'weekly' ? r.daysLeftWeek : r.daysLeftMonth);
  E.periodRange = periodRange;
  E.limitStatus = (S, now, catId) => {
    const r = ranges(now);
    const lim = catId ? S.limits.cats[catId] : S.limits.overall;
    if (!lim) return null;
    const period = lim.period || 'monthly';
    const list = E.inRange(S, periodRange(r, period), catId ? (t) => E.catOf(t) === catId : null);
    const spent = E.sum(list), left = lim.amount - spent, daysLeft = daysLeftFor(r, period);
    const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
    const warnAt = Math.round(lim.amount * (lim.alertPct || 80) / 100);
    return { catId, period, limit: lim.amount, spent, left, pct, daysLeft, perDay: left > 0 && period !== 'daily' ? Math.round(left / daysLeft) : null, warnAt, alertPct: lim.alertPct || 80, near: spent >= warnAt && spent <= lim.amount, over: spent > lim.amount, count: list.length };
  };
  E.usualMonthly = (S, now, catId) => {
    const t = p(now); const out = [];
    for (let i = 1; i <= 3; i++) { let y = t.y, m = t.m - i; while (m < 0) { m += 12; y--; } const list = E.inRange(S, [at(y, m, 1), at(y, m + 1, 1)], catId ? (x) => E.catOf(x) === catId : null); if (list.length) out.push(E.sum(list)); }
    return out.length ? Math.round(out.reduce((a, b) => a + b, 0) / out.length) : 0;
  };
  const roundTo = (paise, step) => Math.round(paise / 100 / step) * step * 100;
  const ceilTo = (paise, step) => Math.ceil(paise / 100 / step) * step * 100;
  E.suggestLimit = (S, now, catId, period = 'monthly') => {
    const r = ranges(now);
    const usualM = E.usualMonthly(S, now, catId);
    const factor = period === 'daily' ? 1 / 30 : period === 'weekly' ? 7 / 30 : 1;
    const step = catId ? (period === 'daily' ? 50 : 100) : (period === 'monthly' ? 1000 : 100);
    const usual = Math.round(usualM * factor);
    const spentNow = E.sum(E.inRange(S, periodRange(r, period), catId ? (t) => E.catOf(t) === catId : null));
    let suggested = Math.max(ceilTo(usual * 1.05, period === 'monthly' ? (catId ? 500 : 1000) : step), ceilTo(spentNow * 1.2, period === 'monthly' ? (catId ? 500 : 1000) : step));
    if (!suggested) suggested = catId ? 200000 : 2000000;
    return { usual, spentNow, tight: Math.max(step * 100, roundTo(suggested * 0.85, step)), suggested, relaxed: roundTo(suggested * 1.25, step) };
  };

  E.recurring = (S) => {
    const g = {};
    for (const t of S.txns) if (E.spendOf(t) > 0) (g[key(t.payee) + ':' + t.amount] = g[key(t.payee) + ':' + t.amount] || []).push(t);
    return Object.values(g).filter((x) => { const ms = new Set(x.map((t) => p(t.ts).y * 12 + p(t.ts).m)); return ms.size === x.length && (ms.size >= 3 || (ms.size >= 2 && (/Bills & recharge/.test(x[0].sub || '') || /jio|airtel|vi |spotify|netflix|hotstar|prime|youtube|recharge|broadband/i.test(x[0].payee || '')))); })
      .map((x) => ({ payee: x[0].payee, amount: x[x.length - 1].amount, count: x.length, last: Math.max(...x.map((t) => t.ts)) })).sort((a, b) => b.amount - a.amount);
  };
  E.lateNight = (S, range) => E.inRange(S, range, (t) => E.catOf(t) === 'Travel' && (p(t.ts).h >= 22 || p(t.ts).h < 5));

  /* ============================================================
     Understanding questions: rule layer (Claude fills `intent`
     when available; numbers always come from the code below).
     ============================================================ */
  const HI_MAP = [[/आज/g, ' today '], [/कल/g, ' yesterday '], [/(हफ्ते|हफ़्ते|सप्ताह)/g, ' week '], [/(महीने|महीना)/g, ' month '], [/(खाना|खाने|खाने-पीने)/g, ' food '], [/(खर्च|खर्चा)/g, ' spent '], [/कितना|कितने/g, ' how much '], [/(बचा|बाकी|बचे)/g, ' left '], [/क्यों/g, ' why '], [/ज़्यादा|ज्यादा/g, ' more '], [/सफर|यात्रा/g, ' travel '], [/खरीदारी|शॉपिंग/g, ' shopping '], [/पिछले/g, ' last '], [/कहाँ|कहां/g, ' where '], [/सबसे बड़ा/g, ' biggest '], [/अलग|अजीब/g, ' unusual ']];
  const HG_MAP = [[/\baaj\b/g, ' today '], [/\bkal\b/g, ' yesterday '], [/\b(is|iss) (hafte|hafta|week)\b/g, ' this week '], [/\bpichhle|pichle|pichhla|pichla\b/g, ' last '], [/\bhafte|hafta\b/g, ' week '], [/\b(is|iss) (mahine|mahina|month)\b/g, ' this month '], [/\bmahine|mahina\b/g, ' month '], [/\bkhana|khane\b/g, ' food '], [/\bkharcha|kharch|kharche\b/g, ' spent '], [/\bkitna|kitne\b/g, ' how much '], [/\bbacha|bachi|baki|bache\b/g, ' left '], [/\bkyun|kyu|kyon\b/g, ' why '], [/\bzyada|jyada\b/g, ' more '], [/\bsabse bada\b/g, ' biggest '], [/\bsabse zyada\b/g, ' top '], [/\ble sakti|le sakta|kar sakti|kar sakta|afford kar\b/g, ' afford '], [/\bkahan|kahaan\b/g, ' where '], [/\bajeeb\b/g, ' unusual ']];
  const HINGLISH_WORDS = /\b(kitna|kitne|kharcha|kharch|hua|hue|hafte|hafta|mahine|mahina|aaj|kal|bacha|bachi|baki|kya|mera|meri|mujhe|kyun|kyu|zyada|jyada|kam|pe|gaye|gaya|sakti|sakta|dikhao|batao|sabse|kahan|hai|hain)\b/i;
  const DEVANAGARI = /[ऀ-ॿ]/;
  function normalize(q) {
    let s = ' ' + String(q).toLowerCase().replace(/(\d),(\d)/g, '$1$2').replace(/[?!,…]/g, ' ').replace(/\.{2,}/g, ' ') + ' ';
    for (const [re, r] of HI_MAP) s = s.replace(re, r);
    for (const [re, r] of HG_MAP) s = s.replace(re, r);
    return s.replace(/\s+/g, ' ');
  }
  /* Speech comes from the Hindi (India) recogniser, which understands English, Hindi and Hinglish
     in one go but may write English words in Devanagari. Turn those back into English and decide
     which language the person actually spoke, so the reply can match it. */
  const DEV_EN = { 'हाउ': 'how', 'मच': 'much', 'डिड': 'did', 'आई': 'i', 'स्पेंड': 'spend', 'स्पेंट': 'spent', 'ऑन': 'on', 'फूड': 'food', 'फ़ूड': 'food', 'दिस': 'this', 'वीक': 'week', 'मंथ': 'month', 'टुडे': 'today', 'लास्ट': 'last', 'व्हाट': 'what', 'वाज़': 'was', 'वाज': 'was', 'माय': 'my', 'बिगेस्ट': 'biggest', 'एक्सपेंस': 'expense', 'लिमिट': 'limit', 'बजट': 'budget', 'ट्रैवल': 'travel', 'शॉपिंग': 'shopping', 'स्विगी': 'swiggy', 'ज़ोमैटो': 'zomato', 'जोमैटो': 'zomato', 'उबर': 'uber', 'ओला': 'ola', 'ऑटो': 'auto', 'कैन': 'can', 'अफोर्ड': 'afford', 'अफ़ोर्ड': 'afford', 'लेफ्ट': 'left', 'हाउ मच': 'how much', 'द': 'the', 'इन': 'in', 'टॉप': 'top', 'स्पेंडिंग': 'spending', 'व्हाई': 'why', 'मोर': 'more', 'एनीथिंग': 'anything', 'अनयूज़ुअल': 'unusual', 'ग्रोसरी': 'grocery', 'ग्रोसरीज': 'groceries', 'कैब': 'cab', 'मेट्रो': 'metro', 'रुपीज़': 'rupees', 'रुपये': 'rupees', 'ऐड': 'add', 'सेट': 'set', 'कीप': 'keep', 'अंडर': 'under', 'वेयर': 'where', 'गो': 'go', 'डिनर': 'dinner', 'लंच': 'lunch', 'पेमेंट': 'payment', 'पेमेंट्स': 'payments', 'शो': 'show', 'ट्रांजैक्शन': 'transaction', 'ट्रांजैक्शंस': 'transactions', 'यस्टरडे': 'yesterday', 'वीकेंड': 'weekend', 'सब्सक्रिप्शन': 'subscription', 'सब्सक्रिप्शंस': 'subscriptions', 'कैटेगरी': 'category' };
  const HI_FUNC = /(कितना|कितने|खर्च|खर्चा|हुआ|हुए|है|हैं|पे|पर|का|की|के|में|क्या|मेरा|मेरी|मुझे|गया|गए|बचा|बचे|क्यों|सबसे|कहाँ|कहां|इस|पिछले|आज|कल|हफ्ते|हफ़्ते|महीने|खाने|खाना|दिखाओ|बताओ|लिया|दिया)/;
  E.speechNormalize = (raw) => {
    const text = String(raw || '').trim();
    if (!DEVANAGARI.test(text)) return { text, lang: E.detectLang(text) };
    const toks = text.split(/\s+/); let en = 0, hi = 0, latin = 0;
    const out = toks.map((w) => { const bare = w.replace(/[?.,!।]/g, ''); if (DEV_EN[bare]) { en++; return DEV_EN[bare]; } if (/[a-z]/i.test(bare)) { latin++; return w; } if (HI_FUNC.test(bare)) hi++; return w; });
    const conv = out.join(' ');
    if (!hi && (en + latin) >= Math.max(1, toks.length * 0.6)) return { text: conv, lang: 'en' };
    if (hi && (en + latin) > 0) return { text: conv, lang: 'hinglish' };
    return { text: conv, lang: 'hi' };
  };
  E.detectLang = (q) => (DEVANAGARI.test(q) ? 'hi' : HINGLISH_WORDS.test(q) ? 'hinglish' : 'en');
  const CAT_WORDS = [
    ['Food', /\b(food|eat|eating|meal|meals|snack|snacks|lunch|dinner|breakfast|khana|swiggy|zomato|chai|coffee)\b/],
    ['Travel', /\b(travel|cab|cabs|auto|uber|ola|rapido|metro|commute|transport|fuel|petrol|train)\b/],
    ['Shopping', /\b(shopping|shop|clothes|amazon|myntra|flipkart)\b/],
    ['Household', /\b(grocery|groceries|household|home|rent|kirana|bill|bills|recharge|electricity|internet|wifi)\b/],
    ['Shared', /\b(split|shared)\b/],
  ];
  const findCat = (s) => { for (const [id, re] of CAT_WORDS) if (re.test(s)) return id; return null; };
  function findMerchant(s, S) {
    const names = [...new Set(S.txns.map((t) => t.payee).filter(Boolean))];
    for (const n of names) { const k = n.toLowerCase().replace(/\.$/, ''); const first = k.split(' ')[0]; if (k.length > 2 && (s.includes(' ' + k + ' ') || (first.length > 3 && s.includes(' ' + first + ' ') && merchantMatch(n, S.merchants)))) return n; }
    return null;
  }
  function findPeriod(s, r) {
    if (/\btoday\b/.test(s)) return { key: 'today', range: r.today, prev: r.yesterday, prevKey: 'yesterday' };
    if (/\byesterday\b/.test(s)) return { key: 'yesterday', range: r.yesterday, prev: [r.yesterday[0] - DAY, r.yesterday[0]], prevKey: 'dayBefore' };
    if (/\blast week\b/.test(s)) return { key: 'lastWeek', range: [r.week[0] - 7 * DAY, r.week[0]], prev: [r.week[0] - 14 * DAY, r.week[0] - 7 * DAY], prevKey: 'weekBefore' };
    if (/\b(last|past) 7 days\b/.test(s)) return { key: 'last7', range: r.last7, prev: r.prev7, prevKey: 'prev7' };
    if (/\b(this )?week\b/.test(s)) return { key: 'week', range: r.week, prev: r.lastWeek, prevKey: 'lastWeekSame' };
    if (/\blast month\b/.test(s)) return { key: 'lastMonth', range: r.lastMonthFull, prev: null };
    for (let i = 0; i < 12; i++) if (new RegExp('\\b(' + MONTH_FULL[i].toLowerCase() + '|' + MON[i].toLowerCase() + ')\\b').test(s)) {
      const t = p(r.now); let y = t.y; if (i > t.m) y--;
      if (i === t.m) return { key: 'month', range: r.month, prev: r.lastMonthSame, prevKey: 'lastMonthSame' };
      return { key: 'named', name: MONTH_FULL[i], range: [at(y, i, 1), at(y, i + 1, 1)], prev: null };
    }
    return { key: 'month', range: r.month, prev: r.lastMonthSame, prevKey: 'lastMonthSame', implicit: !/\b(this )?month\b/.test(s) };
  }
  const amountIn = (s) => { const m = s.match(/(?:₹|rs\.?|inr)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/i); return m ? Math.round(parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) * 100) : null; };

  const L = {
    en: {
      period: { today: 'today', yesterday: 'yesterday', week: 'this week', lastWeek: 'last week', last7: 'in the last 7 days', month: 'this month', lastMonth: 'last month' },
      prev: { yesterday: 'yesterday', dayBefore: 'the day before', lastWeekSame: 'this time last week', weekBefore: 'the week before', prev7: 'the 7 days before', lastMonthSame: 'this time last month' },
      small: (what, per) => (what ? `on ${what} ${per}` : `spent ${per}`),
      spentLine: (a, what, per) => (what ? `You've spent ${a} on ${what} ${per}.` : `You've spent ${a} ${per}.`),
      more: (d, prev, top) => `${d} more than ${prev}${top ? `, mostly ${top}` : ''}.`,
      less: (d, prev) => `${d} less than ${prev}.`, same: (prev) => `About the same as ${prev}.`,
      none: (what, per) => `I don't see any ${what ? what + ' ' : ''}payments ${per}. Paid in cash? You can add it.`,
      why: (d, top) => `You've spent ${d} more than this time last month${top ? `, mostly on ${top}` : ''}.`,
      whyLess: (d) => `You've actually spent ${d} less than this time last month.`,
      left: (a, what, per, n) => `${a} left in your ${what} limit${per ? `, about ${per} a day for the next ${n} days` : ''}.`,
      over: (a, what) => `You're ${a} over your ${what} limit. It resets with the period.`,
      noLimit: (what, a) => `You haven't set ${what === 'overall' ? 'an overall' : 'a ' + what} limit yet. You've spent ${a} so far this month.`,
      affordYes: (x, d) => `Yes. ${x} fits: you'd still have about ${d} a day for the rest of the month.`,
      affordTight: (x, after, n) => `You can, but it's tight. After ${x} you'd have ${after} for the next ${n} days.`,
      affordNo: (x, left) => `${x} is more than the ${left} left in your limit this month.`,
      affordNoLimit: (x, avg) => `There's no overall limit set, so I can't say for sure. You usually spend about ${avg} a day.`,
      top: (cat, a) => `Most of your money this month went to ${cat}: ${a}.`,
      biggest: (a, who, when) => `Your biggest payment this month was ${a} to ${who} ${when}.`,
      unusual: (n, late) => (n || late ? [n ? `${n} payment${n > 1 ? 's' : ''} look${n > 1 ? '' : 's'} unusual for you this month.` : '', late ? `${late.count} late-night cab ride${late.count > 1 ? 's' : ''} this month, ${late.amount}.` : ''].filter(Boolean).join(' ') : `Nothing unusual this month. Your payments look like your normal pattern.`),
      recurring: (n) => (n ? `I found ${n} payment${n > 1 ? 's' : ''} that repeat every month.` : `I don't see any repeating payments yet.`),
      needs: (n, a) => (n ? `${n} payment${n > 1 ? 's' : ''} need${n > 1 ? '' : 's'} a category, ${a} in total.` : `Every payment this month has a category.`),
      notUnderstood: `I didn't quite catch that. Did you mean one of these?`,
      outOfScope: `That's outside what I can do. I don't give investment advice, and I only see your spending from payment SMS.`,
      addAsk: 'Add this payment?', setAsk: (txt) => txt,
    },
    hinglish: {
      period: { today: 'aaj', yesterday: 'kal', week: 'is hafte', lastWeek: 'pichle hafte', last7: 'pichle 7 din mein', month: 'is mahine', lastMonth: 'pichle mahine' },
      prev: { yesterday: 'kal se', dayBefore: 'parson se', lastWeekSame: 'pichle hafte se', weekBefore: 'usse pehle wale hafte se', prev7: 'usse pehle ke 7 din se', lastMonthSame: 'pichle mahine (same dates) se' },
      small: (what, per) => (what ? `${per} ${what} pe` : `${per} kharcha`),
      spentLine: (a, what, per) => (what ? `${per} ${what} pe ${a} gaye.` : `${per} ${a} kharcha hua.`),
      more: (d, prev, top) => `${prev} ${d} zyada${top ? `, zyada tar ${top}` : ''}.`, less: (d, prev) => `${prev} ${d} kam.`, same: (prev) => `${prev} lagbhag utna hi.`,
      none: (what, per) => `${per} ${what ? what + ' ka ' : ''}koi payment nahi dikha. Cash diya tha? Add kar sakte ho.`,
      why: (d, top) => `Pichle mahine ke same time se ${d} zyada gaye${top ? `, zyada tar ${top} pe` : ''}.`, whyLess: (d) => `Pichle mahine se ${d} kam kharcha hua hai.`,
      left: (a, what, per, n) => `${what} limit mein ${a} bacha hai${per ? `, agle ${n} din ke liye roz lagbhag ${per}` : ''}.`,
      over: (a, what) => `${what} limit se ${a} upar ho. Period ke saath reset hoga.`, noLimit: (what, a) => `${what} ki limit abhi set nahi hai. Is mahine ab tak ${a} gaye.`,
      affordYes: (x, d) => `Haan. ${x} ho jayega: mahine ke baaki din roz lagbhag ${d} bachega.`, affordTight: (x, after, n) => `Ho jayega, par tight hai. ${x} ke baad agle ${n} din ke liye ${after} bachega.`,
      affordNo: (x, left) => `${x} limit mein bache ${left} se zyada hai.`, affordNoLimit: (x, avg) => `Overall limit set nahi hai. Aap roz lagbhag ${avg} kharch karte ho.`,
      top: (cat, a) => `Is mahine sabse zyada paisa ${cat} pe gaya: ${a}.`, biggest: (a, who, when) => `Is mahine ka sabse bada payment: ${a}, ${who} ko, ${when}.`,
      unusual: (n, late) => (n || late ? [n ? `Is mahine ${n} payment thode alag lag rahe hain.` : '', late ? `${late.count} late-night cab rides, ${late.amount}.` : ''].filter(Boolean).join(' ') : `Is mahine kuch ajeeb nahi dikha.`),
      recurring: (n) => (n ? `${n} payment har mahine repeat ho rahe hain.` : `Abhi koi repeat hone wala payment nahi dikha.`),
      needs: (n, a) => (n ? `${n} payment ki category chahiye, total ${a}.` : `Sab payments ki category set hai.`),
      notUnderstood: `Samajh nahi aaya. Inmein se kuch poochna tha?`, outOfScope: `Ye mere bas ka nahi hai. Main investment advice nahi deti; sirf payment SMS se aapka kharcha dekhti hoon.`,
      addAsk: 'Ye payment add karun?', setAsk: (txt) => txt,
    },
    hi: {
      period: { today: 'आज', yesterday: 'कल', week: 'इस हफ्ते', lastWeek: 'पिछले हफ्ते', last7: 'पिछले 7 दिन में', month: 'इस महीने', lastMonth: 'पिछले महीने' },
      prev: { yesterday: 'कल से', dayBefore: 'परसों से', lastWeekSame: 'पिछले हफ्ते से', weekBefore: 'उससे पहले के हफ्ते से', prev7: 'उससे पहले के 7 दिन से', lastMonthSame: 'पिछले महीने (इन्हीं तारीखों) से' },
      small: (what, per) => (what ? `${per} ${what} पर` : `${per} खर्च`),
      spentLine: (a, what, per) => (what ? `${per} ${what} पर ${a} खर्च हुए।` : `${per} ${a} खर्च हुए।`),
      more: (d, prev, top) => `${prev} ${d} ज़्यादा${top ? `, ज़्यादातर ${top}` : ''}।`, less: (d, prev) => `${prev} ${d} कम।`, same: (prev) => `${prev} लगभग उतना ही।`,
      none: (what, per) => `${per} ${what ? what + ' का ' : ''}कोई पेमेंट नहीं दिखा। नकद दिया था? जोड़ सकते हैं।`,
      why: (d, top) => `पिछले महीने की इन्हीं तारीखों से ${d} ज़्यादा खर्च हुआ${top ? `, ज़्यादातर ${top} पर` : ''}।`, whyLess: (d) => `पिछले महीने से ${d} कम खर्च हुआ है।`,
      left: (a, what, per, n) => `${what} लिमिट में ${a} बचे हैं${per ? `, अगले ${n} दिन रोज़ लगभग ${per}` : ''}।`,
      over: (a, what) => `आप ${what} लिमिट से ${a} ऊपर हैं।`, noLimit: (what, a) => `${what} की लिमिट अभी सेट नहीं है। इस महीने अब तक ${a} खर्च हुए।`,
      affordYes: (x, d) => `हाँ। ${x} हो जाएगा: महीने के बाकी दिन रोज़ लगभग ${d} बचेंगे।`, affordTight: (x, after, n) => `हो जाएगा, पर तंग है। ${x} के बाद अगले ${n} दिन के लिए ${after} बचेंगे।`,
      affordNo: (x, left) => `${x} आपकी बची हुई ${left} की लिमिट से ज़्यादा है।`, affordNoLimit: (x, avg) => `ओवरऑल लिमिट सेट नहीं है। आप रोज़ लगभग ${avg} खर्च करते हैं।`,
      top: (cat, a) => `इस महीने सबसे ज़्यादा पैसा ${cat} पर गया: ${a}।`, biggest: (a, who, when) => `इस महीने का सबसे बड़ा पेमेंट: ${a}, ${who} को, ${when}।`,
      unusual: (n, late) => (n || late ? [n ? `इस महीने ${n} पेमेंट थोड़े अलग लगे।` : '', late ? `${late.count} देर रात की कैब, ${late.amount}।` : ''].filter(Boolean).join(' ') : `इस महीने कुछ अलग नहीं दिखा।`),
      recurring: (n) => (n ? `${n} पेमेंट हर महीने दोहराए जा रहे हैं।` : `अभी कोई दोहराया जाने वाला पेमेंट नहीं दिखा।`),
      needs: (n, a) => (n ? `${n} पेमेंट की कैटेगरी चाहिए, कुल ${a}।` : `सभी पेमेंट की कैटेगरी तय है।`),
      notUnderstood: `मैं समझ नहीं पाई। क्या आप इनमें से कुछ पूछना चाहते थे?`, outOfScope: `यह मेरे दायरे से बाहर है। मैं निवेश की सलाह नहीं देती, और सिर्फ़ पेमेंट SMS से आपका खर्च देखती हूँ।`,
      addAsk: 'यह पेमेंट जोड़ूँ?', setAsk: (txt) => txt,
    },
  };
  E.L = L;
  const HI_CAT = { food: 'खाने', travel: 'सफ़र', shopping: 'शॉपिंग', household: 'घर के सामान', bills: 'बिल', entertainment: 'मनोरंजन', health: 'सेहत', shared: 'साझा खर्च' };
  const catWord = (w, lang) => (lang === 'hi' && HI_CAT[w] ? HI_CAT[w] : w);
  const fmtWhen = (ts, now) => { const a = dayStart(ts), b = dayStart(now); const t = p(ts); return a === b ? `today, ${E.time12(ts)}` : a === b - DAY ? `yesterday, ${E.time12(ts)}` : `on ${t.d} ${MON[t.m]}`; };
  E.fmtWhen = fmtWhen;
  const dateRangeLabel = ([a, b]) => { const x = p(a), y = p(b - 1); return x.m === y.m ? (x.d === y.d ? `${x.d} ${MON[x.m]}` : `${x.d}–${y.d} ${MON[x.m]}`) : `${x.d} ${MON[x.m]}–${y.d} ${MON[y.m]}`; };
  E.dateRangeLabel = dateRangeLabel;
  function coverageNote(list, A, B, lang) {
    const c = E.coverage(list);
    const src = c.other ? `${c.sms} SMS payments + ${c.other} you added` : `${c.sms} SMS payments`;
    const parts = [lang === 'hi' ? `${c.count} पेमेंट पर आधारित, ${dateRangeLabel(A)}${B ? ' बनाम ' + dateRangeLabel(B) : ''}।` : lang === 'hinglish' ? `${src} par based, ${dateRangeLabel(A)}${B ? ' vs ' + dateRangeLabel(B) : ''}.` : `Based on ${src}, ${dateRangeLabel(A)}${B ? ' vs ' + dateRangeLabel(B) : ''}.`];
    if (c.needs) parts.push(lang === 'en' ? `${c.needs} payment${c.needs > 1 ? 's' : ''} without a category ${c.needs > 1 ? 'are' : 'is'} in Other.` : lang === 'hinglish' ? `${c.needs} bina category wale payment Other mein hain.` : `${c.needs} बिना कैटेगरी वाले पेमेंट Other में हैं।`);
    return parts.join(' ');
  }

  /* intent → canonical English question (when Claude parsed the question) */
  E.intentToQuery = (it) => {
    if (!it || !it.intent) return null;
    const per = { today: 'today', yesterday: 'yesterday', this_week: 'this week', last_week: 'last week', last_7_days: 'last 7 days', this_month: 'this month', last_month: 'last month' }[it.period] || (it.period && /^[a-z]+$/i.test(it.period) ? it.period : 'this month');
    const what = it.merchant ? it.merchant : it.category ? String(it.category).toLowerCase() : '';
    const amt = it.amount ? `₹${Math.round(Number(it.amount))}` : '';
    switch (it.intent) {
      case 'spent': return `How much did I spend ${what ? 'on ' + what + ' ' : ''}${per}?`;
      case 'compare': return `Why did I spend more ${it.period === 'this_week' ? 'this week' : 'this month'}${it.category ? ' on ' + what : ''}?`;
      case 'top': return `Where did most of my money go ${per}?`;
      case 'biggest': return `What was my biggest expense ${per}${it.category ? ' on ' + what : ''}?`;
      case 'unusual': return 'Anything unusual this month?';
      case 'limit_left': return `How much is left in my ${it.category ? what : 'overall'} limit?`;
      case 'afford': return amt ? `Can I afford ${amt}?` : null;
      case 'add_expense': return amt ? `add ${amt} on ${it.note || what || 'cash'}${it.period === 'yesterday' ? ' yesterday' : ''}` : null;
      case 'set_limit': return amt ? `keep ${it.category ? what : 'overall'} under ${amt} ${it.limit_period === 'daily' ? 'a day' : it.limit_period === 'weekly' ? 'a week' : 'a month'}` : null;
      case 'list': return `Show ${what ? what + ' ' : ''}payments ${per}`;
      case 'recurring': return 'Any subscriptions?';
      case 'needs_category': return 'What needs a category?';
      case 'categorise': return 'categorise';
      case 'out_of_scope': return 'investment advice';
      default: return null;
    }
  };

  E.answer = (S, q, now, opts = {}) => {
    const r = ranges(now);
    const s = normalize(q);
    const lang = opts.lang || E.detectLang(opts.original || q);
    const T = L[lang] || L.en;
    const ans = { q: opts.original || q, lang, ts: now, kind: 'text', followups: [] };
    const catId = findCat(s);
    const merchant = findMerchant(s, S);
    const per = findPeriod(s, r);
    const amt = amountIn(s);
    const merchants = S.merchants;

    if (/\b(thing|things|stuff|that one|uh|umm|um|hmm)\b/.test(s) && !catId && !merchant) {
      const pl = per.key === 'lastWeek' ? 'last week' : per.key === 'week' ? 'this week' : per.key === 'today' ? 'today' : 'this month';
      const bc = E.byCat(E.inRange(S, per.range)); const top2 = Object.entries(bc).filter(([k]) => k !== 'Other').sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
      return { ...ans, kind: 'unknown', line: T.notUnderstood, followups: [...top2.map((n) => ({ label: `${n} ${pl}`, q: `How much on ${n.toLowerCase()} ${pl}?` })), { label: 'Speak again', action: 'speak' }] };
    }
    if (/\b(invest|investment|shares?|stock|stocks|mutual fund|sip|crypto|bitcoin|loan|emi|tax|itr|credit score|cibil|balance|bank balance|fd|fixed deposit|insurance)\b/.test(s) && !/\b(spent|spend)\b/.test(s)) {
      return { ...ans, kind: 'scope', line: T.outOfScope, help: [{ label: 'Where your money went', q: 'Where did most of my money go this month?' }, { label: 'How much you can still spend', q: 'How much is left in my overall limit?' }, { label: 'Setting a spending limit', action: 'limits' }], coverage: 'Out of scope: investments, loans, tax and bank balances.' };
    }
    if (/^\s*categori[sz]e\s*$/.test(s)) return { ...ans, kind: 'action', action: 'categorise' };
    const addM = s.match(/^\s*(?:add|i spent|spent|paid|i paid|gave)?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:rs|rupees|rupaye)?\s*(?:on|for|pe|ka|ki|ke|to)\s+(.+?)\s*$/) || s.match(/^\s*(?:add|spent|paid)\s+(?:₹|rs\.?)?\s*(\d[\d,]*)\s+(.+?)\s*$/);
    if (addM && !/\b(afford|left|limit|under|how much|why)\b/.test(s)) {
      const what = addM[2].replace(/\b(today|yesterday|cash|by cash|in cash|a day|a week|a month)\b/g, '').trim() || 'Cash';
      const mm = merchantMatch(what, merchants) || (findCat(' ' + what + ' ') ? { cat: findCat(' ' + what + ' '), sub: null } : null);
      const sh = SUB_HINT.find(([re]) => re.test(what));
      const cat = mm ? mm.cat : sh ? E.subToCat(sh[1]) : null;
      const sub = cat ? ((sh && E.subToCat(sh[1]) === cat) ? sh[1] : (mm && mm.sub) || E.defaultSub(cat)) : null;
      return { ...ans, kind: 'add', line: T.addAsk, draft: { amount: toPaise(addM[1]), payee: titleCase(what), cat, sub, method: 'Cash', ts: /\byesterday\b/.test(s) ? now - DAY : now } };
    }
    if (/\b(keep|set|make|change)\b.*\b(under|limit|budget|to)\b/.test(s) && amt) {
      const period = /\b(day|daily|per day|roz)\b/.test(s) ? 'daily' : /\b(week|weekly)\b/.test(s) ? 'weekly' : 'monthly';
      const overall = !catId || /\b(overall|total|whole)\b/.test(s);
      return { ...ans, kind: 'setlimit', draft: { catId: overall ? null : catId, amount: amt, period: overall ? (S.limits.overall ? S.limits.overall.period : 'monthly') : period } };
    }
    if (/\b(afford|can i (spend|buy|get|go)|is it ok to spend)\b/.test(s) && amt) {
      const st = E.limitStatus(S, now, null); const x = E.fmt(amt);
      if (!st) return { ...ans, line: T.affordNoLimit(x, E.fmt(Math.round(E.usualMonthly(S, now) / 30))), followups: [{ label: 'Set an overall limit', action: 'overall' }, { label: 'Spent today?', q: 'How much did I spend today?' }] };
      const after = st.left - amt; const daysAfter = Math.max(1, st.daysLeft - 1);
      const line = after < 0 ? T.affordNo(x, E.fmt(Math.max(0, st.left))) : after / daysAfter < (st.perDay || 0) * 0.6 ? T.affordTight(x, E.fmt(after), daysAfter) : T.affordYes(x, E.fmt(Math.round(after / Math.max(1, st.daysLeft))));
      return { ...ans, kind: 'limit', line, viz: { type: 'afford', st, amt, label: 'Overall limit' }, coverage: coverageNote(E.inRange(S, periodRange(r, st.period)), periodRange(r, st.period), null, lang), followups: [{ label: 'Where did my money go?', q: 'Where did most of my money go this month?' }, { label: 'See limits', action: 'limits' }] };
    }
    if (/\b(need|needs) (a )?categor|uncategori[sz]ed|unclear payments\b/.test(s)) {
      const list = E.needsList(S, now);
      return { ...ans, kind: 'list', line: T.needs(list.length, E.fmt(list.reduce((a, t) => a + t.amount, 0))), viz: list.length ? { type: 'list', ids: list.map((t) => t.id) } : null, followups: list.length ? [{ label: `Categorise ${list.length}`, action: 'categorise' }] : [] };
    }
    if (/\b(why|compare|vs|versus|more than usual|less than usual|than last)\b/.test(s) || /\bmore\b.*\b(month|week)\b/.test(s)) {
      const isWeek = per.key === 'week' || /\bweek\b/.test(s);
      const A = isWeek ? r.week : r.month, B = isWeek ? r.lastWeek : r.lastMonthSame;
      const f = catId ? (t) => E.catOf(t) === catId : null;
      const la = E.inRange(S, A, f), lb = E.inRange(S, B, f);
      const ca = E.byCat(la), cb = E.byCat(lb);
      const rows = [...E.CAT_IDS, 'Other'].map((id) => ({ id, label: id, a: cb[id], b: ca[id], delta: ca[id] - cb[id] })).filter((x) => x.a || x.b).sort((x, y) => y.delta - x.delta);
      const ta = E.sum(la), tb = E.sum(lb), d = ta - tb;
      const ups = rows.filter((x) => x.delta > 0 && x.id !== 'Other').slice(0, 2).map((x) => x.label.toLowerCase());
      const topUp = rows.find((x) => x.delta > 0 && x.id !== 'Other');
      const needs = la.filter((t) => t.catStatus === 'needs').length;
      return { ...ans, kind: 'compare', line: d > 0 ? T.why(E.fmt(d), ups.join(' and ')) : T.whyLess(E.fmt(-d)), viz: { type: 'compare', total: ta, prevTotal: tb, pct: tb ? Math.round((d / tb) * 100) : null, prevLabel: dateRangeLabel(B), curLabel: dateRangeLabel(A), rows: rows.slice(0, 5) },
        coverage: coverageNote(la, A, B, lang), followups: [topUp && { label: `${topUp.label} payments`, q: `Show ${topUp.label.toLowerCase()} payments this ${isWeek ? 'week' : 'month'}` }, topUp && { label: `Set a ${topUp.label.toLowerCase()} limit`, action: 'catlimit:' + topUp.id }, needs && { label: `Categorise ${needs}`, action: 'categorise' }].filter(Boolean) };
    }
    if (/\b(left|limit|budget|remaining|still spend|can i spend)\b/.test(s)) {
      const st = E.limitStatus(S, now, catId);
      const what = catId ? catId.toLowerCase() : 'overall';
      if (!st) return { ...ans, line: T.noLimit(what, E.fmt(E.sum(E.inRange(S, r.month, catId ? (t) => E.catOf(t) === catId : null)))), followups: [{ label: catId ? `Set a ${what} limit` : 'Set an overall limit', action: catId ? 'catlimit:' + catId : 'overall' }, { label: 'Where did my money go?', q: 'Where did most of my money go this month?' }] };
      const R = periodRange(r, st.period);
      return { ...ans, kind: 'limit', line: st.over ? T.over(E.fmt(-st.left), what) : T.left(E.fmt(st.left), what, st.perDay ? E.fmt(st.perDay) : null, st.daysLeft), viz: { type: 'limit', st, label: catId || 'Overall limit' }, coverage: coverageNote(E.inRange(S, R, catId ? (t) => E.catOf(t) === catId : null), R, null, lang), followups: [{ label: `${catId || 'All'} payments`, q: `Show ${catId ? catId.toLowerCase() + ' ' : ''}payments this month` }, { label: 'Change limit', action: catId ? 'catlimit:' + catId : 'overall' }] };
    }
    if (/\b(where|top|most|breakdown|categories)\b/.test(s)) {
      const list = E.inRange(S, per.range); const bc = E.byCat(list);
      const rows = [...E.CAT_IDS, 'Other'].map((id) => ({ id, label: id, amount: bc[id] })).filter((x) => x.amount).sort((a, b) => b.amount - a.amount);
      if (!rows.length) return { ...ans, line: T.none('', T.period[per.key] || ''), followups: [{ label: 'Add a cash payment', action: 'add' }] };
      const top = rows.find((x) => x.id !== 'Other') || rows[0];
      return { ...ans, kind: 'bars', line: T.top(catWord(top.label.toLowerCase(), lang), E.fmt(top.amount)), viz: { type: 'bars', rows, total: E.sum(list), label: dateRangeLabel(per.range) }, coverage: coverageNote(list, per.range, null, lang), followups: [{ label: `${top.label} payments`, q: `Show ${top.label.toLowerCase()} payments this month` }, { label: 'Vs last month?', q: 'Why did I spend more this month?' }] };
    }
    if (/\b(biggest|largest|highest|costliest|expensive)\b/.test(s)) {
      const list = E.inRange(S, per.range, catId ? (t) => E.catOf(t) === catId : null).sort((a, b) => E.spendOf(b) - E.spendOf(a));
      if (!list.length) return { ...ans, line: T.none(catId ? catId.toLowerCase() : '', T.period[per.key] || '') };
      const t = list[0];
      return { ...ans, kind: 'list', line: T.biggest(E.fmt(E.spendOf(t)), t.payee, fmtWhen(t.ts, now)), viz: { type: 'list', ids: list.slice(0, 3).map((x) => x.id) }, coverage: coverageNote(list, per.range, null, lang), followups: [{ label: 'Top spending?', q: 'Where did most of my money go this month?' }] };
    }
    if (/\b(unusual|strange|odd|weird|ajeeb|suspicious)\b/.test(s)) {
      const list = E.inRange(S, r.month); const hist = E.inRange(S, [r.month[0] - 92 * DAY, r.month[0]]);
      const seen = new Set(hist.map((t) => key(t.payee))); const med = {};
      for (const c of [...E.CAT_IDS, 'Other']) { const v = hist.filter((t) => E.catOf(t) === c).map(E.spendOf).sort((a, b) => a - b); med[c] = v.length ? v[Math.floor(v.length / 2)] : 0; }
      const odd = list.filter((t) => (med[E.catOf(t)] && E.spendOf(t) > med[E.catOf(t)] * 3 && E.spendOf(t) >= 50000) || (hist.length && !seen.has(key(t.payee)) && E.spendOf(t) >= 100000)).slice(0, 4);
      const ln = E.lateNight(S, r.month); const late = ln.length >= 2 ? { count: ln.length, amount: E.fmt(E.sum(ln)) } : null;
      const ids = [...odd.map((t) => t.id), ...(late ? ln.slice(0, 3).map((t) => t.id) : [])];
      const why = [...odd.map((t) => (seen.has(key(t.payee)) ? `About ${Math.round(E.spendOf(t) / (med[E.catOf(t)] || 1))}× your usual ${E.catOf(t).toLowerCase()} payment` : 'First payment to this payee')), ...(late ? ln.slice(0, 3).map((t) => `Late-night ride · ${E.time12(t.ts)}`) : [])];
      return { ...ans, kind: 'list', line: T.unusual(odd.length, late), viz: ids.length ? { type: 'list', ids, why } : null, coverage: coverageNote(list, r.month, null, lang), followups: [{ label: 'Biggest expense?', q: 'What was my biggest expense this month?' }] };
    }
    if (/\b(subscription|subscriptions|recurring|repeat|every month|monthly payments)\b/.test(s)) {
      const rec = E.recurring(S);
      return { ...ans, kind: 'recurring', line: T.recurring(rec.length), viz: { type: 'recurring', rows: rec.slice(0, 5) }, followups: [{ label: 'Top spending?', q: 'Where did most of my money go this month?' }] };
    }
    if (/\b(show|list|see|dikhao)\b.*\b(payments?|transactions?)\b/.test(s)) {
      const f = (t) => (!catId || E.catOf(t) === catId) && (!merchant || key(t.payee) === key(merchant));
      const list = E.inRange(S, per.range, f).sort((a, b) => b.ts - a.ts);
      return { ...ans, kind: 'list', line: `${list.length} payment${list.length === 1 ? '' : 's'}${catId ? ' in ' + catId : ''}${merchant ? ' to ' + merchant : ''}, ${dateRangeLabel(per.range)}. Total ${E.fmt(E.sum(list))}.`, viz: { type: 'list', ids: list.slice(0, 6).map((t) => t.id), more: Math.max(0, list.length - 6) }, coverage: coverageNote(list, per.range, null, lang), followups: [{ label: 'Open Transactions', action: 'txns:' + (catId || 'all') }] };
    }
    if (/\b(spent|spend|spending|how much|paid|pay|expense|expenses|cost)\b/.test(s) || catId || merchant) {
      const f = (t) => (!catId || E.catOf(t) === catId) && (!merchant || key(t.payee) === key(merchant));
      const list = E.inRange(S, per.range, f); const total = E.sum(list);
      const what = merchant || (catId ? catWord(catId.toLowerCase(), lang) : '');
      const perLabel = per.key === 'named' ? `in ${per.name}` : T.period[per.key];
      if (!list.length) return { ...ans, line: T.none(what, perLabel), followups: [{ label: 'Add a cash payment', action: 'add' }, { label: 'Top spending?', q: 'Where did most of my money go this month?' }] };
      const byP = {}; for (const t of list) { const k = merchant || catId ? t.payee : E.catOf(t); byP[k] = (byP[k] || 0) + E.spendOf(t); }
      const segs = Object.entries(byP).sort((a, b) => b[1] - a[1]);
      const segments = segs.slice(0, 2).map(([label, amount]) => ({ label, amount })); const rest = segs.slice(2).reduce((a, x) => a + x[1], 0); if (rest) segments.push({ label: 'Other', amount: rest });
      let sub = null;
      if (per.prev) { const pt = E.sum(E.inRange(S, per.prev, f)); const d = total - pt; const pl = T.prev[per.prevKey]; sub = Math.abs(d) < Math.max(5000, pt * 0.05) ? T.same(pl) : d > 0 ? T.more(E.fmt(d), pl, segs.length > 1 ? segments[0].label : null) : T.less(E.fmt(-d), pl); }
      const fu = [{ label: `Show the ${list.length} payment${list.length === 1 ? '' : 's'}`, q: `Show ${catId ? catId.toLowerCase() + ' ' : merchant ? merchant + ' ' : ''}payments ${per.key === 'today' ? 'today' : per.key === 'week' ? 'this week' : per.key === 'yesterday' ? 'yesterday' : 'this month'}` }];
      if (catId) fu.push({ label: `Check my ${catId.toLowerCase()} limit`, q: `How much is left in my ${catId.toLowerCase()} limit?` });
      fu.push({ label: per.key === 'week' ? 'Compare with last week' : 'Compare with last month', q: per.key === 'week' ? 'Why did I spend more this week?' : 'Why did I spend more this month?' });
      return { ...ans, kind: 'amount', big: E.fmt(total), small: T.small(what, perLabel), line: T.spentLine(E.fmt(total), what, perLabel), sub, viz: { type: 'split', segments, total }, coverage: coverageNote(list, per.range, null, lang), followups: fu };
    }
    return { ...ans, kind: 'unknown', line: T.notUnderstood, followups: [{ label: 'Spent this week?', q: 'How much did I spend this week?' }, { label: 'Top spending?', q: 'Where did most of my money go this month?' }, { label: 'Speak again', action: 'speak' }] };
  };

  /* sample payment SMS for the "simulate" tool */
  E.sampleIncoming = (now) => {
    const t = p(now); const d = `${String(t.d).padStart(2, '0')}-${String(t.m + 1).padStart(2, '0')}-${String(t.y).slice(2)}`; const ref = () => '6299' + String(Math.floor(now / 1000) % 100000).padStart(5, '0') + Math.floor(Math.random() * 9);
    return [
      { label: '₹180 to Rajesh Kumar', sender: 'VM-HDFCBK', body: `Rs.180.00 debited from A/c XX4521 via UPI to RAJESH KUMAR on ${d}. Ref ${ref()}. -HDFC Bank` },
      { label: '₹96 Rapido ride', sender: 'VM-HDFCBK', body: `Rs.96.00 debited from A/c XX4521 via UPI to RAPIDO on ${d}. Ref ${ref()}. -HDFC Bank` },
      { label: '₹640 to Neha Gupta', sender: 'VM-HDFCBK', body: `Rs.640.00 debited from A/c XX4521 via UPI to NEHA GUPTA on ${d}. Ref ${ref()}. -HDFC Bank` },
      { label: '₹349 Swiggy (card)', sender: 'AD-ICICIB', body: `ICICI Bank Card XX0217 debited for Rs 349.00 on ${t.d}-${MON[t.m]}-${String(t.y).slice(2)}; SWIGGY credited. Ref ${ref()}.` },
      { label: 'An OTP message', sender: 'VM-HDFCBK', body: '558120 is your OTP for txn of Rs 1,499.00 at MYNTRA. Do not share with anyone.' },
    ];
  };

  /* replies start with a capital letter in every language */
  const rawAnswer = E.answer;
  const cap = (x) => (typeof x === 'string' && x ? x[0].toUpperCase() + x.slice(1) : x);
  E.answer = (...args) => { const a = rawAnswer(...args); if (a) { a.line = cap(a.line); a.sub = cap(a.sub); } return a; };
  root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
