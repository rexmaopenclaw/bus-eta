(async () => {
  // 模擬 SW 行為：cross-origin ETA 請求會被 cache-first 攔截
  // 檢查 ETA API response 有冇 cache-control headers
  const res = await fetch('https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/003340/930X');
  console.log('ETA status:', res.status);
  console.log('cache-control:', res.headers.get('cache-control'));
  console.log('etag:', res.headers.get('etag'));
  console.log('last-modified:', res.headers.get('last-modified'));
  const j = await res.json();
  console.log('data count:', (j.data || []).length);

  // SW 對 cross-origin 係 cache-first：第一次 cache 咗乜，以後永遠用 cache
  // 如果凌晨（頭班車前）fetch 過，cache 咗空 data → 永遠「冇 data」
  console.log('\n=== SW 問題 ===');
  console.log('sw.js cross-origin 處理: cache-first');
  console.log('ETA URL 冇 query string → cache key 固定 → 永遠 hit 舊 cache');
  console.log('凌晨 cache 空 response → 而家 06:48 都仲係空 → 「冇 data」');

  // KMB 一樣
  const res2 = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/eta/003340/930X/1');
  console.log('\nKMB eta status:', res2.status, 'cache-control:', res2.headers.get('cache-control'));
})().catch((e) => console.log('ERR', e.message));
