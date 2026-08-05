import urllib.request, json

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

# Print the first item's complete structure (avoid cp950)
item = d['data'][0]
print('=== First item fields ===')
for k, v in item.items():
    if isinstance(v, str):
        print('  ' + k + ': ' + v.encode('ascii', errors='replace').decode('ascii'))
    else:
        print('  ' + k + ': ' + str(v))

print()
# Check if there's a stop field
print('=== Check for stop field ===')
for item in d['data'][:10]:
    print('  seq=' + str(item.get('seq')) + ' stop=' + str(item.get('stop', 'MISSING')))

# Print all keys
print()
print('=== All keys in response ===')
print(list(d['data'][0].keys()))

# Compare with old eta format
# Check if old eta endpoint has a different structure when bound is O/I
print()
print('=== Old eta endpoint with O/I ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/O/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d2 = json.loads(resp.read().decode('utf-8'))
print('type:', d2.get('type'))
print('data:', d2.get('data'))
print('data type:', type(d2.get('data')).__name__)
if isinstance(d2.get('data'), list):
    print('data len:', len(d2['data']))
    if len(d2['data']) > 0:
        print('keys:', list(d2['data'][0].keys()))
print()

# The route-eta endpoint doesn't have a 'stop' field, but the old eta endpoint does
# The route-eta endpoint returns: {co, route, dir, service_type, seq, dest_tc, dest_sc, dest_en, eta_seq, eta, rmk_tc, rmk_sc, rmk_en, data_timestamp}
# The old eta endpoint returns: {seq, route, stop, dest_tc, dest_en, eta_timestamp, remark_tc, remark_en, data_timestamp}
# They are completely different endpoints!

# The route-eta endpoint is a per-route, per-bound endpoint with ALL stops
# The old eta endpoint is a per-route, per-bound, per-service_type endpoint with stop-level ETA

# The solution: the route-eta endpoint won't work directly because it doesn't have 'stop' field
# We need to find another way...

print('=== Alternative: stop-based ETA ===')
# Try the stop-based ETA endpoint
url = 'https://data.etabus.gov.hk/v1/transport/kmb/stop/8D804CFD9C7B9042/eta'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req, timeout=10)
    d3 = json.loads(resp.read().decode('utf-8'))
    print('stop eta:', d3.get('code', 'OK'), d3.get('message', ''))
except Exception as e:
    print('stop eta error:', str(e)[:100])

# Maybe the stop endpoint needs a different format
url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req, timeout=10)
    d4 = json.loads(resp.read().decode('utf-8'))
    print('old eta fields:', list(d4['data'][0].keys()) if d4['data'] else 'empty')
except Exception as e:
    print('old eta error:', str(e)[:100])