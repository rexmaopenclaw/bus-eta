import urllib.request, json
import sys

# Print full response structure of route-eta endpoint
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1A/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))

print('type:', d.get('type'))
print('version:', d.get('version'))
print('timestamp:', d.get('generated_timestamp'))
print('data count:', len(d.get('data', [])))
print()

# Print the first item's complete structure
item = d['data'][0]
print('=== First item fields ===')
for k, v in item.items():
    print(f'  {k}: {v}')

print()
# Print 3 items to see pattern
print('=== First 3 items ===')
for item in d['data'][:3]:
    print(json.dumps(item, indent=2, ensure_ascii=False)[:300])

print()
# Check if there's a stop field anywhere
print('=== Check for stop field ===')
for item in d['data'][:10]:
    print(f'  seq={item.get("seq")} stop={item.get("stop", "MISSING")}')

# Compare with old eta endpoint format
# Old: { seq, route, stop, dest_tc, dest_en, eta_timestamp, remark_tc, remark_en, data_timestamp, bus_remark_tc?, bus_remark_en? }
# New: { co, route, dir, service_type, seq, dest_tc, dest_sc, dest_en, eta_seq, eta, rmk_tc, rmk_sc, rmk_en, data_timestamp }
print()
print('=== Field mapping ===')
print('Old -> New')
print('stop -> MISSING (not in route-eta response!)')
print('eta_timestamp -> eta')
print('remark_tc -> rmk_tc')
print('remark_en -> rmk_en')
print('bound -> dir (O/I)')
print()
print('New fields: co, eta_seq, service_type, dest_sc, rmk_sc')