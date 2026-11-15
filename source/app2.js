/* Money On Call · app UI, part 2: menu screens (3.x), quick sheets (4.x), data flow, events */

/* ---------- 3.1 Transactions ---------- */
function txnsView() {
  const r = r0(); const monthList = E.inRange(S, r.month);
  const n = needs(); const flt = ui.txFilter; const q = ui.txSearch.trim().toLowerCase();
  let list = S.txns.slice().sort((a, b) => b.ts - a.ts);
  if (flt === 'needs') list = n;
  else if (flt === 'notspend') list = list.filter((t) => !counts(t));
  else if (flt !== 'all') list = list.filter((t) => counts(t) && E.catOf(t) === flt);
  if (q) list = list.filter((t) => (t.payee + ' ' + (t.note || '') + ' ' + (t.amount / 100) + ' ' + catLine(t)).toLowerCase().includes(q));
  const filters = [['all', 'All'], ['needs', 'Need a category'], ...E.CAT_IDS.map((c) => [c, catLabel(c)]), ['Other', 'Other'], ['notspend', 'Not a spend']];
  const groups = groupBy((flt === 'all' && !q ? list.filter((t) => t.catStatus !== 'needs' || t.ts < r.month[0]) : list).slice(0, 400));
  const needsBlock = (flt === 'all' && !q && n.length) ? `<div class="needs-card"><div class="row" style="justify-content:space-between;padding:4px 0 2px"><span class="eyebrow ta">Need a category · ${n.length}</span><span class="small">Not in category limits yet</span></div>
    ${n.map((t) => `<div class="txn"><span class="avatar">${initial(t.payee)}</span><button class="grow" style="text-align:left" data-a="go" data-v="txn" data-p="${esc(t.id)}"><span class="name">${esc(t.payee)}</span><span class="meta">${esc(t.method)} · ${whenShort(t.ts)}</span></button><span class="stack" style="gap:6px;align-items:flex-end"><b class="num medium" style="font-size:16px">${f(t.amount)}</b><button class="chip m sel tiny" data-a="clarify" data-v="${esc(t.id)}">Categorise</button></span></div>`).join('')}</div>` : '';
  return `<section class="view">${navbar('', `<button class="iconbtn" data-a="search" aria-label="Search">${ic('search')}</button>`)}
    <div class="scroll pad"><div class="stack" style="gap:14px;padding-bottom:110px">
    <div><h2 class="display-l" style="margin:0">Transactions</h2><div class="body" style="margin-top:4px">${r.monthName} · <span class="num">${f(E.sum(monthList))}</span> spent · ${monthList.length} payments</div></div>
    ${ui.searchOpen ? `<div class="input">${ic('search', '', 18)}<input id="tx-search" data-input="txsearch" value="${esc(ui.txSearch)}" placeholder="Search payee, amount or note" aria-label="Search transactions"><button class="round" style="width:32px;height:32px" data-a="search" aria-label="Close search">${ic('close')}</button></div>` : ''}
    <div class="chips scrollx">${filters.map(([id, l]) => `<button class="chip m ${flt === id ? 'sel' : ''}" data-a="txfilter" data-v="${id}">${esc(l)}${id === 'needs' && n.length ? `<span class="count">${n.length}</span>` : ''}</button>`).join('')}</div>
    ${needsBlock}
    ${groups.length ? groups.map((g) => { const tot = g.items.reduce((s, t) => s + E.spendOf(t), 0); return `<div><div class="daygroup"><span class="eyebrow">${esc(dayLabel(g.d))}</span><span class="eyebrow num">${f(tot)}</span></div>${g.items.map((t) => txnRow(t)).join('')}</div>`; }).join('') : `<div class="empty">${flt === 'needs' ? 'Every payment has a category.' : 'No payments here yet.'}</div>`}
    </div></div>
    <div class="fab-dock"><button class="btn primary" style="width:auto;min-height:48px;padding:0 22px" data-a="go" data-v="add">${ic('plus', '', 18)}Add expense</button></div></section>`;
}

