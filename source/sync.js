/* Money Assistant · Google Sheet sync
   Reads the user's "Money-Assistant-Data" Google Sheet through the viewer's
   Google Sheets connector and writes every change back to it.
   Without the connector (a saved copy of this page), data comes from an
   imported .xlsx/.csv and stays on the device. */
(function (root) {
  'use strict';
  const E = root.Engine;
  const SHEET_ID = '11mUbG3UPn0pAbTSG8BX1FSW_JmLT9BpSY40foPT_OCs';
  const SERVER = 'Google Sheets';
  const RANGES = {
    transactions: 'Transactions!A2:U1001',
    remembered: 'Remembered!A2:D500',
    merchants: 'Merchants!A2:B300',
    settings: 'Settings!B3:B8',
    catLimits: "'Category limits'!A2:E40",
  };
  const Sync = {
    SHEET_ID, SERVER, url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
    mcp: null, mode: 'unknown', status: 'idle', error: null, lastSync: null, saving: 0, failed: [], listeners: [],
  };
  const notify = () => Sync.listeners.forEach((fn) => { try { fn(Sync); } catch (e) { /* listener error */ } });
  Sync.on = (fn) => Sync.listeners.push(fn);

  Sync.init = async () => {
    try {
      if (!root.claude || typeof root.claude.use !== 'function') { Sync.mode = 'offline'; return Sync.mode; }
      const m = await root.claude.use('mcp');
      if (!m) { Sync.mode = 'offline'; return Sync.mode; }
      Sync.mcp = m; Sync.mode = 'live';
    } catch (e) { Sync.mode = 'offline'; }
    notify();
    return Sync.mode;
  };

  function valuesOf(res) {
    const pl = res ? res.payload : null;
    if (pl && typeof pl === 'object' && !Array.isArray(pl)) return Array.isArray(pl.values) ? pl.values : [];
    const txt = typeof pl === 'string' ? pl : res && res.content && (res.content.find((c) => c.type === 'text') || {}).text;
    if (txt) { try { const j = JSON.parse(txt); return Array.isArray(j.values) ? j.values : []; } catch (e) { /* not JSON */ } }
    return [];
  }
  const get = (range) => Sync.mcp.callTool(SERVER, 'get_values', { spreadsheetId: SHEET_ID, range }, { cache: false }).then(valuesOf);

  /* Read everything. The first call asks the viewer to allow Google Sheets. */
  Sync.read = async () => {
    if (Sync.mode !== 'live') throw { code: 'offline' };
    Sync.status = 'loading'; Sync.error = null; notify();
    try {
      const transactions = await get(RANGES.transactions);
      const [remembered, merchants, settings, catLimits] = await Promise.all([
        get(RANGES.remembered), get(RANGES.merchants), get(RANGES.settings), get(RANGES.catLimits).catch(() => []),
      ]);
      Sync.status = 'ready'; Sync.lastSync = Date.now(); notify();
      return { transactions, remembered, merchants, settings, catLimits };
    } catch (e) {
      Sync.status = 'error'; Sync.error = e; notify();
      throw e;
    }
  };

  /* Writes run one at a time, in order. A failed write is kept for a manual retry. */
  let chain = Promise.resolve();
  function enqueue(label, tool, input) {
    if (Sync.mode !== 'live') return Promise.resolve({ local: true });
    Sync.saving++; Sync.status = 'saving'; notify();
    const job = chain.then(async () => {
      try {
        await Sync.mcp.callTool(SERVER, tool, { spreadsheetId: SHEET_ID, ...input }, { cache: false });
        Sync.lastSync = Date.now(); Sync.error = null;
        return { ok: true };
      } catch (e) {
        Sync.error = e; Sync.failed.push({ label, tool, input });
        return { ok: false, error: e };
      } finally {
        Sync.saving--; Sync.status = Sync.saving ? 'saving' : Sync.failed.length ? 'error' : 'ready'; notify();
      }
    });
    chain = job;
    return job;
  }
  Sync.retry = () => {
    const jobs = Sync.failed.splice(0); Sync.error = null; notify();
    return Promise.all(jobs.map((j) => enqueue(j.label, j.tool, j.input)));
  };

  /* ---- what the app writes ---- */
  Sync.appendTxn = (S, t) => {
    t.row = S.nextRow++;
    return enqueue(`Add ${t.payee}`, 'update_values', { range: `Transactions!A${t.row}:U${t.row}`, values: [E.rowValues(t)] });
  };
  Sync.saveAnswer = (S, t) => {
    if (!t.row) return Sync.appendTxn(S, t);
    return enqueue(`Update ${t.payee}`, 'update_values', { range: `Transactions!I${t.row}:M${t.row}`, values: [E.answerValues(t)] });
  };
  Sync.deleteTxn = (S, t) => {
    if (!t.row) return Promise.resolve();
    return enqueue(`Delete ${t.payee}`, 'batch_clear_values', { ranges: [`Transactions!A${t.row}:M${t.row}`, `Transactions!U${t.row}`] });
  };
  Sync.remember = (S, rule) => {
    const k = E.payeeKey(rule.payee);
    const row = S.ruleRows[k] || S.remNextRow++;
    S.ruleRows[k] = row;
    return enqueue(`Remember ${rule.payee}`, 'update_values', { range: `Remembered!A${row}:D${row}`, values: [[rule.payee, rule.cat, rule.sub || '', String(rule.on || E.dateLong(Date.now())).replace(/^\w+, /, '')]] });
  };
  Sync.forget = (S, k) => {
    const row = S.ruleRows[k]; if (!row) return Promise.resolve();
    delete S.ruleRows[k];
    return enqueue('Forget choice', 'batch_clear_values', { ranges: [`Remembered!A${row}:D${row}`] });
  };
  const LANG_NAME = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };
  const PERIOD_NAME = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  Sync.saveSettings = (S) => {
    const o = S.limits.overall;
    return enqueue('Settings', 'update_values', { range: 'Settings!B3:B8', values: [[S.name || ''], [o ? o.amount / 100 : ''], [o ? PERIOD_NAME[o.period || 'monthly'] : 'Monthly'], [((o && o.alertPct) || 80) / 100], [S.questionsPerDay || 3], [LANG_NAME[S.lang] || 'English']] });
  };
  Sync.saveCatLimits = (S) => {
    const rows = Object.entries(S.limits.cats).map(([cat, l]) => [cat, l.amount / 100, PERIOD_NAME[l.period || 'monthly'], (l.alertPct || 80) / 100, E.dateLong(Date.now()).replace(/^\w+, /, '')]);
    while (rows.length < 12) rows.push(['', '', '', '', '']);
    return enqueue('Category limits', 'update_values', { range: "'Category limits'!A2:E" + (rows.length + 1), values: rows });
  };

  /* ---- offline: import the same workbook from a file ---- */
  let xlsxLoading = null;
  function loadXlsx() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    if (!xlsxLoading) xlsxLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(root.XLSX); s.onerror = () => rej(new Error('Could not load the Excel reader')); document.head.appendChild(s); });
    return xlsxLoading;
  }
  Sync.readFile = async (file) => {
    const name = (file.name || '').toLowerCase();
    if (/\.csv$/.test(name) || file.type === 'text/csv') {
      const text = await file.text();
      return { transactions: csvRows(text).slice(1), remembered: [], merchants: [], settings: null, catLimits: [] };
    }
    const X = await loadXlsx();
    const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = (n) => { const ws = wb.Sheets[n]; return ws ? X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) : []; };
    const settingsRows = sheet('Settings');
    return {
      transactions: sheet('Transactions').slice(1),
      remembered: sheet('Remembered').slice(1),
      merchants: sheet('Merchants').slice(1),
      settings: settingsRows.length ? settingsRows.slice(2, 8).map((r) => [r[1]]) : null,
      catLimits: sheet('Category limits').slice(1),
    };
  };
  function csvRows(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => String(x).trim()));
  }

  Sync.errorCopy = (e) => {
    const code = e && e.code;
    switch (code) {
      case 'file': return { title: 'Couldn’t read that file', text: String((e && e.message) || '').slice(0, 200) };
      case 'server_not_connected': case 'selection_required': return { title: 'Google Sheets isn’t connected', text: 'Add Google Sheets in claude.ai Settings → Connectors, then reopen this app.' };
      case 'needs_reauth': return { title: 'Google Sheets needs reconnecting', text: 'Reconnect Google Sheets in claude.ai Settings → Connectors.' };
      case 'not_in_manifest': case 'approval_required': case 'consent_required': return { title: 'Allow Google Sheets for this app', text: 'The app needs your permission to read and update your sheet.', allow: true };
      case 'blocked_by_policy': return { title: 'Google Sheets is blocked', text: 'Your organisation doesn’t allow this connector here.' };
      case 'server_unavailable': case 'upstream_error': case 'rate_limited': return { title: 'Google Sheets didn’t answer', text: 'Nothing was lost. Try again in a moment.', retry: true };
      case 'tool_error': return { title: 'The sheet refused the change', text: String((e && e.message) || '').slice(0, 160), retry: true };
      case 'not_granted': case 'capability_disabled': case 'capability_removed': return { title: 'Sheet sync isn’t available here', text: 'Open the app from claude.ai to sync with your Google Sheet.' };
      default: return { title: 'Couldn’t reach your sheet', text: String((e && e.message) || 'Try again in a moment.').slice(0, 160), retry: true };
    }
  };

  root.Sync = Sync;
})(typeof window !== 'undefined' ? window : globalThis);
