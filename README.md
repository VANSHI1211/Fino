# Fino : Your money, on call

Fino is a voice-first personal finance assistant prototype. It reads your bank and UPI payment SMS, asks you only about the unclear ones, and answers your money questions out loud in English, Hindi or Hinglish, whichever you speak.

**Live app:** https://vanshi1211.github.io/Fino/

## Try it
1. Open the live link in **Chrome** (Android phone or laptop).
2. Watch the splash, go through onboarding, and allow the **microphone** when asked.
3. Tap the mic and ask, for example:
   - "How much did I spend this month?"
   - "Is hafte food pe kitna kharcha hua?"
   - "Can I afford ₹2,000 on shopping?"
   - "Set my limit of ₹5,000 on shopping"

The app replies in the language you used.

## Install it as an app
- **Android (Chrome):** open the link, tap **⋮ → Install app** (or **Add to Home screen**).
- **Laptop (Chrome):** click the install icon at the right of the address bar.

## What's inside
| Path | What it is |
|---|---|
| `index.html` | The complete app in one file (with the demo SMS data built in) |
| `manifest.json`, `sw.js`, `icon-*.png` | Makes it installable as an app |
| `source/` | Source code: `engine.js` (all money calculations), `voice.js` (listening and speaking), `app1.js` / `app2.js` (screens), `styles.css` / `figma.css` (design from Figma), `build.py` (builds the single file) |

To rebuild after changing the source: `cd source && python3 build.py`, then copy `source/Fino.html` to `index.html` and add the manifest lines from the current `index.html`.

## Notes
- Voice recognition uses Chrome's built-in speech service, so it needs an internet connection. Safari on iPhone is not supported for voice.
- The payment data is demo data that ships with the app.

Made by a team of two as a design project.