/* ---------- 3.2 Transaction details ---------- */
function txnView() {
  const t = tx(ui.param); if (!t) return txnsView();
  const k = E.payeeKey(t.payee); const remembered = !!S.rules[k];
  const cid = E.catOf(t); const lim = S.limits.cats[cid] || null;
  const spendish = t.kind === 'spend' || t.kind === 'split';
  const catTitle = t.catStatus === 'needs' ? 'Needs a category' : t.kind === 'split' ? 'Split with friends' : (t.sub || catLabel(cid));
  const catSub = t.catStatus === 'needs' ? 'Counted in Other until you choose' : `${catLabel(cid)}${lim ? ` · counts toward your ${f(lim.amount)}` : ''}${t.kind === 'split' ? ` · your share ${f(t.share)}` : ''}`;
  const catBlock = spendish ? `<div class="card stack" style="gap:14px"><div class="eyebrow">Category</div>
      <div class="row"><span class="tile">${ic(CAT_IC[cid] || 'spark')}</span><div class="grow"><div class="medium">${esc(catTitle)}</div><div class="small">${esc(catSub)}</div></div>
      <button class="chip m soft" data-a="${t.catStatus === 'needs' ? 'clarify' : 'catpick'}" data-v="${esc(t.id)}">${t.catStatus === 'needs' ? 'Categorise' : 'Change'}</button></div>
      ${t.catStatus !== 'needs' && t.catStatus !== 'auto' ? `<div class="sep"></div><div class="row"><span class="ta">${ic('shield', '', 20)}</span><div class="grow"><div class="medium" style="font-size:14px">Remember this choice</div><div class="small">${remembered ? 'You turned this on · similar payments to ' + esc(t.payee) : 'Off until you turn it on'}</div></div><label class="switch"><input type="checkbox" id="rem-${esc(t.id)}" data-a="remember" data-v="${esc(t.id)}" ${remembered ? 'checked' : ''} aria-label="Remember this choice"><span></span></label></div>` : ''}</div>`
    : `<div class="card row"><span class="tile soft">${ic('compare')}</span><div class="grow"><div class="medium">${esc(catLine(t))}</div><div class="small">Not counted in your limits</div></div></div>`;
  const ref = t.sms[0] && (t.sms[0].body.match(/(?:ref(?:\s*no)?|upi)\s*[:.#-]?\s*(\d{9,12})/i) || [])[1];
  const acct = t.sms[0] && (t.sms[0].body.match(/[xX*]{2,}\s?(\d{3,4})/) || [])[1];
  const details = [['Paid from', [t.bank ? t.bank + ' Bank' : '', acct ? '••' + acct : ''].filter(Boolean).join(' ') || t.method], ['Method', t.method], ref ? ['UPI ref', ref] : null, ['Found in', /sms/i.test(t.source) ? 'Bank SMS' : t.source === 'Bill' ? 'Bill photo' : 'Added by you']].filter(Boolean);
  const notSpend = !spendish;
  return `<section class="view">${navbar('', `<button class="iconbtn" data-a="sheet" data-v="txnmenu" data-p="${esc(t.id)}" aria-label="More options">${ic('dots')}</button>`)}
    <div class="scroll pad"><div class="stack" style="gap:14px;padding-bottom:24px">
    <div class="stack center" style="gap:2px;align-items:center"><span class="avatar lg">${initial(t.payee)}</span><div class="t2" style="margin-top:8px">${esc(t.payee)}</div><div class="num amount-xl ${notSpend ? 'off' : ''}">${f(t.amount)}</div><div class="small">${esc([t.method, t.bank, whenShort(t.ts).replace(/^(Today|Yesterday), /, (m0) => m0) ].filter(Boolean).join(' · ').replace(/(Today|Yesterday), /, `${E.time.DOW[E.time.p(t.ts).dow]} ${E.time.p(t.ts).d} ${E.time.MON[E.time.p(t.ts).m]}, `))}</div></div>
    ${catBlock}
    ${t.bill ? `<div class="card"><div class="row"><span class="eyebrow grow">Bill · ${esc(t.bill.store)}</span><span class="badge">attached</span></div>${(t.bill.items || []).map((x) => `<div class="row" style="justify-content:space-between;padding-top:8px"><span class="t2">${esc(x.name)}</span><span class="num">${f(Math.round(x.amount * 100))}</span></div>`).join('')}</div>` : ''}
    <div class="input note">${ic('pencil', 't3', 18)}<input id="note-${esc(t.id)}" data-note="${esc(t.id)}" value="${esc(t.note)}" placeholder="Add a note" aria-label="Note"><button class="mini-fab" data-a="notemic" data-v="${esc(t.id)}" aria-label="Say the note">${ic('mic', '', 14)}</button></div>
    <div class="card tight">${details.map(([a, b]) => `<div class="kv"><span class="t2">${a}</span>${a === 'Found in' && t.sms.length ? `<button class="link" data-a="sheet" data-v="showsms" data-p="${esc(t.id)}">${esc(b)} ${ic('chevR', '', 14)}</button>` : `<span class="num">${esc(b)}</span>`}</div>`).join('')}</div>
    <div class="card row"><div class="grow"><div class="medium" style="font-size:14px">Not a spend</div><div class="small">Refunds and transfers between your own accounts won't count as spending</div></div><label class="switch"><input type="checkbox" id="ns-${esc(t.id)}" data-a="notspend" data-v="${esc(t.id)}" ${notSpend ? 'checked' : ''} aria-label="Not a spend"><span></span></label></div>
    <div class="small center">${ic('check', '', 14)} Saved · changes save automatically</div>
    </div></div></section>`;
}

/* ---------- 3.3a Add expense ---------- */
const ADD_QUICK = [['Auto or cab', 'Travel', 'Auto or cab', 'car'], ['Food', 'Food', 'Snacks & meals', 'food'], ['Shopping', 'Shopping', 'Online order', 'bag'], ['Home & groceries', 'Household', 'Groceries', 'home']];
function addView() {
  const d = ui.addDraft || (ui.addDraft = { amount: '', cat: null, sub: null, payee: '', ts: now(), note: '', method: 'Cash', said: null, more: false });
  const r = r0();
  const before = d.cat ? E.sum(E.inRange(S, r.month, (t) => E.catOf(t) === d.cat)) : 0;
  const amt = Math.round(parseFloat(String(d.amount).replace(/,/g, '')) * 100) || 0;
  const local = new Date(d.ts + E.time.TZ).toISOString().slice(0, 16);
  const quickSel = (q) => d.cat === q[1] && (d.sub === q[2] || q[1] !== 'Travel' || !d.sub);
  const extra = d.more ? E.CATS.filter((c) => !ADD_QUICK.some((q) => q[1] === c.id)).map((c) => `<button type="button" class="chip m ${d.cat === c.id ? 'sel' : ''}" data-a="addcat" data-v="${c.id}|${esc(E.defaultSub(c.id))}">${ic(CAT_IC[c.id])}${esc(catLabel(c.id))}</button>`).join('') : '';
  return `<section class="view">${navbar('Add expense')}
    <div class="scroll pad"><form class="stack" style="gap:18px;padding-bottom:16px" data-form="add" autocomplete="off">
    ${d.said ? `<div class="said">${mark(22).replace('class="mark"', 'class="mark said-mic"')}<span>You said “${esc(d.said)}”</span></div>` : ''}
    <div class="stack center" style="gap:2px;align-items:center;margin-top:${d.said ? 4 : 18}px"><span class="eyebrow">Amount</span><div class="amount-in"><span class="amt-r">₹</span><input id="add-amount" name="amount" data-input="add" inputmode="decimal" value="${esc(d.amount)}" placeholder="0" style="width:${Math.max(1, String(d.amount || '0').length) * 0.6 + 0.1}em" aria-label="Amount in rupees"></div></div>
    <div class="stack" style="gap:10px"><span class="eyebrow">Category</span><div class="chips">${ADD_QUICK.map((q) => `<button type="button" class="chip m ${quickSel(q) && d.cat ? 'sel' : ''}" data-a="addcat" data-v="${q[1]}|${esc(q[2])}">${ic(q[3])}${esc(q[0])}</button>`).join('')}${extra}<button type="button" class="chip m" data-a="addmore">${d.more ? 'Less' : '+ More'}</button></div></div>
    <div><div class="formrow"><label for="add-payee">Paid to</label><input id="add-payee" name="payee" data-input="add" value="${esc(d.payee)}" placeholder="${esc((d.sub || 'Payee') + ' (optional)')}"></div>
    <div class="formrow"><label for="add-when">When</label><div class="when-wrap"><span class="when-text">${esc(whenShort(d.ts))}</span>${ic('cal', 't3', 18)}<input id="add-when" name="when" data-input="when" type="datetime-local" value="${local}" max="${new Date(now() + E.time.TZ).toISOString().slice(0, 16)}" aria-label="When"></div></div>
    <div class="formrow"><label for="add-note">Note</label><input id="add-note" name="note" data-input="add" value="${esc(d.note)}" placeholder="Optional"></div>
    <div class="formrow" style="border:0"><label>Paid with</label><div class="chips">${['Cash', 'UPI', 'Card'].map((m) => `<button type="button" class="chip m ${d.method === m ? 'sel' : ''}" data-a="addmethod" data-v="${m}">${m}</button>`).join('')}</div></div></div>
    ${d.cat && amt ? `<div class="row small">${ic('trend', 'ta', 16)}${esc(catLabel(d.cat))} this month: <span class="num">${f(before)} → ${f(before + amt)}</span></div>` : ''}
    </form></div>
    <div class="dock pad"><button class="btn primary" data-a="addsave" ${d.cat ? '' : 'disabled'}>Add expense</button><button class="btn ghost" data-a="voice">Speak again</button></div></section>`;
}

/* ---------- 3.3b From a bill (photo read by Claude) ---------- */
function billView() {
  const b = ui.bill || {};
  if (!b.upload) {
    return `<section class="view">${navbar('Add from a bill')}<div class="scroll pad"><div class="stack" style="padding-bottom:24px">${attachChoices()}</div></div></section>`;
  }
  const thumb = `<img class="thumb" src="${b.upload}" alt="Your bill">`;
  if (b.reading) return `<section class="view">${navbar('Add from a bill')}<div class="scroll pad"><div class="stack" style="padding-bottom:16px"><div class="card row" style="align-items:flex-start;gap:16px">${thumb}<div class="stack" style="gap:6px"><span class="eyebrow ta">Reading the bill…</span><span class="typing"><i></i><i></i><i></i></span><span class="small">Looking for the total, store and date</span></div></div></div></div></section>`;
  const bill = b.bill;
  if (!bill || b.editing) {
    return `<section class="view">${navbar('Add from a bill')}<div class="scroll pad"><div class="stack" style="padding-bottom:16px"><div class="card row" style="align-items:flex-start;gap:16px">${thumb}<form class="stack grow" style="gap:8px" data-form="billform"><span class="eyebrow">${b.error ? 'Type what it says' : 'Check what I read'}</span>
      ${b.error ? `<span class="small">${esc(b.error)}</span>` : ''}
      <div class="input box"><input id="bill-store" name="store" value="${esc((bill && bill.store) || '')}" placeholder="Store or payee"></div><div class="input box"><input id="bill-amount" name="amount" inputmode="decimal" value="${bill && bill.amount ? bill.amount / 100 : ''}" placeholder="Total ₹"></div><button class="btn secondary s" type="submit">Check for a match</button></form></div></div></div>
      <div class="dock pad"><button class="btn ghost" data-a="billreset">Choose another photo</button></div></section>`;
  }
  const match = E.matchBill(S, bill);
  const nItems = (bill.items || []).length;
  const read = `<div class="card row" style="align-items:flex-start;gap:16px">${thumb}<div class="stack" style="gap:4px"><span class="eyebrow ta">${ic('check', '', 13)} ${b.typed ? 'From what you typed' : 'Read from bill'}</span><span class="h2 num">${f(bill.amount)}</span><span class="medium">${esc(bill.store)}</span><span class="small">${whenShort(bill.ts)}${nItems ? ` · ${nItems} items` : ''}</span><button class="link" style="text-align:left;font-size:13px" data-a="billedit">Edit</button></div></div>`;
  const matchCard = match ? `<div class="callout accent" style="align-items:flex-start"><span class="tile">${ic('link')}</span><span class="grow"><span class="title" style="display:block">This matches a payment you already made</span><span class="sub">${f(match.amount)} to ${esc(match.payee)} by ${esc(match.method)} at ${fmtTime(match.ts)}. I'll attach the bill to it so it isn't counted twice.</span></span></div>`
    : `<div class="callout"><span class="tile soft">${ic('plus')}</span><span class="grow"><span class="title" style="display:block">No matching payment found</span><span class="sub">I'll add it as a new expense.</span></span></div>`;
  const items = nItems ? `<div class="card tight"><div class="row" style="padding:12px 0 4px"><span class="eyebrow grow">Items</span><span class="small ta">${esc(catLabel(bill.cat))}</span></div>${bill.items.map((x) => `<div class="kv"><span>${esc(x.name)}</span><span class="num">${f(Math.round(Number(x.amount) * 100))}</span></div>`).join('')}</div>` : '';
  return `<section class="view">${navbar('Add from a bill')}<div class="scroll pad"><div class="stack" style="padding-bottom:16px">${read}${matchCard}${items}</div></div>
    <div class="dock pad">${match ? `<button class="btn primary" data-a="billattach" data-v="${esc(match.id)}">Attach to payment</button><button class="btn ghost" data-a="billseparate">Add as a separate expense</button>` : `<button class="btn primary" data-a="billseparate">Add expense</button><button class="btn ghost" data-a="billreset">Choose another photo</button>`}</div></section>`;
}
function attachChoices() {
  return `<h2 class="h2">Show me a bill or payment</h2>
    <div class="attach-grid">
      <label class="attach-tile" for="bill-cam"><span class="tile">${ic('scan')}</span><b>Scan a bill</b><span>Use camera</span></label>
      <label class="attach-tile" for="bill-pick"><span class="tile soft">${ic('receipt')}</span><b>Bill photo</b><span>Pick from gallery</span></label>
      <label class="attach-tile" for="bill-shot"><span class="tile soft">${ic('phoneShot')}</span><b>Add a payment screenshot</b></label>
    </div>
    <input id="bill-cam" type="file" accept="image/*" capture="environment" hidden data-file="bill"><input id="bill-pick" type="file" accept="image/*" hidden data-file="bill"><input id="bill-shot" type="file" accept="image/*" hidden data-file="bill">
    <button class="callout" data-a="go" data-v="add"><span class="tile">${ic('pencil')}</span><span class="grow"><span class="title" style="display:block">Add it manually</span><span class="sub">Type it or say “₹200 on auto”</span></span>${ic('chevR', 'chev ta')}</button>`;
}

/* ---------- 3.4 Spending insights ---------- */
function insightsView() {
  const r = r0(); const list = E.inRange(S, r.month); const prev = E.inRange(S, r.lastMonthSame);
  const total = E.sum(list), ptot = E.sum(prev); const st = E.limitStatus(S, now(), null);
  const bc = E.byCat(list), pc = E.byCat(prev);
  const rows = [...E.CAT_IDS, 'Other'].map((id) => ({ id, amount: bc[id], delta: bc[id] - pc[id] })).filter((x) => x.amount).sort((a, b) => b.amount - a.amount);
  const max = Math.max(1, ...rows.map((x) => x.amount));
  const driver = rows.filter((x) => x.id !== 'Other').sort((a, b) => b.delta - a.delta)[0];
  const needsN = list.filter((t) => t.catStatus === 'needs');
  const late = E.lateNight(S, r.month);
  const t = E.time.p(now());
  return `<section class="view">${navbar('Spending insights')}<div class="scroll pad"><div class="stack" style="padding-bottom:16px">
    <div><div class="eyebrow">1–${t.d} ${esc(r.monthName)}</div><div class="row" style="align-items:baseline;gap:8px;margin-top:4px"><span class="big num">${f(total)}</span>${st && st.period === 'monthly' ? `<span class="t2">of ${f(st.limit)}</span>` : ''}</div>
    <div class="small ta" style="margin-top:4px">${total >= ptot ? '+' : '−'}${f(Math.abs(total - ptot))} vs ${esc(r.label.lastMonthSame)}${st ? ` · ${f(Math.max(0, st.left))} left for ${st.daysLeft} days` : ''}</div></div>
    <div class="card">${paceChart(st)}</div>
    <div class="card stack" style="gap:14px"><div class="eyebrow">Where it went</div>${rows.map((x) => { const lim = E.limitStatus(S, now(), x.id); const note = lim ? `${f(Math.max(0, lim.left))} left of limit` : x.id === 'Other' && needsN.length ? `incl. ${needsN.length} without a category · ${f(E.sum(needsN))}` : x.delta > 0 && pc[x.id] ? `+${f(x.delta)} vs ${r.prevMonthName.slice(0, 3)}` : ''; return `<button class="stack" style="gap:6px;text-align:left" data-a="txfilterGo" data-v="${x.id}"><span class="row" style="gap:8px"><span class="medium" style="font-size:14px">${esc(catLabel(x.id))}</span><span class="small grow ${x.id === 'Other' ? '' : 'ta'}">${esc(note)}</span><b class="num medium" style="font-size:14px">${f(x.amount)}</b></span><span class="bar thin" style="display:block"><i class="${x.id === 'Other' ? 'muted' : ''}" style="width:${(x.amount / max) * 100}%"></i></span></button>`; }).join('')}</div>
    ${driver && driver.delta > 0 ? `<button class="callout accent" data-a="ask" data-v="Why did I spend more this month?"><span class="tile">${ic('trend')}</span><span class="grow"><span class="title" style="display:block">${esc(catLabel(driver.id))} is driving the jump</span><span class="sub">+${f(driver.delta)} vs ${r.prevMonthName}${driver.id === 'Travel' && late.length >= 2 ? ', mostly late-night cabs' : ''}.</span></span>${ic('chevR', 'chev')}</button>` : ''}
    </div></div>${msgbar('Ask about spending…')}</section>`;
}
function paceChart(st) {
  const r = r0(); const t = E.time.p(now());
  const dim = E.time.daysInMonth(t.y, t.m);
  const cum = (start, days) => { const out = []; let s = 0; for (let d = 0; d < days; d++) { s += E.sum(E.inRange(S, [start + d * E.time.DAY, start + (d + 1) * E.time.DAY])); out.push(s); } return out; };
  const cur = cum(r.month[0], t.d);
  const pm = E.time.p(r.lastMonthFull[0]); const prev = cum(r.lastMonthFull[0], E.time.daysInMonth(pm.y, pm.m));
  const lim = st && st.period === 'monthly' ? st.limit : 0;
  const maxV = Math.max(lim, ...cur, ...prev, 1) * 1.05;
  const W = 340, H = 130, X = (d) => (d / (dim - 1)) * W, Y = (v) => H - (v / maxV) * H;
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const area = cur.length ? `${path(cur)}L${X(cur.length - 1).toFixed(1)},${H}L0,${H}Z` : '';
  const lx = X(cur.length - 1), ly = Y(cur[cur.length - 1] || 0);
  return `<div class="legend" style="margin-bottom:10px"><span><i class="ln"></i>${r.monthName}</span><span><i class="ln p"></i>${r.prevMonthName}</span>${lim ? `<span><i class="ln d"></i>Limit ${f(lim)}</span>` : ''}</div>
    <svg class="pace" viewBox="-4 -6 ${W + 8} ${H + 12}" preserveAspectRatio="none" role="img" aria-label="Running total this month compared with last month">
    <defs><linearGradient id="pl" x1="0" x2="1"><stop offset="0" stop-color="#6a3df5"/><stop offset="1" stop-color="#d23a93"/></linearGradient><linearGradient id="pa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b3fe6" stop-opacity=".22"/><stop offset="1" stop-color="#9b3fe6" stop-opacity="0"/></linearGradient></defs>
    ${lim ? `<line x1="0" x2="${W}" y1="${Y(lim)}" y2="${Y(lim)}" stroke="var(--text3)" stroke-width="1.2" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` : ''}
    <path d="${path(prev.slice(0, dim))}" fill="none" stroke="var(--line-strong)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <path d="${area}" fill="url(#pa)"/><path d="${path(cur)}" fill="none" stroke="url(#pl)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    <circle cx="${lx}" cy="${ly}" r="4" fill="#d23a93" stroke="var(--surface)" stroke-width="2"/></svg>
    <div class="row small" style="justify-content:space-between;margin-top:6px"><span>1 ${E.time.MON[t.m]}</span><span>Today · ${t.d}</span><span>${dim}</span></div>`;
}

/* ---------- 3.5 Limits ---------- */
function monthlyCard(st) {
  const r = r0(); const t = E.time.p(now()); const dim = E.time.daysInMonth(t.y, t.m);
  const pace = st.period === 'monthly' ? Math.round(st.limit * t.d / dim) : st.limit; const diff = pace - st.spent;
  const start = E.time.p(E.periodRange(r, st.period)[0]);
  const range = st.period === 'monthly' ? `1 ${E.time.MON[t.m]} – ${dim} ${E.time.MON[t.m]}` : st.period === 'weekly' ? `this week` : 'today';
  const sp = Math.min(100, (st.spent / st.limit) * 100), pp = Math.min(100, (pace / st.limit) * 100);
  return `<button class="card stack monthly" style="gap:10px;text-align:left;padding:18px" data-a="go" data-v="overall">
    <span class="eyebrow">${st.period === 'monthly' ? 'Monthly' : st.period === 'weekly' ? 'Weekly' : 'Daily'} limit</span>
    <span class="h2 num" style="margin-top:-4px">${st.left >= 0 ? f(st.left) + ' left' : f(-st.left) + ' over'}</span>
    <span class="small manrope" style="margin-top:-8px">of ${f(st.limit)} · ${range}</span>
    <div class="pace-bar"><span class="pace-lbl" style="left:${pp}%">Today's pace</span><div class="bar"><i style="width:${sp}%"></i><span class="mk" style="left:${pp}%"></span></div></div>
    <div class="row small" style="justify-content:space-between"><span class="num">${f(st.spent)}</span><span class="num">${f(st.limit)}</span></div>
    <div class="row" style="justify-content:space-between"><span class="badge ${diff >= 0 ? 'pos' : 'neg'}">${f(Math.abs(diff))} ${diff >= 0 ? 'under' : 'over'} pace</span><span class="small t1">${st.perDay ? `${f(st.perDay)} a day from here` : ''}</span></div></button>`;
}
function limitsView() {
  const r = r0(); const st = E.limitStatus(S, now(), null);
  const catIds = Object.keys(S.limits.cats);
  const bc = E.byCat(E.inRange(S, r.month)), pc = E.byCat(E.inRange(S, r.lastMonthSame));
  const sugg = E.CAT_IDS.filter((c) => !S.limits.cats[c] && c !== 'Shared' && bc[c] > 0).sort((a, b) => (bc[b] - pc[b]) - (bc[a] - pc[a])).slice(0, 1);
  return `<section class="view">${navbar('Limits')}<div class="scroll pad"><div class="stack" style="gap:14px;padding-bottom:16px">
    ${st ? monthlyCard(st) 
      : `<button class="callout accent" data-a="go" data-v="overall"><span class="tile">${ic('limit')}</span><span class="grow"><span class="title" style="display:block">No overall limit yet</span><span class="sub">${f(E.sum(E.inRange(S, r.month)))} spent this month. Set one to see how much you can spend per day.</span></span>${ic('chevR', 'chev')}</button>`}
    <div class="eyebrow" style="margin-top:8px">Category limits</div>
    ${catIds.map((id) => { const s = E.limitStatus(S, now(), id); return `<button class="card stack" style="gap:12px;text-align:left" data-a="go" data-v="catlimit" data-p="${esc(id)}"><div class="row"><span class="tile">${ic(CAT_IC[id] || 'spark')}</span><div class="grow"><div class="medium">${esc(catLabel(id))} · ${s.period}</div><div class="small num">${f(s.spent)} of ${f(s.limit)}</div></div><div style="text-align:right"><div class="medium num">${s.left >= 0 ? f(s.left) + ' left' : f(-s.left) + ' over'}</div><div class="small ta">${s.pct}% used · warns at ${s.alertPct}%</div></div></div><div class="bar"><i style="width:${Math.min(100, s.pct)}%"></i><span class="mk" style="left:${s.alertPct}%"></span></div>${s.perDay ? `<div class="small">About ${f(s.perDay)} a day for the next ${s.daysLeft} days</div>` : s.period === 'daily' ? '<div class="small">Resets at midnight</div>' : ''}</button>`; }).join('')}
    ${sugg.map((c) => `<div class="card dash row"><span class="tile soft">${ic(CAT_IC[c])}</span><div class="grow"><div class="medium">${esc(catLabel(c))} has no limit</div><div class="small num">${f(bc[c])} so far${bc[c] - pc[c] > 0 ? ` · +${f(bc[c] - pc[c])} vs ${r.prevMonthName.slice(0, 3)}` : ''}</div></div><button class="chip m soft" data-a="go" data-v="catlimit" data-p="${c}">Set limit</button></div>`).join('')}
    ${!catIds.length && !sugg.length ? '<div class="small">None yet. They are optional.</div>' : ''}
    <div class="card row"><span class="t2">${ic('bell', '', 20)}</span><div class="grow"><div class="medium" style="font-size:14px">Warn me at 80%</div><div class="small">A nudge before any limit runs out</div></div><label class="switch"><input type="checkbox" id="alerts-on" data-a="toggle" data-v="alertsOn" ${S.alertsOn ? 'checked' : ''} aria-label="Warn me at 80%"><span></span></label></div>
    </div></div><div class="dock pad"><button class="btn primary" data-a="go" data-v="catlimit" data-p="${sugg[0] || E.CAT_IDS.find((c) => !S.limits.cats[c]) || 'Food'}">Add a category limit</button><button class="btn ghost" data-a="go" data-v="overall">Edit overall limit</button></div></section>`;
}

/* ---------- 3.6 Category limit / 3.6b Overall limit ---------- */
function limitEditView(catId) {
  const key = catId || 'overall';
  const existing = catId ? S.limits.cats[catId] : S.limits.overall;
  if (!ui.limDraft || ui.limDraft.key !== key) {
    const period = (existing && existing.period) || 'monthly';
    ui.limDraft = { key, catId, period, amount: existing ? existing.amount : E.suggestLimit(S, now(), catId, period).suggested, alertPct: (existing && existing.alertPct) || 80 };
    ui.limConfirm = false;
  }
  const d = ui.limDraft;
  const st = previewLimit(catId, d.amount, d.period, d.alertPct);
  const amtStr = Math.round(d.amount / 100).toLocaleString('en-IN');
  const sayStr = Math.round(E.suggestLimit(S, now(), catId, d.period).suggested / 100).toLocaleString('en-IN');
  return `<section class="view">${navbar(catId ? 'Category limit' : 'Overall limit')}
    <div class="scroll pad"><div class="stack" style="gap:16px;padding-bottom:16px">
    ${catId ? `<button class="ta small center medium" data-a="sheet" data-v="limcat">${esc(catLabel(catId))} · category limit</button>` : `<div class="ta small center medium">Overall · every payment counts</div>`}
    <div class="amount-row"><span class="amt-r">₹</span><input id="lim-amount" inputmode="numeric" value="${amtStr}" style="width:${amtStr.length * 0.58 + 0.1}em" aria-label="Limit amount in rupees" data-input="lim"><span class="caret"></span>
      ${catId ? `<button class="chip m soft period" data-a="sheet" data-v="period" aria-label="Limit period: ${d.period}">${d.period === 'monthly' ? 'Monthly' : d.period === 'weekly' ? 'Weekly' : 'Daily'} ${ic('chevD')}</button>` : `<button class="t3 period-plain" data-a="sheet" data-v="period">/ ${d.period === 'monthly' ? 'month' : d.period === 'weekly' ? 'week' : 'day'}</button>`}</div>
    <div class="small center">${ic('mic', '', 13)} Tap to type, or say “${catId ? `Keep ${esc(catLabel(catId).toLowerCase())} under ${sayStr}` : `Set my overall limit to ${sayStr}`}”</div>
    <div class="picks" id="lim-picks">${limPicks(catId, d)}</div>
    <div class="card stack" style="gap:10px" id="lim-preview">${limPreview(st, d, catId)}</div>
    <div class="card row"><span class="t2">${ic('bell', '', 20)}</span><div class="grow"><div class="medium" style="font-size:14px">Warn me at ${d.alertPct}%</div><div class="small" id="lim-warn">When ${catId ? esc(catLabel(catId).toLowerCase()) : 'spending'} reaches ${f(st.warnAt)}</div></div><label class="switch"><input type="checkbox" id="lim-alert" data-a="toggle" data-v="alertsOn" ${S.alertsOn ? 'checked' : ''} aria-label="Warn me at 80%"><span></span></label></div>
    ${ui.limConfirm ? `<div class="card soft stack" style="gap:10px"><div class="medium">You've already spent ${f(st.spent)} ${periodThis(d.period)}, which is over ${f(d.amount)}.</div><div class="small t1">Set it anyway? It shows as over until the period resets.</div><div class="row"><button class="btn primary s" data-a="limsave" data-v="force">Set anyway</button><button class="btn ghost s" data-a="limconfirmno">Change amount</button></div></div>` : ''}
    </div></div><div class="dock pad"><button class="btn primary" data-a="limsave">${catId ? 'Save limit' : 'Save overall limit'}</button><button class="btn ghost" data-a="back">Cancel</button></div></section>`;
}
function limPicks(catId, d) {
  const sg = E.suggestLimit(S, now(), catId, d.period);
  return [['Tight', sg.tight], ['Suggested', sg.suggested], ['Relaxed', sg.relaxed]].map(([l, v]) => `<button class="pick ${d.amount === v ? 'sel' : ''}" data-a="limpick" data-v="${v}"><b class="num">${f(v)}</b><span>${l}</span></button>`).join('');
}
function limPreview(st, d, catId) {
  const sg = E.suggestLimit(S, now(), catId, d.period);
  const why = catId ? `Why ${f(sg.suggested)}: your usual is ${f(sg.usual)} ${perWordOf(d.period)}, and ${periodThis(d.period).replace('this ', '')} is already at ${f(sg.spentNow)}.` : `Why ${f(sg.suggested)}: you usually spend about ${f(sg.usual)} ${perWordOf(d.period)}.`;
  return `<div class="eyebrow">With ${f(d.amount)} ${periodThis(d.period)}</div><div class="bar"><i style="width:${Math.min(100, st.pct)}%"></i></div>
    <div class="nums3"><div><span class="small">Spent</span><b>${f(st.spent)}</b></div><div><span class="small">${st.left >= 0 ? 'Left' : 'Over'}</span><b>${f(Math.abs(st.left))}</b></div><div><span class="small">Per day</span><b>${st.perDay ? '≈ ' + f(st.perDay) : '—'}</b></div></div>
    <div class="cover">${ic('info')}<span>${esc(why)}${st.perDay ? ` This ${catId ? 'still ' : ''}leaves about ${f(st.perDay)} a day for the next ${st.daysLeft} days.` : d.period === 'daily' ? ' Daily limits reset at midnight.' : ''}</span></div>`;
}

/* ---------- 3.7 Recently asked ---------- */
function askedView() {
  const cutoff = now() - 30 * E.time.DAY; const qs = (ui.askSearch || '').toLowerCase();
  const list = S.history.filter((h) => h.ts >= cutoff && (!qs || h.q.toLowerCase().includes(qs))).sort((a, b) => b.ts - a.ts);
  const groups = []; for (const h of list) { const d = E.time.dayStart(h.ts); let g = groups.find((x) => x.d === d); if (!g) groups.push(g = { d, items: [] }); g.items.push(h); }
  return `<section class="view">${navbar('Recently asked')}<div class="scroll pad"><div class="stack" style="gap:12px;padding-bottom:16px">
    <div class="input">${ic('search', 't3', 18)}<input id="ask-search" data-input="asksearch" value="${esc(ui.askSearch || '')}" placeholder="Search your questions" aria-label="Search your questions"></div>
    ${groups.length ? groups.map((g) => `<div><div class="eyebrow" style="padding:6px 0">${esc(dayLabel(g.d).split(' · ')[0])}</div>${g.items.map((h) => `<button class="lrow asked" data-a="ask" data-v="${esc(h.q)}"><span class="ic ${h.kind === 'scope' ? 'scope' : ''}">${ic(h.voice ? 'mic' : 'keyboard', '', 16)}</span><span class="grow"><span class="ttl" style="display:block">${esc(h.q)}</span><span class="sub">${esc(h.kind === 'scope' ? 'Outside what I can help with' : h.line || '')}</span></span><span class="small">${fmtTime(h.ts)}</span></button>`).join('')}</div>`).join('') : '<div class="empty">Questions you ask show up here for 30 days.</div>'}
    <div class="cover">${ic('lock')}<span>Saved only on this phone for 30 days. Clear anytime in Settings.</span></div></div></div>${msgbar('Ask something new…')}</section>`;
}

/* ---------- 3.8 Settings and privacy ---------- */
function swRow(id, key, title, sub, iconName, checked) {
  return `<div class="lrow"><span class="ic">${ic(iconName)}</span><span class="grow"><span class="ttl" style="display:block">${title}</span><span class="sub">${sub}</span></span><label class="switch"><input type="checkbox" id="${id}" data-a="toggle" data-v="${key}" ${(checked != null ? checked : S[key]) ? 'checked' : ''} aria-label="${esc(title)}"><span></span></label></div>`;
}
const navRow = (a, v, icon, title, sub, val, cls = '') => `<button class="lrow ${cls}" data-a="${a}" data-v="${v}"><span class="ic">${ic(icon)}</span><span class="grow"><span class="ttl" style="display:block">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</span>${val ? `<span class="val">${val}</span>` : ''}${ic('chevR', 'chev')}</button>`;
function settingsView() {
  const smsMonth = E.inRange(S, r0().month, (t) => /sms/i.test(t.source)).length;
  const rules = Object.values(S.rules);
  return `<section class="view">${navbar('Settings and privacy')}<div class="scroll pad"><div class="stack" style="gap:10px;padding-bottom:24px">
    <span class="eyebrow sec">Where payments come from</span><div class="card tight">${swRow('set-sms', 'smsOn', 'Transaction SMS', `Banks and UPI apps only${S.smsOn ? ` · ${smsMonth} this month` : ' · off'}`, 'sms')}</div>
    <span class="eyebrow sec">Display</span><div class="card tight">
      ${navRow('sheet', 'lang', 'lang', 'Language', '', LANG_NAME[S.lang])}
      ${navRow('sheet', 'voice', 'wave', 'Voice', '', VOICE_NAME[S.voice] || 'Aria')}
      ${swRow('set-speak', 'speak', 'Speak answers aloud', 'Typed questions get silent answers', 'speaker')}</div>
    <div class="card tight">${swRow('set-dark', 'dark', 'Theme', isDark() ? 'Dark Mode' : 'Light Mode', 'theme', isDark())}</div>
    <span class="eyebrow sec">Privacy</span><div class="card tight">
      ${navRow('go', 'remembered', 'shield', 'Remembered choices', rules.length ? rules.slice(0, 1).map((r) => `${esc(r.payee)} → ${esc(r.sub || r.cat)}`).join('') : 'None yet', String(rules.length))}
      ${navRow('sheet', 'history', 'clock', 'Question history', '', '30 days')}
      ${navRow('sheet', 'micinfo', 'mic', 'Microphone', 'Only while you tap the mic', '')}</div>
    <span class="eyebrow sec">Your data</span><div class="card tight">
      ${navRow('export', '', 'download', 'Export my data', 'CSV of payments and categories', '')}
      ${navRow('sheet', 'delete', 'trash', 'Delete all data', 'Removes everything from this phone', '', 'danger')}</div>
    <div class="cover" style="margin-top:4px">${ic('lock')}<span>Your payments are read and stored on this phone. Nothing is sold or shared.</span></div>
    <span class="eyebrow sec" style="margin-top:18px">Prototype tools</span><div class="card tight">
      ${navRow('sheet', 'simulate', 'sms', 'Simulate a payment SMS', 'Arrives now, like a real bank SMS', '')}
      ${navRow('sheet', 'paste', 'copy', 'Paste a bank SMS', 'See exactly what I read from it', '')}
      ${navRow('sheet', 'widget', 'widget', 'Home-screen widget', 'Preview with today’s numbers', '')}
      ${navRow('replayob', '', 'replay', 'Show onboarding again', 'Keeps your data', '')}</div>
    </div></div></section>`;
}
function rememberedView() {
  const rules = Object.entries(S.rules);
  return `<section class="view">${navbar('Remembered choices')}<div class="scroll pad"><div class="stack" style="padding-bottom:16px">
    <div class="body">Future payments to these payees get the same category. You turned each one on.</div>
    ${rules.length ? `<div class="card tight">${rules.map(([k, r]) => `<div class="lrow"><span class="avatar">${initial(r.payee)}</span><span class="grow"><span class="ttl" style="display:block">${esc(r.payee)}</span><span class="sub">${esc(catLabel(r.cat))}${r.sub ? ' · ' + esc(r.sub) : ''}${r.on ? ' · since ' + esc(String(r.on).replace(/^\w+, /, '')) : ''}</span></span><button class="chip m" data-a="forget" data-v="${esc(k)}">Forget</button></div>`).join('')}</div>` : '<div class="empty">Nothing remembered. Turn on “Remember this choice” when you categorise a payment.</div>'}
    </div></div></section>`;
}

/* ---------- 3.9 Help and feedback ---------- */
function helpView() {
  const faqs = [
    ['Why didn\'t a payment show up?', 'I only read SMS from banks and UPI apps. Cash and some card payments need adding yourself, by voice, typing or a bill photo.', true],
    ['Why do you ask what a payment was for?', 'Only when the payee name doesn’t say what it was, usually payments to people. At most 3 a day, and “Ask later” saves nothing.'],
    ['What do you read from my SMS?', 'Only bank and UPI payment messages: amount, payee, method and time. Never OTPs, offers or chats.'],
    ['How do limits and warnings work?', 'One overall limit, plus optional category limits that can be daily, weekly or monthly. You get a nudge at 80%.'],
    ['How do I delete my data?', 'Settings → Delete all data removes everything from this phone. You’ll be asked to confirm first.'],
  ];
  const h = ui.help || {};
  return `<section class="view">${navbar('Help and feedback')}<div class="scroll pad"><div class="stack" style="gap:12px;padding-bottom:16px">
    <form class="callout accent" data-form="helpask" autocomplete="off" style="align-items:center"><span class="tile"><span style="font-weight:500">?</span></span><span class="grow"><span class="title" style="display:block">Ask me how anything works</span><input id="help-q" name="q" class="help-in" placeholder="“Why did you ask about Rajesh?”" value="${esc(h.q || '')}" aria-label="Ask how the app works"></span><button type="button" class="mini-fab big" data-a="helpvoice" aria-label="Ask out loud">${ic('mic', '', 18)}</button></form>
    ${h.busy ? '<div class="card"><span class="typing"><i></i><i></i><i></i></span></div>' : h.a ? `<div class="card t1" style="font-size:14px;line-height:21px" id="help-a">${esc(h.a)}</div>` : ''}
    <span class="eyebrow sec">Common questions</span>
    <div class="card tight">${faqs.map(([q, a, open]) => `<details class="faq" ${open ? 'open' : ''}><summary><span>${esc(q)}</span>${ic('chevD', 'chev')}</summary><p>${esc(a)}${open ? `<br><button class="link" data-a="go" data-v="add" style="margin-top:8px;font-size:13px">Add an expense ›</button>` : ''}</p></details>`).join('')}</div>
    <span class="eyebrow sec">Tell us</span>
    <div class="card tight">${navRow('sheet', 'feedback:A number looks wrong', 'flag', 'A number looks wrong', 'Point to it and I\'ll recheck', '')}${navRow('sheet', 'feedback:Report a problem', 'bug', 'Report a problem', '', '')}${navRow('sheet', 'feedback:Suggest something', 'idea', 'Suggest something', '', '')}</div>
    <div class="small center" style="margin-top:6px">Version 1.0 · Privacy policy · Terms</div>
    </div></div></section>`;
}

/* ============================================================ OVERLAYS */
function overlays() {
  let h = '';
  if (ui.drawer) h += `<div class="scrim" data-a="closedrawer"></div>${drawerHTML()}`;
  if (ui.sheet) h += `<div class="scrim" data-a="closesheet"></div><div class="sheet" role="dialog" aria-modal="true">${sheetHTML()}</div>`;
  return h;
}
function drawerHTML() {
  const st = E.limitStatus(S, now(), null); const n = needs().length; const r = r0();
  const firstCat = Object.keys(S.limits.cats)[0]; const cs = firstCat ? E.limitStatus(S, now(), firstCat) : null;
  const last = S.history[S.history.length - 1];
  const items = [
    ['home', 'home', 'Home', 'Ask anything'],
    ['txns', 'list', 'Transactions', `${E.inRange(S, r.month).length} this month${n ? ` · <span class="ta">${n} need a category</span>` : ''}`],
    ['insights', 'bars', 'Spending insights', 'Where your money went'],
    ['limits', 'limit', 'Limits', cs ? `${esc(catLabel(firstCat))}: ${f(Math.max(0, cs.left))} left` : st ? `${f(Math.max(0, st.left))} left this month` : 'Not set yet'],
    ['asked', 'clock', 'Recently asked', last ? esc(last.q) : 'Nothing yet'],
  ];
  const row = ([route, i, t, s]) => `<button class="nav-item ${ui.route === route ? 'cur' : ''}" data-a="${route === 'home' ? 'navhome' : 'go'}" data-v="${route}"><span class="nav-ic">${ic(i)}</span><span class="grow"><span class="medium" style="display:block">${t}</span><span class="small" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s}</span></span>${ui.route === route ? '' : ic('chevR', 'chev')}</button>`;
  return `<nav class="drawer" aria-label="Menu"><div class="row pad" style="padding-bottom:14px;padding-top:6px">${mark(44)}<div class="grow"><div class="medium" style="font-size:16px">${esc(S.name || 'You')}</div><div class="small">${st ? `Overall limit · ${f(Math.max(0, st.left))} left` : 'No overall limit yet'}</div></div><button class="iconbtn" data-a="closedrawer" aria-label="Close menu">${ic('close')}</button></div>
    <div class="stack" style="gap:2px;padding:0 14px">${items.map(row).join('')}
    <div class="sep" style="margin:10px 0"></div>
    ${[['settings', 'shield', 'Settings and privacy', `SMS access ${S.smsOn ? 'on' : 'off'} · ${LANG_NAME[S.lang]}`], ['help', 'help', 'Help and feedback', 'FAQs, report a problem']].map(row).join('')}</div>
    <div class="grow"></div><div class="row small pad" style="gap:6px">${ic('lock', '', 14)}Your data stays on this phone</div></nav>`;
}
const sheetHead = (left, right) => `<div class="handle"></div><div class="sh-head pad"><span class="small t2">${left}</span>${right || ''}</div>`;
const closeLink = (l = 'Close') => `<button class="link" data-a="closesheet">${l}</button>`;
function sheetHTML() {
  const sh = ui.sheet;
  switch (sh.type) {
    case 'clarify': return clarifySheet(sh);
    case 'confirmed': return confirmedSheet(sh);
    case 'attach': return `${sheetHead('', closeLink())}<div class="sh-body pad">${attachChoices()}</div>`;
    case 'catpick': { const t = tx(sh.id); if (!t) return ''; return `${sheetHead('Change category', closeLink())}<div class="sh-body pad"><h2 class="h3">${f(t.amount)} to ${esc(t.payee)}</h2>${E.CATS.map((c) => `<div class="stack" style="gap:8px"><span class="eyebrow">${esc(catLabel(c.id))}</span><div class="chips">${c.subs.map((s) => `<button class="chip m ${t.cat === c.id && t.sub === s ? 'sel' : ''}" data-a="pickcat" data-v="${c.id}|${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`).join('')}</div>`; }
    case 'period': return `${sheetHead('Limit period', closeLink())}<div class="sh-body pad">${[['monthly', 'Monthly', 'Default · resets on the 1st'], ['weekly', 'Weekly', 'Monday to Sunday'], ['daily', 'Daily', 'Resets at midnight']].map(([k, l, s]) => `<button class="lang ${ui.limDraft && ui.limDraft.period === k ? 'sel' : ''}" data-a="setperiod" data-v="${k}"><span class="grow"><b class="medium" style="display:block">${l}</b><span class="small">${s}</span></span><span class="radio">${ui.limDraft && ui.limDraft.period === k ? ic('check', '', 12) : ''}</span></button>`).join('')}</div>`;
    case 'limcat': return `${sheetHead('Category limit', closeLink())}<div class="sh-body pad">${E.CAT_IDS.filter((c) => c !== 'Shared').map((c) => `<button class="lang ${ui.param === c ? 'sel' : ''}" data-a="limcatpick" data-v="${c}"><span class="tile soft">${ic(CAT_IC[c])}</span><span class="grow"><b class="medium" style="display:block">${esc(catLabel(c))}</b><span class="small">${S.limits.cats[c] ? 'Limit set · ' + f(S.limits.cats[c].amount) + ' ' + perWordOf(S.limits.cats[c].period) : 'No limit yet'}</span></span><span class="radio">${ui.param === c ? ic('check', '', 12) : ''}</span></button>`).join('')}</div>`;
    case 'lang': return `${sheetHead('Language', closeLink('Done'))}<div class="sh-body pad"><div class="small">The language you speak to me in. I always answer in the language you ask in, and the app stays in English.</div>${langOptions()}</div>`;
    case 'voice': return `${sheetHead('Voice', closeLink('Done'))}<div class="sh-body pad">${voiceOptions()}<div class="small">Aria is the female voice and Kabir the male voice. They use the voices on this device.</div></div>`;
    case 'history': return `${sheetHead('Question history', closeLink())}<div class="sh-body pad"><h2 class="h3">Kept on this phone for 30 days</h2><div class="body">${S.history.length} question${S.history.length === 1 ? '' : 's'} saved.</div><button class="btn secondary" data-a="go" data-v="asked">See recently asked</button><button class="btn danger" data-a="clearhistory">Clear history</button></div>`;
    case 'micinfo': return `${sheetHead('Microphone', closeLink())}<div class="sh-body pad"><h2 class="h3">Only while you tap the mic</h2><div class="body">I listen only after you tap the mic and stop as soon as you finish. Nothing is recorded in the background.</div><div class="small">${V.canListen && !V.micBlocked ? 'The microphone is available here.' : "The microphone isn't available in this view, so type your questions."}</div></div>`;
    case 'txnmenu': { const t = tx(sh.id); if (!t) return ''; return `${sheetHead(esc(t.payee), closeLink())}<div class="sh-body pad" style="gap:4px"><div class="card tight">
      <button class="lrow" data-a="txnsplit" data-v="${esc(t.id)}"><span class="ic">${ic('users')}</span><span class="grow ttl">Split this payment</span>${ic('chevR', 'chev')}</button>
      <button class="lrow" data-a="txnlent" data-v="${esc(t.id)}"><span class="ic">${ic('compare')}</span><span class="grow ttl">Mark as money lent</span>${ic('chevR', 'chev')}</button>
      ${t.sms.length ? `<button class="lrow" data-a="sheet" data-v="showsms" data-p="${esc(t.id)}"><span class="ic">${ic('sms')}</span><span class="grow ttl">See the original SMS</span>${ic('chevR', 'chev')}</button>` : ''}
      ${!/sms/i.test(t.source) ? `<button class="lrow danger" data-a="dodeltxn" data-v="${esc(t.id)}"><span class="ic">${ic('trash')}</span><span class="grow ttl">Delete payment</span></button>` : ''}</div></div>`; }
    case 'split': { const t = tx(sh.id); if (!t) return ''; return `${sheetHead('Split this payment', closeLink())}<div class="sh-body pad"><h2 class="h3">${f(t.amount)} to ${esc(t.payee)}</h2><div class="small">How many people, including you?</div><div class="chips">${[2, 3, 4, 5, 6].map((p) => `<button class="chip m ${(t.people || 2) === p && t.kind === 'split' ? 'sel' : ''}" data-a="dosplit" data-v="${esc(t.id)}|${p}">${p}</button>`).join('')}</div><div class="small">Only your share counts as spending.</div></div>`; }
    case 'showsms': { const t = tx(sh.id); if (!t) return ''; return `${sheetHead('Bank SMS', closeLink())}<div class="sh-body pad">${t.sms.map((m) => `<div class="stack" style="gap:6px"><span class="eyebrow">${esc(m.sender)} · ${whenShort(t.ts)}</span><div class="sms-bubble">${esc(m.body)}</div></div>`).join('')}<div class="cover">${ic('lock')}<span>Read from a bank SMS on this phone. OTPs and chats are never read.</span></div></div>`; }
    case 'simulate': return `${sheetHead('Prototype tools', closeLink())}<div class="sh-body pad"><h2 class="h3">Simulate a payment SMS</h2><div class="small">Pretend one of these just arrived on the phone.</div>${E.sampleIncoming(now()).map((s, i) => `<button class="callout" data-a="simulate" data-v="${i}"><span class="tile soft">${ic('sms')}</span><span class="grow"><span class="title" style="display:block">${esc(s.label)}</span><span class="sub mono">${esc(s.body.slice(0, 60))}…</span></span></button>`).join('')}</div>`;
    case 'paste': return `${sheetHead('Prototype tools', closeLink())}<form class="sh-body pad" data-form="paste"><h2 class="h3">Paste a bank or UPI SMS</h2><div class="input box"><input id="paste-sender" name="sender" placeholder="Sender, e.g. VM-HDFCBK (optional)" value="${esc(sh.sender || '')}"></div><textarea class="ta" id="paste-body" name="body" placeholder="Rs.250.00 debited from A/c XX1234 via UPI to …">${esc(sh.body || '')}</textarea><button class="btn secondary" type="submit">Read it</button>${sh.result ? pasteResult(sh.result) : ''}</form>`;
    case 'widget': return `${sheetHead('Home-screen widget', closeLink())}<div class="sh-body pad">${widgetPreview()}<button class="btn primary" data-a="voice">Try the mic</button></div>`;
    case 'delete': return `${sheetHead('Delete all data', closeLink('Cancel'))}<form class="sh-body pad" data-form="delete"><h2 class="h3">Delete everything from this phone?</h2><div class="body">Removes your settings, remembered choices on this phone and question history, then starts again from the welcome screen. Type DELETE to confirm.</div><div class="input"><input id="delete-confirm" name="confirm" placeholder="DELETE" autocapitalize="characters"></div><button class="btn danger" type="submit">Delete all data</button></form>`;
    case 'feedback': return `${sheetHead('Help and feedback', closeLink('Cancel'))}<form class="sh-body pad" data-form="feedback"><h2 class="h3">${esc(sh.title || 'Report a problem')}</h2><textarea class="ta" id="feedback-text" name="text" placeholder="${sh.title === 'Suggest something' ? 'What would make this better?' : 'What happened? Which answer or screen?'}"></textarea><button class="btn primary" type="submit">Send</button></form>`;
    default: return '';
  }
}
function widgetPreview() {
  const r = r0(); const fl = Object.keys(S.limits.cats)[0]; const fs = fl ? E.limitStatus(S, now(), fl) : null; const st = E.limitStatus(S, now(), null);
  const n = needs(); const t = n[0]; const sug = t ? (t.suggestion || E.suggestFor(t, S)) : null;
  const main = fs || st;
  return `<div class="widget-screen"><div class="small t2" data-clock="widgetday">${widgetDay()}</div>
    ${main ? `<div class="w-card row" style="gap:16px"><div class="ring">${ringSvg(main.pct, 92, 10)}<div class="lbl"><b class="num" style="font-size:16px">${main.pct}%</b></div></div><div class="grow stack" style="gap:2px"><span class="eyebrow" style="font-size:10px">${fs ? esc(catLabel(fl)) + ' limit' : 'Overall limit'}</span><span class="h3 num">${f(Math.max(0, main.left))} left</span><span class="small">of ${f(main.limit)} · ${main.daysLeft} days</span>${fs && st ? `<span class="badge" style="align-self:flex-start;margin-top:4px">Month: ${f(Math.max(0, st.left))} left</span>` : ''}</div><button class="fab" style="width:46px;height:46px" data-a="voice" aria-label="Ask">${ic('mic', '', 20)}</button></div>` : ''}
    ${t ? `<div class="w-card stack" style="gap:10px"><div class="row" style="gap:6px">${mark(18)}<span class="eyebrow ta" style="font-size:10px">1 of ${n.length} · needs a category</span></div><div class="medium">${f(t.amount)} to ${esc(t.payee)}. What was it for?</div><div class="row" style="gap:8px"><button class="chip m" data-a="bannerpick" data-v="${esc(t.id)}|${sug.cat}|${esc(sug.sub)}">${esc(sug.sub)}</button><button class="chip m" data-a="clarify" data-v="${esc(t.id)}">More</button></div></div>` : ''}
    <div class="small">Spent today: <b class="num t1">${f(E.sum(E.inRange(S, r.today)))}</b></div></div>`;
}
function pasteResult(r) {
  if (r.ignored) return `<div class="card soft small t1">${ic('shield', '', 16)} ${{ otp: 'This is an OTP. I never read or store these.', promo: 'This looks like an offer, not a payment. Ignored.', reminder: 'This is a reminder or bill notice, not a payment yet. Ignored.', notxn: 'I couldn’t find a payment in this message.' }[r.ignored]}</div>`;
  return `<div class="card stack" style="gap:6px"><div class="eyebrow ta">What I read</div>${[['Amount', f(r.amount, { dec: true })], ['Direction', r.dir === 'debit' ? 'Money out' : 'Money in'], ['Paid to', r.payee || 'Not stated'], ['Method', r.method], ['Bank', r.bank || '—'], ['UPI ref', r.upiRef || '—']].map(([a, b]) => `<div class="row" style="justify-content:space-between"><span class="small">${a}</span><span class="num">${esc(b)}</span></div>`).join('')}
    ${r.dir === 'debit' ? '<button class="btn primary s" type="button" data-a="pasteadd">Add this payment</button>' : '<div class="small">Money in isn’t spending, so it isn’t added.</div>'}</div>`;
}
/* 4.1 Clarification sheet */
function mapCustom(text) {
  const s = ' ' + String(text).toLowerCase() + ' ';
  if (/\b(lent|lend|udhaar|udhar|loan to)\b/.test(s)) return { kind: 'lent', label: 'Money lent · not spending' };
  if (/\b(self|own account|my account|transfer)\b/.test(s)) return { kind: 'self', label: 'Own transfer · not spending' };
  if (/\b(split|share|friends|dutch)\b/.test(s)) return { cat: 'Shared', sub: 'Split with friends' };
  const mm = E.merchantMatch(text, S.merchants); if (mm) return mm;
  const a = E.answer(S, 'add 1 on ' + text, now()); if (a.kind === 'add' && a.draft.cat) return { cat: a.draft.cat, sub: a.draft.sub || E.defaultSub(a.draft.cat) };
  for (const c of E.CATS) for (const sub of c.subs) if (s.includes(' ' + sub.toLowerCase().split(' ')[0] + ' ')) return { cat: c.id, sub };
  if (/\b(rent|bill|electricity|wifi|recharge)\b/.test(s)) return { cat: /rent/.test(s) ? 'Household' : 'Bills', sub: /rent/.test(s) ? 'Rent' : 'Mobile recharge' };
  if (/\b(medicine|doctor|dawai)\b/.test(s)) return { cat: 'Health', sub: 'Medicines' };
  return null;
}
function clarifySheet(sh) {
  const t = tx(sh.queue[sh.i]); if (!t) return '';
  const sug = t.suggestion || E.suggestFor(t, S);
  const base = [{ sub: 'Snacks & meals', cat: 'Food' }, { sub: 'Groceries', cat: 'Household' }, { sub: 'Auto or cab', cat: 'Travel' }, { sub: 'Split with friends', cat: 'Shared' }];
  const opts = base.some((o) => o.sub === sug.sub) ? base : [{ sub: sug.sub, cat: sug.cat }, ...base.slice(0, 3)];
  const custom = sh.custom ? mapCustom(sh.custom) : null;
  const ch = custom || sh.choice;
  const isSplit = ch && ch.cat === 'Shared';
  const can = !!ch;
  return `${sheetHead(`${sh.i + 1} of ${sh.queue.length}`, '<button class="link" data-a="asklater">Ask later</button>')}<div class="sh-body pad">
    <div class="row"><span class="avatar">${initial(t.payee)}</span><div><div class="medium" style="font-size:16px">${f(t.amount)} to ${esc(t.payee)}</div><div class="small">${esc([t.method, whenShort(t.ts), t.bank].filter(Boolean).join(' · '))}</div></div></div>
    <h2 class="h2" style="font-weight:400">What was this for?</h2>
    <div class="opts">${opts.map((o) => `<button class="opt ${!sh.custom && sh.choice && sh.choice.sub === o.sub ? 'sel' : ''}" data-a="choose" data-v="${o.cat}|${esc(o.sub)}"><b>${esc(o.sub)}</b><span>${esc(catLabel(o.cat))}${o.sub === sug.sub ? ' · <span class="sg">Suggested</span>' : ''}</span></button>`).join('')}</div>
    <div class="input"><input id="clarify-custom" data-input="custom" value="${esc(sh.custom || '')}" placeholder="Something else? Type or say it" aria-label="Something else"><button class="mini-fab" data-a="voice" aria-label="Say it">${ic('mic', '', 14)}</button></div>
    ${sh.custom ? `<div class="small ${custom ? 'ta' : ''}" id="custom-map">${custom ? 'Will save as ' + esc(custom.label || `${catLabel(custom.cat)} · ${custom.sub}`) : 'Try a category, like “chai” or “rent”'}</div>` : ''}
    ${isSplit ? `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="small grow">Split between</span>${[2, 3, 4, 5].map((p) => `<button class="chip m ${sh.people === p ? 'sel' : ''}" data-a="people" data-v="${p}">${p}</button>`).join('')}</div>` : ''}
    <div class="row" style="align-items:flex-start"><div class="grow"><div class="medium" style="font-size:14px">Remember this choice</div><div class="small">${sh.remember ? `You turned this on. Similar payments to ${esc(t.payee)} will use ${esc(ch && ch.sub ? ch.sub : 'this category')}.` : `Off until you turn it on. Then similar payments to ${esc(t.payee)} use this category.`}</div></div><label class="switch"><input type="checkbox" id="clarify-remember" data-a="clremember" ${sh.remember ? 'checked' : ''} aria-label="Remember this choice"><span></span></label></div>
    <button class="btn primary" data-a="clsave" ${can ? '' : 'disabled'}>${can ? 'Save' : 'Save category'}</button></div>`;
}
/* 4.2 Confirmation */
function confirmedSheet(sh) {
  const t = tx(sh.id); if (!t) return '';
  const cid = E.catOf(t); const hasCat = !!S.limits.cats[cid];
  const lim = counts(t) ? (hasCat ? E.limitStatus(S, now(), cid) : S.limits.overall ? E.limitStatus(S, now(), null) : null) : null;
  const left = needs().length;
  const more = sh.queue.some((id) => { const x = tx(id); return x && x.catStatus === 'needs'; });
  const title = t.kind === 'lent' ? 'Saved as money lent' : t.kind === 'self' ? 'Saved as own transfer' : `Saved as ${t.kind === 'split' ? 'Split with friends' : t.sub}`;
  return `${sheetHead('', '<button class="link" data-a="undo">Undo</button>')}<div class="sh-body pad">
    <div class="row" style="gap:14px"><span class="check-circle">${ic('check', '', 22)}</span><div><div class="medium" style="font-size:16px">${esc(title)}</div><div class="small">${f(t.amount)} to ${esc(t.payee)}${counts(t) ? ' · ' + esc(catLabel(cid)) : ' · not spending'}</div></div></div>
    ${lim ? `<div class="card stack" style="gap:10px"><div class="row"><span class="eyebrow grow">${hasCat ? esc(catLabel(cid)) + ' limit' : 'Overall limit'}</span><span class="badge">−${f(E.spendOf(t))}</span></div><div class="row" style="align-items:baseline;gap:8px"><span class="h2 num">${f(Math.max(0, lim.left))} left</span><span class="small">of ${f(lim.limit)} ${periodThis(lim.period)}</span></div><div class="bar"><i style="width:${Math.min(100, lim.pct)}%"></i></div><div class="small">${left ? `${left} payment${left > 1 ? 's' : ''} still need${left > 1 ? '' : 's'} a category` : 'Every payment has a category'}</div></div>` : `<div class="card small">${left ? `${left} payment${left > 1 ? 's' : ''} still need${left > 1 ? '' : 's'} a category` : 'Every payment has a category'}</div>`}
    ${sh.remembered ? `<div class="row small" style="gap:8px">${ic('shield', 'ta', 16)}I'll use this for similar payments to ${esc(t.payee)}.</div>` : ''}
    ${more ? '<button class="btn primary" data-a="nextq">Next</button>' : '<button class="btn primary" data-a="closesheet">Done</button>'}</div>`;
}

/* ---------- toast + banner (5.2 notification style) ---------- */
let toastTimer = null, bannerTimer = null;
function toastHTML() { return ui.toast ? `<div class="toast" role="status"><span>${esc(ui.toast.text)}</span>${ui.toast.undo ? '<button data-a="undo">Undo</button>' : ui.toast.retry ? '<button data-a="retrysync">Retry</button>' : ''}</div>` : ''; }
function toast(text, opts = {}) {
  ui.toast = { text, undo: !!opts.undo, retry: !!opts.retry };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = null; const el = $('.toast'); if (el) el.remove(); }, opts.ms || (opts.undo ? 4000 : 2600));
  const sc = $('.screen'); if (sc) { const old = $('.toast'); if (old) old.remove(); sc.insertAdjacentHTML('beforeend', toastHTML()); }
}
function bannerHTML() {
  const b = ui.banner; if (!b) return '';
  const head = `<div class="row" style="gap:8px">${mark(22)}<span class="small t1 medium">Assistant</span><span class="small grow">· now</span><button class="round" style="width:26px;height:26px;border:0;background:transparent" data-a="closebanner" aria-label="Dismiss">${ic('close', '', 14)}</button></div>`;
  if (b.kind === 'ask') {
    const t = tx(b.id); if (!t) return '';
    const sug = t.suggestion || E.suggestFor(t, S);
    const opts = [sug, ...[{ sub: 'Split with friends', cat: 'Shared' }, { sub: 'Money lent', kind: 'lent' }].filter((o) => o.sub !== sug.sub)].slice(0, 2);
    return `<div class="banner" role="alert">${head}<div class="medium" style="font-size:15px">${f(t.amount)} to ${esc(t.payee)}. What was it for?</div><div class="small" style="margin-top:-6px">${whenShort(t.ts)} · ${esc(t.method)}</div><div class="row" style="gap:8px;flex-wrap:wrap">${opts.map((o) => `<button class="chip m" data-a="bannerpick" data-v="${esc(t.id)}|${o.kind ? 'lent' : o.cat}|${esc(o.sub)}">${esc(o.sub)}</button>`).join('')}<button class="mini-fab" data-a="clarify" data-v="${esc(t.id)}" aria-label="More options">${ic('mic', '', 14)}</button></div></div>`;
  }
  return `<div class="banner" role="status">${head}<div class="medium" style="font-size:15px">${esc(b.title)}</div>${b.text ? `<div class="small t2" style="margin-top:-6px">${esc(b.text)}</div>` : ''}${(b.actions || []).length ? `<div class="row" style="gap:8px;flex-wrap:wrap">${b.actions.map((x) => `<button class="chip m ${x.primary ? 'soft' : ''}" data-a="${x.a}" data-v="${esc(x.v || '')}" data-p="${esc(x.p || '')}">${esc(x.label)}</button>`).join('')}</div>` : ''}</div>`;
}
function banner(b, ms = 12000) { ui.banner = b; render({ noRefocus: true }); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { ui.banner = null; const el = $('.banner'); if (el) el.remove(); }, ms); }

/* ============================================================ DATA FLOW
   Payments come from the user's SMS. In this prototype the SMS inbox is a
   backend Google Sheet the app reads and writes; the user never sees it. */
function markExistingAlerts() {
  const r = r0();
  for (const [id, lim] of [[null, S.limits.overall], ...Object.entries(S.limits.cats)]) {
    if (!lim) continue; const st = E.limitStatus(S, now(), id);
    if (st.spent >= st.warnAt) S.alerted[`${id || 'overall'}:${E.periodRange(r, st.period)[0]}:${lim.amount}`] = true;
  }
}
function checkLimits(t) {
  const r = r0(); const ids = []; if (t && S.limits.cats[E.catOf(t)]) ids.push(E.catOf(t)); ids.push(null);
  for (const id of ids) {
    const lim = id ? S.limits.cats[id] : S.limits.overall; if (!lim) continue;
    const st = E.limitStatus(S, now(), id); const k = `${id || 'overall'}:${E.periodRange(r, st.period)[0]}:${lim.amount}`;
    if (st.spent >= st.warnAt && !S.alerted[k]) {
      S.alerted[k] = true; save();
      if (!S.alertsOn || !S.notifOn) continue;
      const what = id ? `${catLabel(id)} is` : 'Spending is';
      banner({ kind: 'info', title: st.over ? `${what} over the limit` : `Today ${f(E.sum(E.inRange(S, r.today)))} · ${f(Math.max(0, st.left))} left ${periodThis(st.period)}`, text: st.over ? `${f(-st.left)} over ${f(st.limit)} ${periodThis(st.period)}.` : `${what.replace(' is', '')} at ${st.pct}%, warning at ${st.alertPct}%`, actions: [{ label: 'See limits', a: 'go', v: 'limits', primary: true }] });
      return;
    }
  }
}
function afterLoad(res, source) { markExistingAlerts(); S.loadedAt = now(); S.dataSource = source; save(); return res; }
async function loadSheet() {
  ui.loading = true; ui.loadErr = null; render({ noRefocus: true });
  try {
    const d = await Sync.read();
    const res = E.loadFromSheet(S, d);
    ui.loading = false;
    return afterLoad(res, 'sheet');
  } catch (e) { ui.loading = false; ui.loadErr = e; return { error: e }; }
}
async function importFile(file) {
  try {
    const d = await Sync.readFile(file);
    Sync.mode = 'offline';
    const res = E.loadFromSheet(S, d);
    if (!res.rows) throw new Error('No payments found in that file.');
    return afterLoad(res, 'file');
  } catch (e) { return { error: { code: 'file', message: e.message || String(e) } }; }
}
function askedToday() { const d = E.time.dayStart(now()); if (!S.asked || S.asked.day !== d) S.asked = { day: d, count: 0 }; return S.asked; }
function processSms(sender, body) {
  if (!S.smsOn) { toast('Transaction SMS is off · turn it on in Settings'); return null; }
  const ps = E.parseSms(sender, body, now());
  if (ps.ignored) { toast(ps.ignored === 'otp' ? 'OTP message · never read or stored' : ps.ignored === 'promo' ? 'Offer message · ignored' : 'Not a payment · ignored'); return null; }
  if (ps.dir !== 'debit') { toast(`${f(ps.amount)} received · money in isn't spending`); return null; }
  const dup = E.findDuplicate(S, { ...ps, ts: now() });
  if (dup) { toast(`Already recorded · ${f(dup.amount)} to ${dup.payee}`); return null; }
  const t = E.newTxn(S, { ts: now(), amount: ps.amount, payee: ps.payee || 'Unknown payee', method: ps.method, bank: ps.bank || '', source: 'SMS', sms: body, sender, auto: true });
  Sync.appendTxn(S, t).then(() => save());
  save();
  const a = askedToday();
  if (t.catStatus === 'needs' && S.notifOn && a.count < (S.questionsPerDay || 3)) { a.count++; save(); banner({ kind: 'ask', id: t.id }, 20000); }
  else if (t.catStatus === 'needs') banner({ kind: 'info', title: `${f(t.amount)} to ${t.payee}`, text: 'Saved for later · still needs a category', actions: [{ label: 'Categorise', a: 'clarify', v: t.id, primary: true }] }, 8000);
  else banner({ kind: 'info', title: `${f(t.amount)} to ${t.payee}`, text: `${catLabel(t.cat)} · ${t.sub}${t.catStatus === 'remembered' ? ' · your remembered choice' : ''}`, actions: [{ label: 'Change', a: 'go', v: 'txn', p: t.id }] }, 7000);
  setTimeout(() => checkLimits(t), 7200);
  return t;
}
let undoFn = null;
function snapshotTxn(t) { return { manualCat: t.manualCat, manualSub: t.manualSub, share: t.share, people: t.people, notSpend: t.notSpend, note: t.note }; }
function applyCategory(t, cat, sub, remember, people) {
  const before = snapshotTxn(t); const hadRule = S.rules[E.payeeKey(t.payee)];
  const rule = E.setCategory(S, t, cat, sub, remember, { people });
  Sync.saveAnswer(S, t);
  if (rule) Sync.remember(S, rule);
  save();
  undoFn = () => {
    Object.assign(t, before); E.categorize(t, S); Sync.saveAnswer(S, t);
    if (rule && !hadRule) { const k = E.payeeKey(t.payee); delete S.rules[k]; Sync.forget(S, k); }
    save();
  };
  checkLimits(t);
  return rule;
}
function applyKind(t, kind, people) {
  const before = snapshotTxn(t);
  E.setKind(S, t, kind, { people }); Sync.saveAnswer(S, t); save();
  undoFn = () => { Object.assign(t, before); E.categorize(t, S); Sync.saveAnswer(S, t); save(); };
}
function addPayment(fields) {
  const t = E.newTxn(S, { source: 'Manual', method: 'Cash', ...fields });
  Sync.appendTxn(S, t).then(() => save());
  save();
  undoFn = () => { S.txns = S.txns.filter((x) => x !== t); Sync.deleteTxn(S, t); save(); };
  setTimeout(() => checkLimits(t), 300);
  return t;
}
function openClarify(id) {
  let queue = needs().map((t) => t.id);
  if (id) { if (!tx(id)) return; queue = [id, ...queue.filter((x) => x !== id)]; }
  if (!queue.length) { toast('Every payment has a category'); return; }
  ui.drawer = false; ui.banner = null; ui.voice = null;
  ui.sheet = { type: 'clarify', queue, i: 0, choice: null, remember: false, people: null, custom: '' };
  render({ noRefocus: true });
}
function setLimit(catId, amount, period, alertPct = 80) {
  if (catId) { S.limits.cats[catId] = { amount, period, alertPct }; Sync.saveCatLimits(S); }
  else { S.limits.overall = { amount, period: period || 'monthly', alertPct }; Sync.saveSettings(S); }
  const r = r0(); const st = E.limitStatus(S, now(), catId);
  if (st.spent >= st.warnAt) S.alerted[`${catId || 'overall'}:${E.periodRange(r, st.period)[0]}:${amount}`] = true;
  save();
}
function exportCSV() {
  const head = ['Date', 'Time', 'Amount', 'Paid to', 'Method', 'Bank', 'Source', 'Category', 'Sub-category', 'Counts as', 'Your share', 'Note'];
  const q = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = S.txns.slice().sort((a, b) => a.ts - b.ts).map((t) => { const p = E.time.p(t.ts); return [`${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`, E.clock(t.ts), (t.amount / 100).toFixed(2), t.payee, t.method, t.bank, t.source, t.kind === 'self' ? '' : catLabel(E.catOf(t)), t.sub || '', t.kind, t.share ? (t.share / 100).toFixed(2) : '', t.note]; });
  return [head, ...rows].map((r) => r.map(q).join(',')).join('\n');
}
async function doExport() {
  const data = exportCSV(); const filename = 'payments.csv';
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename, data }); toast('Export ready · payments.csv'); return; }
  } catch (e) { if (e && e.code === 'rejected') { toast('Export cancelled'); return; } }
  try { const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Export ready · payments.csv'); }
  catch (e) { toast('Export isn’t available here'); }
}
async function readBillFile(file) {
  const reader = new FileReader();
  const upload = await new Promise((res) => { reader.onload = () => res(reader.result); reader.onerror = () => res(''); reader.readAsDataURL(file); });
  ui.sheet = null;
  ui.bill = { upload, reading: V.canReadImages() };
  if (ui.route !== 'bill') go('bill'); else render();
  if (!V.canReadImages()) { ui.bill.error = "I can't read photos in this view. Type the total and store."; ui.bill.editing = true; render(); return; }
  try {
    const j = await V.readBill(file, now());
    if (!j || !j.total || j.kind === 'other') throw new Error('no total');
    let ts = now();
    if (j.date && /^\d{4}-\d{2}-\d{2}$/.test(j.date)) { const [y, m, d] = j.date.split('-').map(Number); const [h, mi] = String(j.time || '12:00').split(':').map(Number); ts = E.time.at(y, m - 1, d, h || 12, mi || 0); if (ts > now()) ts = now(); }
    const cat = E.CAT_IDS.includes(j.category) ? j.category : (E.merchantMatch(j.store || '', S.merchants) || {}).cat || null;
    ui.bill = { upload, bill: { store: j.store || 'Shop', amount: Math.round(Number(j.total) * 100), ts, items: Array.isArray(j.items) ? j.items.filter((x) => x && x.name).slice(0, 12) : [], cat, sub: cat ? E.defaultSub(cat) : null, method: j.method || 'UPI', kind: j.kind } };
  } catch (e) {
    ui.bill = { upload, editing: true, error: "I couldn't read a total from this photo. Type it and I'll still check for a match." };
  }
  if (ui.route === 'bill') render();
}

