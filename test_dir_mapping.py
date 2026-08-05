import urllib.request, json

# Check route-eta deeply to understand bound mapping
print('=== route-eta/1A/1: dir breakdown ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1A/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))
dirs = {}
for item in d['data']:
    dir = item['dir']
    if dir not in dirs:
        dirs[dir] = 0
    dirs[dir] += 1
print('dir breakdown: ' + str(dirs))

print()
print('=== route-eta/101/1: dir breakdown ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/101/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))
dirs = {}
for item in d['data']:
    dir = item['dir']
    if dir not in dirs:
        dirs[dir] = 0
    dirs[dir] += 1
print('dir breakdown: ' + str(dirs))

print()
print('=== route-eta/101/2: dir breakdown ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/101/2'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))
dirs = {}
for item in d['data']:
    dir = item['dir']
    if dir not in dirs:
        dirs[dir] = 0
    dirs[dir] += 1
print('dir breakdown: ' + str(dirs))

print()
print('=== route-eta/968/1: dir breakdown ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/968/1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))
dirs = {}
for item in d['data']:
    dir = item['dir']
    if dir not in dirs:
        dirs[dir] = 0
    dirs[dir] += 1
print('dir breakdown: ' + str(dirs))

print()
print('=== route-eta/968/2: dir breakdown ===')
url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-eta/968/2'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=10)
d = json.loads(resp.read().decode('utf-8'))
dirs = {}
for item in d['data']:
    dir = item['dir']
    if dir not in dirs:
        dirs[dir] = 0
    dirs[dir] += 1
print('dir breakdown: ' + str(dirs))

# Conclusion: 1=O, 2=I
print()
print('=== CONCLUSION ===')
print('route-eta/1A/1: dirs=' + str(dirs))