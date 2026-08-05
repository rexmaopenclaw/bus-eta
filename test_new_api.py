import urllib.request, json

# Test 1: route-eta endpoint (known working)
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1A/1'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    print(f'route-eta/1A/1: {len(data["data"])} items')
    if data['data']:
        print(json.dumps(data['data'][0], indent=2, ensure_ascii=False))