/* ============================================================ EVENTS */
function readAddForm() { const d = ui.addDraft; if (!d) return; const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; }; const amt = g('add-amount'); if (amt != null) d.amount = amt; const p = g('add-payee'); if (p != null) d.payee = p; const n = g('add-note'); if (n != null) d.note = n; const w = g('add-when'); if (w) { const [dd, tt] = w.split('T'); const [y, m, day] = dd.split('-').map(Number); const [h, mi] = (tt || '12:00').split(':').map(Number); d.ts = E.time.at(y, m - 1, day, h, mi); } }
function readLimAmount() { const el = $('#lim-amount'); if (el && ui.limDraft) { const v = Math.round(parseFloat(el.value.replace(/[^\d.]/g, '')) * 100); if (v > 0) ui.limDraft.amount = v; } }
async function copyText(text, msg = 'Answer copied') { try { await navigator.clipboard.writeText(text); toast(msg); } catch (e) { toast('Copy isn’t available here'); } }

app.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-a]'); if (!el || !app.contains(el)) return;
  const a = el.getAttribute('data-a'); const v = el.getAttribute('data-v'); const p = el.getAttribute('data-p');
  if (el.tagName === 'BUTTON' || el.classList.contains('scrim') || el.getAttribute('role') === 'radio') ev.preventDefault();
  switch (a) {
    case 'drawer': ui.drawer = true; render({ noRefocus: true }); break;
    case 'closedrawer': ui.drawer = false; render({ noRefocus: true }); break;
    case 'navhome': home(); break;
    case 'newchat': home(true); break;
    case 'go': if (v === 'add') ui.addDraft = null; if (v === 'bill') ui.bill = null; if (v === 'catlimit' || v === 'overall') ui.limDraft = null; ui.banner = null; if (v === 'txn' && ui.route === 'txn') { ui.param = p; ui.sheet = null; render({ resetScroll: true }); } else go(v, p || null); break;
    case 'back': V.stopSpeaking(); back(); break;
    case 'sheet': {
      ui.drawer = false; ui.banner = null;
      if (v.startsWith('feedback:')) { ui.sheet = { type: 'feedback', title: v.split(':')[1] }; render({ noRefocus: true }); break; }
      if (v === 'delete') toast("You'll be asked to confirm first");
      ui.sheet = { type: v, id: p }; render({ noRefocus: true }); break;
    }
    case 'closesheet': { const ret = ui.sheet && ui.sheet.returnTo; ui.sheet = ret || null; render({ noRefocus: true }); break; }
    case 'closebanner': ui.banner = null; { const b = $('.banner'); if (b) b.remove(); } break;
    /* asking */
    case 'ask': ask(v); break;
    case 'fu': {
      if (v === 'overall') go('overall'); else if (v.startsWith('catlimit:')) { ui.limDraft = null; go('catlimit', v.split(':')[1]); } else if (v === 'limits') go('limits'); else if (v === 'categorise') openClarify(); else if (v === 'add') go('add'); else if (v === 'speak') startVoice(); else if (v.startsWith('txns:')) { ui.txFilter = v.split(':')[1]; go('txns'); }
      break;
    }
    case 'fuToggle': { const m = ui.thread[+v]; m.fuOpen = m.fuOpen === false; render({ noRefocus: true }); break; }
    case 'fab': { const inp = $('#ask-input'); if (inp && inp.value.trim()) { const q = inp.value; inp.value = ''; ask(q); } else startVoice(); break; }
    case 'voice': ui.sheet = null; startVoice(); break;
    case 'voicekbd': clearInterval(voiceTimer); V.cancelListening(); askSeq++; ui.voice = null; render({ focus: '#ask-input', noRefocus: true }); break;
    case 'voicedone': { const said = ui.voice && ui.voice.text && ui.voice.text.trim(); clearInterval(voiceTimer); V.cancelListening(); if (said) thinkVoice(said); else { ui.voice = null; render({ noRefocus: true }); toast("I didn't hear anything · try again or type"); } break; }
    case 'closevoice': closeVoice(); break;
    case 'speaktoggle': S.speak = !S.speak; if (!S.speak) { V.stopSpeaking(); ui.speakingIdx = null; toast('Stopped speaking'); } else toast('Spoken answers on'); save(); render({ noRefocus: true }); break;
    case 'replay': speakIdx(+v); break;
    case 'stopspeak': V.stopSpeaking(); ui.speakingIdx = null; render({ noRefocus: true }); toast('Stopped speaking'); break;
    case 'copy': { const m = ui.thread[+v]; copyText([spokenOf(m.a), m.a.coverage].filter(Boolean).join('\n')); break; }
    case 'share': { const m = ui.thread[+v]; const text = `${m.a.q}\n${[spokenOf(m.a), m.a.coverage].filter(Boolean).join('\n')}`; toast('Opening share options…'); if (navigator.share) { try { await navigator.share({ text }); } catch (e) { /* cancelled */ } } else copyText(text, 'Answer copied'); break; }
    /* drafts from the conversation */
    case 'draftcat': { const [i, c] = v.split('|'); const d = ui.thread[+i].a.draft; d.cat = c; d.sub = E.defaultSub(c); render({ noRefocus: true }); break; }
    case 'draftadd': { const m = ui.thread[+v]; const d = m.a.draft; const t = addPayment({ amount: d.amount, payee: d.payee, cat: d.cat, sub: d.sub, ts: d.ts, method: d.method, note: '' }); m.done = `Added ${f(t.amount)} for ${t.payee} to ${catLabel(t.cat)}.`; render({ noRefocus: true }); toast(`Added ${f(t.amount)} · ${catLabel(t.cat)}`, { undo: true }); break; }
    case 'draftedit': { const m = ui.thread[+v]; const d = m.a.draft; ui.addDraft = { amount: String(d.amount / 100), cat: d.cat, sub: d.sub, payee: d.payee, ts: d.ts, note: '', method: d.method || 'Cash', said: m.a.q }; go('add'); break; }
    case 'draftlimit': { const m = ui.thread[+v]; const d = m.a.draft; setLimit(d.catId, d.amount, d.period); m.done = `Done. ${d.catId ? catLabel(d.catId) : 'Overall'} limit is ${f(d.amount)} ${perWordOf(d.period)}. I'll warn you at 80%.`; render({ noRefocus: true }); break; }
    /* 4.1 / 4.2 */
    case 'clarify': openClarify(v || null); break;
    case 'choose': { const [c, s] = v.split('|'); ui.sheet.choice = { cat: c, sub: s }; ui.sheet.custom = ''; if (c === 'Shared' && !ui.sheet.people) ui.sheet.people = 2; render({ noRefocus: true }); break; }
    case 'people': ui.sheet.people = +v; render({ noRefocus: true }); break;
    case 'clremember': ui.sheet.remember = el.checked; render({ noRefocus: true }); break;
    case 'asklater': ui.sheet = null; render({ noRefocus: true }); toast('Saved for later · still needs a category'); break;
    case 'clsave': {
      const sh = ui.sheet; const t = tx(sh.queue[sh.i]); const ch = sh.custom ? mapCustom(sh.custom) : sh.choice; if (!ch) break;
      let rule = null;
      if (ch.kind) applyKind(t, ch.kind); else rule = applyCategory(t, ch.cat, ch.sub, sh.remember, ch.cat === 'Shared' ? (sh.people || 2) : null);
      ui.sheet = { type: 'confirmed', id: t.id, queue: sh.queue.filter((id) => id !== t.id), remembered: !!rule };
      render({ noRefocus: true }); break;
    }
    case 'nextq': { const sh = ui.sheet; const rest = sh.queue.filter((id) => { const x = tx(id); return x && x.catStatus === 'needs'; }); ui.sheet = rest.length ? { type: 'clarify', queue: rest, i: 0, choice: null, remember: false, people: null, custom: '' } : null; render({ noRefocus: true }); break; }
    case 'bannerpick': { const [id, c, s] = v.split('|'); const t = tx(id); ui.banner = null; ui.sheet = null; if (t) { if (c === 'lent') applyKind(t, 'lent'); else applyCategory(t, c, s, false, c === 'Shared' ? 2 : null); render({ noRefocus: true }); toast(`Saved · ${s}`, { undo: true }); } break; }
    case 'undo': if (undoFn) { undoFn(); undoFn = null; ui.toast = null; if (ui.sheet && ui.sheet.type === 'confirmed') { const t = tx(ui.sheet.id); ui.sheet = t ? { type: 'clarify', queue: [t.id, ...ui.sheet.queue], i: 0, choice: null, remember: false, people: null, custom: '' } : null; } render({ noRefocus: true }); toast('Undone'); } break;
    /* 3.2 transaction details */
    case 'catpick': ui.sheet = { type: 'catpick', id: v }; render({ noRefocus: true }); break;
    case 'pickcat': {
      const [c, s] = v.split('|'); const sh = ui.sheet;
      const t = tx(sh.id); const keep = !!S.rules[E.payeeKey(t.payee)];
      applyCategory(t, c, s, keep, c === 'Shared' ? (t.people || 2) : null); ui.sheet = null; render({ noRefocus: true }); toast(`Changed to ${s}`, { undo: true }); break;
    }
    case 'remember': {
      const t = tx(v); const k = E.payeeKey(t.payee);
      if (el.checked) { const rule = { payee: t.payee, cat: t.cat, sub: t.sub, on: E.dateLong(now()) }; S.rules[k] = rule; if (!t.manualCat) { t.manualCat = t.cat; t.manualSub = t.sub; Sync.saveAnswer(S, t); } Sync.remember(S, rule); }
      else { delete S.rules[k]; Sync.forget(S, k); }
      S.txns.forEach((x) => E.categorize(x, S)); save(); render({ noRefocus: true }); break;
    }
    case 'notspend': { const t = tx(v); applyKind(t, el.checked ? 'self' : 'spend'); render({ noRefocus: true }); break; }
    case 'txnsplit': ui.sheet = { type: 'split', id: v }; render({ noRefocus: true }); break;
    case 'dosplit': { const [id, n] = v.split('|'); const t = tx(id); applyKind(t, 'split', +n); ui.sheet = null; render({ noRefocus: true }); toast(`Split ${n} ways · your share ${f(t.share)}`, { undo: true }); break; }
    case 'txnlent': { const t = tx(v); applyKind(t, 'lent'); ui.sheet = null; render({ noRefocus: true }); toast('Money lent · not spending', { undo: true }); break; }
    case 'notemic': { const inp = document.getElementById('note-' + v); if (inp) inp.focus(); toast('Keyboard opens to add a note'); break; }
    case 'dodeltxn': { const t = tx(v); if (t) { S.txns = S.txns.filter((x) => x !== t); Sync.deleteTxn(S, t); save(); } ui.sheet = null; back(); toast('Payment deleted'); break; }
    case 'search': ui.searchOpen = !ui.searchOpen; if (!ui.searchOpen) ui.txSearch = ''; render({ focus: ui.searchOpen ? '#tx-search' : null, noRefocus: true }); break;
    case 'txfilter': ui.txFilter = v; render({ noRefocus: true }); if (v !== 'all') toast('Filter applied'); break;
    case 'txfilterGo': ui.txFilter = v; go('txns'); break;
    /* 3.3a add expense */
    case 'addcat': { readAddForm(); const [c, s] = v.split('|'); ui.addDraft.cat = c; ui.addDraft.sub = s; render({ noRefocus: true }); break; }
    case 'addmore': readAddForm(); ui.addDraft.more = !ui.addDraft.more; render({ noRefocus: true }); break;
    case 'addmethod': readAddForm(); ui.addDraft.method = v; render({ noRefocus: true }); break;
    case 'addsave': {
      readAddForm(); const d = ui.addDraft; const amount = Math.round(parseFloat(String(d.amount).replace(/,/g, '')) * 100);
      if (!(amount > 0)) { toast('Enter an amount'); const i = $('#add-amount'); if (i) i.focus(); break; }
      if (d.ts > now() + 60000) { toast('That time is in the future'); break; }
      const t = addPayment({ amount, cat: d.cat, sub: d.sub, payee: d.payee.trim() || d.sub || catLabel(d.cat), ts: d.ts, method: d.method, note: d.note });
      ui.addDraft = null; back(); toast(`Added ${f(t.amount)} · ${catLabel(t.cat)}`, { undo: true }); break;
    }
    /* 3.3b bill */
    case 'scanbill': ui.sheet = { type: 'attach' }; ui.banner = null; render({ noRefocus: true }); break;
    case 'billreset': ui.bill = null; render(); break;
    case 'billedit': ui.bill.editing = true; render(); break;
    case 'billattach': {
      const t = tx(v); const bill = ui.bill.bill; t.bill = { store: bill.store, items: bill.items, amount: bill.amount };
      t.note = (t.note ? t.note + ' · ' : '') + `Bill: ${bill.store}${bill.items && bill.items.length ? ` (${bill.items.length} items)` : ''}`;
      if (t.catStatus === 'needs' && bill.cat) E.setCategory(S, t, bill.cat, bill.sub || E.defaultSub(bill.cat), false);
      Sync.saveAnswer(S, t); save(); ui.bill = null; ui.route = 'txn'; ui.param = t.id; render({ resetScroll: true }); toast('Bill attached · not counted twice'); break;
    }
    case 'billseparate': {
      const bill = ui.bill.bill; const t = addPayment({ amount: bill.amount, payee: bill.store, cat: bill.cat || null, sub: bill.sub, ts: bill.ts, method: bill.method || 'Cash', source: 'Bill', note: bill.items && bill.items.length ? bill.items.map((x) => x.name).slice(0, 4).join(', ') : '', auto: !bill.cat });
      ui.bill = null; ui.route = 'txn'; ui.param = t.id; render({ resetScroll: true }); toast(`Added ${f(t.amount)}`, { undo: true }); break;
    }
    /* 3.5 / 3.6 limits */
    case 'limpick': ui.limDraft.amount = +v; ui.limConfirm = false; render({ noRefocus: true }); break;
    case 'setperiod': { const d = ui.limDraft; d.period = v; const ex = d.catId ? S.limits.cats[d.catId] : S.limits.overall; d.amount = ex && ex.period === v ? ex.amount : E.suggestLimit(S, now(), d.catId, v).suggested; ui.sheet = null; render({ noRefocus: true }); break; }
    case 'limcatpick': ui.sheet = null; ui.limDraft = null; ui.param = v; render({ noRefocus: true }); break;
    case 'limconfirmno': ui.limConfirm = false; render({ focus: '#lim-amount', noRefocus: true }); break;
    case 'limsave': {
      readLimAmount(); const d = ui.limDraft;
      const st = previewLimit(d.catId, d.amount, d.period, d.alertPct);
      if (st.spent > d.amount && v !== 'force') { ui.limConfirm = true; render({ noRefocus: true }); break; }
      setLimit(d.catId, d.amount, d.period, d.alertPct); ui.limDraft = null; ui.limConfirm = false;
      const msg = `${d.catId ? catLabel(d.catId) : 'Overall'} limit · ${f(d.amount)} ${perWordOf(d.period)}`;
      if (ui.stack.length && ui.stack[ui.stack.length - 1][0] === 'limits') back(); else { ui.stack = [['home', null]]; ui.route = 'limits'; ui.param = null; render({ noRefocus: true }); }
      toast(msg); break;
    }
    case 'dellimit': { const d = ui.limDraft; if (d.catId) { delete S.limits.cats[d.catId]; Sync.saveCatLimits(S); } else { S.limits.overall = null; Sync.saveSettings(S); } save(); ui.limDraft = null; back(); toast('Limit removed'); break; }
    /* settings */
    case 'toggle': {
      if (v === 'dark') { S.theme = el.checked ? 'dark' : 'light'; applyTheme(); }
      else S[v] = el.checked;
      if (v === 'speak' && !S.speak) V.stopSpeaking();
      if (v === 'notifOn' && S.notifOn && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* frame may block */ } }
      if (v === 'smsOn' && S.smsOn && !S.txns.length && Sync.mode === 'live') { await loadSheet(); }
      save(); render({ noRefocus: true }); break;
    }
    case 'setlang': S.lang = v; save(); if (S.onboarded) Sync.saveSettings(S); render({ noRefocus: true }); break;
    case 'cyclelang': S.lang = S.lang === 'en' ? 'hi' : S.lang === 'hi' ? 'hinglish' : 'en'; save(); toast(`Language · ${LANG_NAME[S.lang]}`); break;
    case 'setvoice': S.voice = v; save(); render({ noRefocus: true }); break;
    case 'previewvoice': S.voice = v; save(); render({ noRefocus: true }); if (!V.canSpeak) toast('This browser can’t speak'); else V.speak(VOICE_SAMPLE[S.lang] || VOICE_SAMPLE.en, { lang: S.lang, gender: v }); break;
    case 'forget': { const r = S.rules[v]; delete S.rules[v]; Sync.forget(S, v); S.txns.forEach((x) => E.categorize(x, S)); save(); render(); toast(`Forgot ${r ? r.payee : 'choice'}`); break; }
    case 'clearhistory': S.history = []; save(); ui.sheet = null; render(); toast('Question history cleared'); break;
    case 'export': doExport(); break;
    case 'reload': { const res = await loadSheet(); render(); if (res.error) toast("Couldn't read your SMS · try again later"); break; }
    case 'retrysync': ui.toast = null; Sync.retry(); break;
    case 'simulate': { const s = E.sampleIncoming(now())[+v]; ui.sheet = null; render({ noRefocus: true }); setTimeout(() => processSms(s.sender, s.body), 500); break; }
    case 'pasteadd': { const sh = ui.sheet; ui.sheet = null; render({ noRefocus: true }); processSms(sh.sender || 'SMS', sh.body); break; }
    case 'replayob': ui.ob = 0; S.onboarded = false; save(); render(); break;
    case 'helpvoice': { const i = $('#help-q'); if (i) i.focus(); break; }
    /* onboarding */
    case 'obnext': ui.ob++; render({ resetScroll: true, noRefocus: true }); break;
    case 'obback': ui.ob = Math.max(0, ui.ob - 1); render({ noRefocus: true }); break;
    case 'obmic': { const r = await V.requestMic(); S.micOn = r; save(); if (r !== 'granted') toast("Microphone isn't available here · you can type"); ui.ob++; render({ noRefocus: true }); break; }
    case 'obnotif': {
      S.notifOn = v === '1';
      if (S.notifOn && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { /* frame may block it */ } }
      save(); ui.ob++; render({ noRefocus: true }); break;
    }
    case 'obsms': {
      if (Sync.mode === 'unknown') await Sync.init();
      if (Sync.mode !== 'live' && window.EMBEDDED_SMS) {
        // Standalone copy: the payment SMS travel inside the file; changes stay on this device.
        ui.obBusy = true; render({ noRefocus: true });
        await new Promise((r) => setTimeout(r, 700));
        Sync.mode = 'offline'; const d = window.EMBEDDED_SMS;
        const keepLang = S.lang; const res = E.loadFromSheet(S, d); S.lang = keepLang; afterLoad(res, 'device');
        ui.obBusy = false; S.smsOn = true; save(); ui.ob = 5; render({ noRefocus: true }); break;
      }
      if (Sync.mode !== 'live') { render({ noRefocus: true }); break; }
      const chosenLang = S.lang; ui.obBusy = true; ui.obErr = null; render({ noRefocus: true });
      const res = await loadSheet(); ui.obBusy = false;
      if (res.error) { ui.obErr = "Couldn't read your SMS just now. Try again."; render({ noRefocus: true }); break; }
      if (S.lang !== chosenLang) { S.lang = chosenLang; Sync.saveSettings(S); }
      S.smsOn = true; save(); ui.ob = 5; render({ noRefocus: true }); break;
    }
    case 'obskip': S.smsOn = false; ui.obErr = null; ui.ob = 5; render({ noRefocus: true }); break;
    case 'obdone': S.onboarded = true; save(); ui.ob = 0; ui.thread = []; if (v === 'limits') { ui.stack = [['home', null]]; ui.route = 'limits'; render(); } else home(); break;
    default: break;
  }
});
app.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.getAttribute && ev.target.getAttribute('role') === 'radio' && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); ev.target.click(); }
  if (ev.key === 'Escape') { if (ui.voice) closeVoice(); else if (ui.sheet) { ui.sheet = null; render(); } else if (ui.drawer) { ui.drawer = false; render(); } }
});
app.addEventListener('submit', async (ev) => {
  ev.preventDefault(); const form = ev.target; const kind = form.getAttribute('data-form');
  const val = (n) => (form.elements[n] ? form.elements[n].value : '');
  if (kind === 'ask') { const q = val('q'); form.elements.q.value = ''; ask(q); }
  else if (kind === 'paste') { const body = val('body').trim(); if (!body) return; ui.sheet = { type: 'paste', sender: val('sender'), body, result: E.parseSms(val('sender'), body, now()) }; render({ noRefocus: true }); }
  else if (kind === 'billform') { const amount = Math.round(parseFloat(val('amount').replace(/[^\d.]/g, '')) * 100); const store = val('store').trim() || 'Shop'; if (!(amount > 0)) { toast('Enter the total'); return; } const cat = (E.merchantMatch(store, S.merchants) || {}).cat || null; ui.bill.bill = { store, amount, ts: (ui.bill.bill && ui.bill.bill.ts) || now(), items: (ui.bill.bill && ui.bill.bill.items) || [], cat, sub: cat ? E.defaultSub(cat) : null }; ui.bill.editing = false; ui.bill.typed = true; render(); }
  else if (kind === 'delete') { if (val('confirm').trim().toUpperCase() !== 'DELETE') { toast('Type DELETE to confirm'); return; } try { localStorage.removeItem(KEY); } catch (e) { /* blocked */ } const keepTheme = S.theme; S = E.newState(); S.alertsOn = true; S.widgetOn = true; S.lang = 'hinglish'; S.theme = keepTheme; ui.thread = []; ui.sheet = null; ui.ob = 0; ui.stack = []; ui.route = 'home'; render(); toast('Deleted from this phone'); }
  else if (kind === 'feedback') { const title = ui.sheet && ui.sheet.title; ui.sheet = null; render(); toast(title === 'Suggest something' ? 'Thanks for the idea!' : 'Thanks, we’ll look into it'); }
  else if (kind === 'helpask') {
    const q = val('q').trim(); if (!q) return;
    ui.help = { q, busy: true }; render({ noRefocus: true });
    try { const a = await V.askHelp(q, (txt) => { ui.help = { q, busy: false, a: txt }; const c = $('#help-a'); if (c) c.textContent = txt; else render({ noRefocus: true }); }); ui.help = { q, a }; }
    catch (e) { ui.help = { q, a: 'I can’t answer that here right now. Try the common questions below.' }; }
    render({ noRefocus: true });
  }
});
app.addEventListener('input', (ev) => {
  const el = ev.target; const k = el.getAttribute('data-input');
  if (k === 'ask') { const fab = $('#fab'); if (fab) { const has = !!el.value.trim(); fab.innerHTML = ic(has ? 'send' : 'mic'); fab.setAttribute('aria-label', has ? 'Send' : 'Speak'); } }
  else if (k === 'txsearch') { ui.txSearch = el.value; render(); }
  else if (k === 'asksearch') { ui.askSearch = el.value; render(); }
  else if (k === 'custom') { ui.sheet.custom = el.value; if (el.value) ui.sheet.choice = null; render(); }
  else if (k === 'when') { readAddForm(); const w = el.closest('.when-wrap'); if (w) w.querySelector('.when-text').textContent = whenShort(ui.addDraft.ts); }
  else if (k === 'add' && el.id === 'add-amount') { el.style.width = (Math.max(1, el.value.length) * 0.6 + 0.1) + 'em'; }
  else if (k === 'lim') {
    el.style.width = (Math.max(1, el.value.length) * 0.58 + 0.1) + 'em';
    readLimAmount(); const d = ui.limDraft;
    const pv = $('#lim-preview'); const st = previewLimit(d.catId, d.amount, d.period, d.alertPct); if (pv) pv.innerHTML = limPreview(st, d, d.catId);
    const w = $('#lim-warn'); if (w) w.textContent = `When ${d.catId ? catLabel(d.catId).toLowerCase() : 'spending'} reaches ${f(st.warnAt)}`;
    document.querySelectorAll('.pick').forEach((b) => b.classList.toggle('sel', +b.getAttribute('data-v') === d.amount));
  }
});
app.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.hasAttribute('data-note')) { const t = tx(el.getAttribute('data-note')); if (t && t.note !== el.value) { t.note = el.value.trim(); Sync.saveAnswer(S, t); save(); toast('Note saved'); } }
  const fk = el.getAttribute('data-file'); if (!fk || !el.files || !el.files[0]) return;
  const file = el.files[0];
  if (fk === 'bill') readBillFile(file);
  else if (fk === 'import') {
    ui.obBusy = true; render({ noRefocus: true });
    const res = await importFile(file); ui.obBusy = false;
    if (res.error) { ui.obErr = res.error.message; render({ noRefocus: true }); return; }
    S.smsOn = true; save();
    if (!S.onboarded) { ui.ob = 5; ui.obErr = null; }
    render({ noRefocus: true });
  }
});

