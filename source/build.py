head = '''<title>Fino</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Voice-first personal finance assistant prototype that tracks your UPI and bank SMS payments, asks only about unclear ones, and answers out loud.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&family=Manrope:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500&display=swap">
'''
css = open('styles.css').read() + '\n' + open('figma.css').read()
js = [open(f).read() for f in ('engine.js', 'sync.js', 'voice.js')]
import base64, json
assets = {}
for k, fn in [('orbStageLight','orb-stage-light'),('orbStageDark','orb-stage-dark'),('micStageLight','mic-stage-light'),('micStageDark','mic-stage-dark'),('ribbon','ribbon'),('ribbonCalm','ribbon-calm'),('waveAria','wave-aria'),('waveKabir','wave-kabir')]:
    assets[k] = 'data:image/webp;base64,' + base64.b64encode(open('assets/' + fn + '.webp','rb').read()).decode()
js.append('window.ASSETS = ' + json.dumps(assets) + ';')
app = '(function () {\n' + open('app1.js').read() + '\n' + open('app2.js').read() + '\n})();'
open('app.bundle.js', 'w').write(app)
html = head + '<style>\n' + css + '\n</style>\n<div id="app"></div>\n<noscript>This prototype needs JavaScript.</noscript>\n' + ''.join('<script>\n' + j + '\n</script>\n' for j in js) + '<script>\n' + app + '\n</script>\n'
# Standalone copy for opening straight from the zip: the SMS data rides along inside the file.
fx = json.load(open('test/sheet-fixture.json'))
emb = {'transactions': fx['Transactions'][1:], 'remembered': fx['Remembered'][1:], 'merchants': fx['Merchants'][1:], 'settings': fx['Settings'], 'catLimits': []}
standalone = html.replace('<script>\n(function () {', '<script>window.EMBEDDED_SMS = ' + json.dumps(emb, ensure_ascii=False) + ';</script>\n<script>\n(function () {', 1)
doc = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + standalone.replace('<div id="app">', '</head><body><div id="app">', 1) + '</body></html>\n'
open('Fino.html', 'w').write(doc)
# The published page carries the same SMS data, so it works for anyone with the link exactly like the file.
open('money-on-call.html', 'w').write(standalone)
print(len(standalone))
