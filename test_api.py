import urllib.request, json, sys

routes = ['1A','2','5','5C','101','104','106','112','948','960','961','968','969']
print("=== Route-based ETA ===")
for route in routes:
    for bound in ['1', '2']:
        try:
            url = f'https://data.etabus.gov.hk/v1/transport/kmb/eta/{route}/{bound}/1'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req, timeout=10)
            d = json.loads(resp.read().decode('utf-8'))
            print(f'{route}/{bound}/1: {len(d["data"])} items')
        except Exception as e:
            print(f'{route}/{bound}/1: ERROR - {type(e).__name__}: {str(e)[:50]}')

# Also try the /route endpoint
print("\n=== Route list check ===")
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/route'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'Total routes: {len(d["data"])}')
    # Check 1A
    r = [x for x in d['data'] if x['route'] == '1A']
    print(f'1A routes: {len(r)}')
    for x in r:
        print(f'  - {x}')
except Exception as e:
    print(f'ERROR: {e}')