/* save failures → a quiet retry toast (the store itself stays invisible) */
let lastFailed = 0;
Sync.on(() => { if (Sync.failed.length > lastFailed) toast("Couldn't save that change · kept on this phone", { retry: true, ms: 8000 }); lastFailed = Sync.failed.length; });

/* Android compact canvas (412 × 917, as in Figma): on a desktop the phone keeps that size and scales to fit */
function fitPhone() {
  const wide = window.innerWidth >= 640;
  const pad = wide ? 24 : 0;
  const s = Math.min(wide ? 1 : 10, (window.innerHeight - pad) / 917, (window.innerWidth - pad) / 412);
  const ph = document.querySelector('.phone'); if (ph) ph.classList.toggle('edge', !wide);
  document.documentElement.style.setProperty('--fit', String(Math.round(s * 1000) / 1000));
}
/* ============================================================ BOOT */
async function boot() {
  applyTheme();
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  fitPhone(); window.addEventListener('resize', fitPhone); new MutationObserver(() => fitPhone()).observe(app, { childList: true });
  setTimeout(() => { ui.splash = 'out'; render({ noRefocus: true }); setTimeout(() => { ui.splash = false; render({ noRefocus: true }); }, 400); }, reduce ? 700 : 3200);
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!S.theme) render({ noRefocus: true }); }); } catch (e) { /* old browser */ } }
  render();
  await Promise.all([Sync.init(), V.initSample()]);
  if (S.dataSource === 'file') Sync.mode = 'offline';
  if (S.onboarded && S.smsOn) {
    if (Sync.mode === 'live') await loadSheet();
    else S.txns.forEach((t) => E.categorize(t, S));
  }
  render();
  setInterval(tickClock, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tickClock(); });
}
boot();
