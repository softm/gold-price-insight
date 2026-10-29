const test = require('node:test');
const assert = require('node:assert/strict');
const ads = require('../dist/ads-core.js');
const config = { enabled: true, provider: 'adfit', adfitUnit: 'DAN-TestUnit123', width: 320, height: 100 };
const prod = { protocol: 'https:', hostname: 'goldsignal.designboard.net', userAgent: 'Mozilla/5.0', search: '' };
test('only valid production placement enables AdFit', () => {
  assert.equal(ads.surface(prod, config), 'adfit');
  for (const change of [{ enabled:false }, { provider:'adsense' }, { adfitUnit:'' }, { adfitUnit:'DAN-<script>' }, { width:300 }, { height:250 }]) {
    assert.equal(ads.surface(prod, {...config, ...change}), 'off');
  }
  assert.equal(ads.surface(prod, null), 'off');
});
test('HTTP, previews and untrusted hosts never request production ads', () => {
  for (const change of [{ protocol:'http:' }, { hostname:'localhost' }, { hostname:'softm.github.io' }, { hostname:'goldsignal.designboard.net.evil.test' }, { hostname:'appassets.androidplatform.net' }]) {
    assert.equal(ads.surface({...prod,...change}, config), 'off');
  }
});
test('all released Android UAs suppress web ads', () => {
  for (const ua of ['GoldSignalAndroid/1.0.0','GoldSignalAndroid/1.0.1','GoldSignalAndroid/1.0.2 AdMobNative/1','Mozilla/5.0 (Linux; Android 16; wv)']) {
    assert.equal(ads.surface({...prod,userAgent:ua}, config), 'off');
    assert.equal(ads.surface({...prod,hostname:'localhost',search:'?ads-preview=1',userAgent:ua}, config), 'off');
  }
});
test('layout preview is local only and never a production provider', () => {
  assert.equal(ads.surface({...prod,hostname:'localhost',search:'?ads-preview=1'}, config), 'preview');
  assert.equal(ads.surface({...prod,search:'?ads-preview=1'}, {...config,enabled:false}), 'off');
});
test('consent is explicit, versioned, expiring and rejects future timestamps', () => {
  const now = 1800000000000;
  for (const choice of ['allow','deny']) assert.equal(ads.readChoice(ads.choiceRecord(choice,now),now),choice);
  for (const raw of [null,'undefined','{','true','"allow"','{}',JSON.stringify({version:1,choice:'yes',at:now}),ads.choiceRecord('allow',now+1),ads.choiceRecord('allow',now-ads.CONSENT_TTL)]) {
    assert.equal(ads.readChoice(raw,now),null);
  }
  assert.throws(() => ads.choiceRecord('yes'),TypeError);
});
