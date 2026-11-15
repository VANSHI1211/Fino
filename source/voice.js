/* Money Assistant · voice
   Listening: the browser's speech recognition (needs microphone access).
   Speaking: the browser's speech synthesis, Female or Male voice.
   Understanding: Claude (the `sample` capability) turns what was said into an
   intent; the app's own code then calculates every number. */
(function (root) {
  'use strict';
  const E = root.Engine;
  const Rec = root.SpeechRecognition || root.webkitSpeechRecognition;
  const V = { canListen: !!Rec, micBlocked: false, canSpeak: 'speechSynthesis' in root, speaking: false, listening: false, sample: null, sampleOk: null, limits: null };
  const LANG = { en: 'en-IN', hinglish: 'en-IN', hi: 'hi-IN' };

  /* ---------- listening ---------- */
  let rec = null;
  V.listen = (opts) => {
    if (!Rec) { opts.onError && opts.onError('unsupported'); return null; }
    try { if (rec) rec.abort(); } catch (e) { /* ignore */ }
    rec = new Rec();
    // Listen in the language picked in onboarding / Settings: English (India) also follows Hinglish
    // in Roman letters; हिंदी listens for Hindi. The reply follows the language actually spoken.
    rec.lang = opts.lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = '', gotAny = false;
    rec.onstart = () => { V.listening = true; opts.onStart && opts.onStart(); };
    rec.onresult = (ev) => {
      let interim = ''; finalText = '';
      for (let i = 0; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
      gotAny = true; opts.onInterim && opts.onInterim((finalText + ' ' + interim).trim());
    };
    rec.onerror = (ev) => {
      V.listening = false;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture') V.micBlocked = true;
      opts.onError && opts.onError(ev.error || 'error');
    };
    rec.onend = () => { V.listening = false; opts.onEnd && opts.onEnd(finalText.trim(), gotAny); };
    try { rec.start(); } catch (e) { V.micBlocked = true; opts.onError && opts.onError('not-allowed'); return null; }
    return rec;
  };
  V.stopListening = () => { try { rec && rec.stop(); } catch (e) { /* ignore */ } };
  V.cancelListening = () => { try { rec && rec.abort(); } catch (e) { /* ignore */ } V.listening = false; };

  /* Ask for the microphone once (onboarding). Resolves 'granted' | 'denied' | 'unsupported'. */
  V.requestMic = () => new Promise((resolve) => {
    if (!Rec && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return resolve('unsupported');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => { s.getTracks().forEach((t) => t.stop()); V.micBlocked = false; resolve('granted'); })
        .catch(() => { V.micBlocked = true; resolve('denied'); });
    } else resolve('granted');
  });

  /* ---------- speaking ---------- */
  let voices = [];
  const loadVoices = () => { try { voices = root.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } };
  if (V.canSpeak) { loadVoices(); try { root.speechSynthesis.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ } }
  const FEMALE = /female|woman|zira|heera|veena|lekha|kalpana|neerja|swara|aditi|raveena|priya|samantha|susan|karen|tessa|moira|sangeeta|google हिन्दी|google uk english female|vani|shruti/i;
  const MALE = /\bmale\b|\bman\b|rishi|ravi|prabhat|madhur|hemant|kabir|daniel|alex|david|mark|google uk english male|fred|aaron|arjun/i;
  function pickVoice(lang, gender) {
    if (!voices.length) loadVoices();
    const code = LANG[lang] || 'en-IN';
    const base = code.split('-')[0];
    const pool = [voices.filter((v) => v.lang === code), voices.filter((v) => (v.lang || '').startsWith(base + '-IN')), voices.filter((v) => (v.lang || '').startsWith(base)), voices.filter((v) => (v.lang || '').startsWith('en'))].find((l) => l.length) || voices;
    const want = gender === 'male' ? MALE : FEMALE, avoid = gender === 'male' ? FEMALE : MALE;
    const exact = pool.find((v) => want.test(v.name) && !avoid.test(v.name));
    return { voice: exact || pool.find((v) => !avoid.test(v.name)) || pool[0] || null, exact: !!exact };
  }
  V.toSpeech = (text, lang) => {
    const word = lang === 'hi' ? 'रुपये' : lang === 'hinglish' ? 'rupaye' : 'rupees';
    return String(text || '').replace(/−₹([\d,]+)/g, (m, n) => `minus ${n.replace(/,/g, '')} ${word}`).replace(/₹([\d,]+(?:\.\d+)?)/g, (m, n) => `${n.replace(/,/g, '')} ${word}`)
      .replace(/(\d+)–(\d+)/g, '$1 to $2').replace(/·/g, ',').replace(/\s+/g, ' ').trim();
  };
  let utter = null;
  V.speak = (text, opts = {}) => {
    if (!V.canSpeak || !text) { opts.onEnd && opts.onEnd(); return; }
    V.stopSpeaking();
    const u = new SpeechSynthesisUtterance(V.toSpeech(text, opts.lang));
    const pv = pickVoice(opts.lang, opts.gender);
    if (pv.voice) u.voice = pv.voice;
    u.lang = (pv.voice && pv.voice.lang) || LANG[opts.lang] || 'en-IN';
    u.rate = opts.rate || 1; u.pitch = pv.exact ? 1 : opts.gender === 'male' ? 0.8 : 1.15;
    u.onstart = () => { V.speaking = true; opts.onStart && opts.onStart(); };
    u.onend = u.onerror = () => { if (utter === u) { V.speaking = false; opts.onEnd && opts.onEnd(); } };
    utter = u;
    try { root.speechSynthesis.speak(u); } catch (e) { V.speaking = false; opts.onEnd && opts.onEnd(); }
    // Some browsers never fire onstart when audio is blocked: treat as done after a while.
    setTimeout(() => { if (utter === u && !V.speaking) { utter = null; opts.onEnd && opts.onEnd(); } }, 2500);
  };
  V.stopSpeaking = () => { const u = utter; utter = null; try { root.speechSynthesis.cancel(); } catch (e) { /* ignore */ } if (u) V.speaking = false; };

  /* ---------- understanding (Claude) ---------- */
  V.initSample = async () => {
    try {
      if (!root.claude || typeof root.claude.use !== 'function') { V.sampleOk = false; return; }
      V.sample = await root.claude.use('sample');
      V.sampleOk = !!V.sample;
      if (V.sample) V.limits = await V.sample.limits().catch(() => null);
    } catch (e) { V.sampleOk = false; }
  };
  const INTENTS = 'spent, compare, top, biggest, unusual, limit_left, afford, add_expense, set_limit, list, recurring, needs_category, categorise, out_of_scope, unclear';
  V.understand = async (question, S, now) => {
    if (!V.sample || V.sampleOk === false) return null;
    const payees = [...new Set(S.txns.map((t) => t.payee))].slice(0, 60).join(', ');
    const prompt = `You turn one question to a personal spending app (India, rupees) into JSON. The person may speak English, Hindi or Hinglish; the text may be a speech transcript with errors.
Reply with only one JSON object:
{"intent": one of [${INTENTS}],
 "category": one of [${E.CAT_IDS.join(', ')}] or null,
 "merchant": a payee exactly as written in the list below, or null,
 "period": one of [today, yesterday, this_week, last_week, last_7_days, this_month, last_month] or a month name like "September", or null,
 "amount": number in rupees or null,
 "limit_period": daily | weekly | monthly | null,
 "note": for add_expense, what it was for in 1-3 words (e.g. "auto", "chai"), else null,
 "lang": "en" | "hi" | "hinglish" (the language the person actually spoke: "en" = English only, "hinglish" = Hindi and English mixed or Hindi written in Roman letters, "hi" = Hindi only),
 "said": the question written the way the person would type it (English in English letters, Hinglish in Roman letters, Hindi in Devanagari)}
The transcript comes from a Hindi speech recogniser, so English words may be written in Devanagari (for example "हाउ मच" is "how much"); judge the language by the words spoken, not the script.
Rules: "how much is left / can I still spend" = limit_left. "can I afford X" = afford. "I spent X on Y" / "add X for Y" = add_expense. "keep Y under X" / "set my Y limit to X" = set_limit. Investments, loans, tax, bank balance = out_of_scope. Unclear or mumbled = unclear.
Today is ${E.dateLong(now)}. Payees: ${payees}.
Question: ${JSON.stringify(String(question).slice(0, 400))}`;
    try {
      const it = await V.sample.json(prompt, { modelTier: 'quick', cache: { gcTime: 3600000 } });
      return it && typeof it === 'object' ? it : null;
    } catch (e) {
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e && e.code)) V.sampleOk = false;
      return null;
    }
  };

  V.canReadImages = () => !!(V.sample && V.limits && V.limits.images);
  V.readBill = async (file, now) => {
    if (!V.canReadImages()) throw { code: 'images_unavailable' };
    const prompt = `This image is a shop bill, a receipt, or a payment screenshot (UPI app or card) from India. Read it and reply with only one JSON object:
{"kind": "bill" | "payment_screenshot" | "other",
 "store": who was paid (shop or person name) or null,
 "total": the total amount paid in rupees as a number, or null,
 "date": "YYYY-MM-DD" or null, "time": "HH:MM" 24-hour or null,
 "method": "UPI" | "Card" | "Cash" | null,
 "items": [{"name": string, "amount": number}] (empty for a payment screenshot),
 "category": one of [${E.CAT_IDS.join(', ')}] or null}
Use only what is visible; never guess a total that is not shown. Today is ${E.dateLong(now)}.`;
    return V.sample.json(prompt, { images: file, modelTier: 'default', cache: false });
  };
  V.askHelp = async (question, onText) => {
    if (!V.sample || V.sampleOk === false) throw { code: 'unavailable' };
    const prompt = `You answer questions about how the "Money Assistant" app works, in 2-4 short sentences, in the language of the question. Facts: it reads bank and UPI payment SMS (never OTPs, offers or chats) — in this prototype those come from the person's Google Sheet. It asks "What was this for?" only for unclear payments, at most 3 times a day, and "Ask later" saves nothing. "Remember this choice" is off until the person turns it on. There is one overall monthly limit plus optional category limits (daily, weekly or monthly) with a warning at 80%. Splits count only your share; money lent and transfers between your own accounts aren't spending. Bills can be added from a photo; a bill that matches a payment is attached, not counted twice. It does not give investment, loan or tax advice. Every number is calculated by the app's own code.
Question: ${JSON.stringify(String(question).slice(0, 400))}`;
    const r = await V.sample(prompt, { modelTier: 'quick', onText: onText ? ({ text }) => onText(text) : undefined });
    return r.text;
  };

  root.Voice = V;
})(typeof window !== 'undefined' ? window : globalThis);
