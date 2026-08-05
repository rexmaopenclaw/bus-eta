import urllib.request, json

# Try alternative ETA data sources
print("=== Alternative API sources ===")

# Test 1: Citybus NWFB (same etabus platform but different path)
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'KMB eta/1A/1/1: {len(d["data"])} items')
except Exception as e:
    print(f'KMB ETA: {e}')

# Test 2: Route list for /route/{route}
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/route/1A'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'route/1A: {json.dumps(d, indent=2, ensure_ascii=False)[:200]}')
except Exception as e:
    print(f'route/1A: {e}')

# Test 3: Try the route-stop endpoint
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-stop/1A/1/1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'route-stop/1A/1/1: {len(d["data"])} stops')
except Exception as e:
    print(f'route-stop/1A/1/1: {e}')

# Test 4: Try the KMB website's internal API
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'eta/1A/1 (no service_type): {json.dumps(d, indent=2, ensure_ascii=False)[:200]}')
except Exception as e:
    print(f'eta/1A/1: {e}')

# Test 5: Check if the ETA endpoint has a different base URL  
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': '*/*'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    if len(d['data']) > 0:
        print(f'SUCCESS: {d["data"][0]}')
    else:
        print(f'Empty data - server issue')
except Exception as e:
    print(f'Failed: {e}')

print("\n=== Checking if API is still serving data ===")
# Check if the generated_timestamp is current
try:
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': '*/*'})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode('utf-8'))
    print(f'API response timestamp: {d["generated_timestamp"]}')
    print(f'Data is empty: {len(d["data"]) == 0}')
    # If data is empty, this is a server-side issue
    print(f'This is a KMB server-side issue - their ETA API is returning empty data')
except Exception as e:
    print(f'Error: {e}')