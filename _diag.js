(async () => {
  // 1. index.html → bundle path
  const html = await (await fetch('https://bus-eta.rexmaopenclaw.workers.dev/')).text();
  const m = html.match(/src="([^"]+\.js)"/g) || [];
  console.log('JS refs:', JSON.stringify(m));
  const b = html.match(/_expo\/static\/js\/web\/[^"]+\.js/);
  console.log('bundle path:', b && b[0]);

  // 2. fetch bundle, grep key logic
  if (b) {
    const js = await (await fetch('https://bus-eta.rexmaopenclaw.workers.dev/' + b[0])).text();
    console.log('bundle size:', js.length);
    // find ctb bound flip
    const flipIdx = js.indexOf("s.dir==='O'");
    console.log('flip code found at:', flipIdx);
    if (flipIdx >= 0) console.log('flip snippet:', js.slice(flipIdx - 120, flipIdx + 160));
    // find ETA base
    const etaIdx = js.indexOf('citybus-nwfb');
    console.log('eta base found at:', etaIdx);
    if (etaIdx >= 0) console.log('eta snippet:', js.slice(etaIdx - 100, etaIdx + 80));
    // find STATIC_BASE
    const stIdx = js.indexOf('api/proxy/ctb');
    console.log('static base at:', stIdx);
  }

  // 3. sw.js cache name
  const sw = await (await fetch('https://bus-eta.rexmaopenclaw.workers.dev/sw.js')).text();
  console.log('---sw.js---');
  console.log(sw.slice(0, 1500));
})().catch((e) => console.log('ERR', e.message));
