import urllib.request, json, sys

# Test the stop-based ETA endpoint
# First get a stop ID from route 1A
url = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/kmb/routes/1A.json'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    stops = data.get('stops', [])
    # Pick first stop for each direction
    for s in stops[:2]:
        stop_id = s['stop']
        route = '1A'
        service_type = '1'
        url2 = f'https://data.etabus.gov.hk/v1/transport/kmb/eta/{stop_id}/{route}/{service_type}'
        req2 = urllib.request.Request(url2)
        try:
            with urllib.request.urlopen(req2, timeout=10) as r2:
                d2 = json.loads(r2.read())
                count = len(d2['data'])
                print(f'eta/{stop_id}/{route}/{service_type}: {count} items')
                if count > 0:
                    print(json.dumps(d2['data'][0], indent=2, ensure_ascii=False))
                else:
                    # Try route-eta for comparison
                    bound = '1' if s.get('dir') == 'O' else '2'
                    url3 = f'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1A/{bound}'
                    req3 = urllib.request.Request(url3)
                    with urllib.request.urlopen(req3, timeout=10) as r3:
                        d3 = json.loads(r3.read())
                        print(f'route-eta/1A/{bound}: {len(d3["data"])} items (for comparison)')
                        if d3['data']:
                            print(json.dumps(d3['data'][0], indent=2, ensure_ascii=False))
        except Exception as e:
            print(f'Error: {e}')
            sys.stdout.flush()