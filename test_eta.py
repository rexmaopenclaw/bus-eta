import urllib.request, json

routes = ['1A','101','104','968','960','961','2','5C','112','106']
for route in routes:
    for bound in ['1', '2']:
        try:
            url = f'https://data.etabus.gov.hk/v1/transport/kmb/eta/{route}/{bound}/1'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req, timeout=10)
            d = json.loads(resp.read().decode('utf-8'))
            count = len(d['data'])
            print(f'{route}/{bound}/1: {count} items')
            if count > 0:
                print(f'  FIRST: {json.dumps(d["data"][0], indent=2, ensure_ascii=False)[:200]}')
        except Exception as e:
            print(f'{route}/{bound}/1: ERROR - {type(e).__name__}: {str(e)[:60]}')