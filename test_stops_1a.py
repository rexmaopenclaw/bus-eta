import urllib.request, json

# Get route 1A stops from winstonma to find stop IDs
url = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/kmb/routes/1A.json'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    stops = data.get('stops', [])
    print(f'Total stops: {len(stops)}')
    for s in stops[:10]:
        print(f"  stop={s['stop']} name={s['name_tc']} seq={s['seq']} dir={s['dir']}")