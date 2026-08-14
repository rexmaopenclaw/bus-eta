const fs = require('fs');
const sw = fs.readFileSync('dist/sw.js', 'utf8');
console.log('dist sw.js line1:', sw.split('\n')[0]);
console.log('has buseta-v2:', sw.includes('buseta-v2'));
console.log('has passthrough:', sw.includes('passthrough'));
const html = fs.readFileSync('dist/index.html', 'utf8');
const m = html.match(/_expo\/static\/js\/web\/[^"]+\.js/);
console.log('bundle:', m && m[0]);
