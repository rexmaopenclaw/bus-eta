// 驗證 42C + 92 同名站距離（一站多柱）
const BASE = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/kmb/routes';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function getStops(route) {
  const res = await fetch(`${BASE}/${route}.json`);
  const data = await res.json();
  return data.stops;
}

(async () => {
  const [a, b] = await Promise.all([getStops('42C'), getStops('92')]);
  const norm = (n) => n.replace(/\s*\(.*?\)\s*/g, '').trim();

  // 42C 同名站
  const bByName = new Map();
  for (const s of b) {
    const key = norm(s.name_tc);
    if (!bByName.has(key)) bByName.set(key, []);
    bByName.get(key).push(s);
  }
  let pairs = [];
  for (const sa of a) {
    const key = norm(sa.name_tc);
    const cands = (bByName.get(key) ?? []).filter((sb) => sb.stop !== sa.stop);
    for (const sb of cands) {
      pairs.push({ name: sa.name_tc, sa, sb, dist: haversine(parseFloat(sa.lat), parseFloat(sa.long), parseFloat(sb.lat), parseFloat(sb.long)) });
    }
  }
  // dedupe by sa.stop+sb.stop
  const seen = new Set();
  pairs = pairs.filter((p) => {
    const k = `${p.sa.stop}-${p.sb.stop}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  pairs.sort((x, y) => x.dist - y.dist);
  console.log('=== 42C × 92 同名但唔同 ID 嘅站 ===');
  for (const p of pairs) {
    console.log(`${p.name}  | ${p.sa.stop} ↔ ${p.sb.stop}  | ${p.dist.toFixed(0)}m`);
  }

  // 順便睇下碧海樓 42C/92 各自方向
  console.log('\n=== 42C 碧海樓所有柱 ===');
  for (const s of a.filter((s) => s.name_tc.includes('碧海樓'))) {
    console.log(`${s.stop} bound=${s.bound} seq=${s.seq} ${s.lat},${s.long}`);
  }
  console.log('\n=== 92 碧海樓所有柱 ===');
  for (const s of b.filter((s) => s.name_tc.includes('碧海樓'))) {
    console.log(`${s.stop} bound=${s.bound} seq=${s.seq} ${s.lat},${s.long}`);
  }
})();
