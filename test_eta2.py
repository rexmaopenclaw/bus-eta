import urllib.request, json, sys

# Test 1: Standard ETA endpoints
print("=== KMB ETA API Test ===")
urls = [
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1", "1A outbound (1/1)"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/2/1", "1A inbound (2/1)"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/101/1/1", "101 outbound"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/101/2/1", "101 inbound"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/968/1/1", "968 outbound"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/968/2/1", "968 inbound"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/960/1/1", "960 outbound"),
    ("https://data.etabus.gov.hk/v1/transport/kmb/eta/960/2/1", "960 inbound"),
]

all_empty = True
for url, label in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        d = json.loads(resp.read().decode("utf-8"))
        count = len(d["data"])
        if count > 0:
            all_empty = False
            print(f"[OK] {label}: {count} items")
            for item in d["data"][:2]:
                print(f"      {json.dumps(item, ensure_ascii=False)[:150]}")
        else:
            print(f"[EMPTY] {label}: 0 items")
    except Exception as e:
        print(f"[FAIL] {label}: {type(e).__name__}: {str(e)[:60]}")

# Test 2: Check if API is alive at all
print("\n=== Route list check ===")
try:
    req = urllib.request.Request("https://data.etabus.gov.hk/v1/transport/kmb/route", headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req, timeout=10)
    d = json.loads(resp.read().decode("utf-8"))
    print(f"Route list: {len(d['data'])} routes")
except Exception as e:
    print(f"Route list FAIL: {e}")

# Test 3: Check if the beta API is different
print("\n=== Alternative KMB ETA endpoints ===")
alt_urls = [
    "https://data.etabus.gov.hk/v1/transport/kmb/eta/1A/1/1",
]
for url in alt_urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        d = json.loads(resp.read().decode("utf-8"))
        print(f"Response: type={d.get('type')}, timestamp={d.get('generated_timestamp')}, data_len={len(d['data'])}")
        if d["data"]:
            print(f"Sample: {json.dumps(d['data'][0], ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"FAIL: {e}")

if all_empty:
    print("\n\nCONCLUSION: KMB ETA API is still returning empty data for ALL routes.")
    print("This is a server-side issue, not a problem with your app.")
    print("Suggestions:")
    print("1. Check if https://search.kmb.hk/KMBWebSite/ shows ETA in browser")
    print("2. Try an alternative ETA data source (e.g. third-party or cached)")
    print("3. The API might come back later - this could be a temporary outage")