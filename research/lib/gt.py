"""Cached, rate-limited GeckoTerminal client — price/trade ground truth
independent of GMGN. Free tier, no API key. Measured 12/12 calls in 4s;
paced conservatively at 30/min to match the documented free-tier limit.
"""
import hashlib, json, os, time, fcntl, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw", "gt")
LOCK = os.path.join(ROOT, "logs", "gt.lock")
os.makedirs(RAW, exist_ok=True); os.makedirs(os.path.dirname(LOCK), exist_ok=True)
BASE = "https://api.geckoterminal.com/api/v2"
PACE = float(os.environ.get("GT_PACE", "2.0"))

# gmgn chain slug -> geckoterminal network slug
NET = {"sol": "solana", "bsc": "bsc", "base": "base", "eth": "eth"}

def _throttle():
    with open(LOCK, "a+") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        try:
            fh.seek(0); raw = fh.read().strip()
            last = float(raw) if raw else 0.0
            w = PACE - (time.time() - last)
            if w > 0: time.sleep(w)
            fh.seek(0); fh.truncate(); fh.write(str(time.time()))
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)

def get(path, cache=True, retries=3):
    cp = os.path.join(RAW, hashlib.sha256(path.encode()).hexdigest()[:32] + ".json")
    if cache and os.path.exists(cp):
        try:
            with open(cp) as fh: r = json.load(fh)
            r["cached"] = True; return r
        except Exception: pass
    err = ""
    for a in range(retries):
        _throttle()
        try:
            req = urllib.request.Request(BASE + path, headers={
                "Accept": "application/json", "User-Agent": "research/1.0"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = json.loads(resp.read().decode())
            rec = {"ok": True, "data": body, "path": path, "ts": int(time.time())}
            with open(cp, "w") as fh: json.dump(rec, fh)
            rec["cached"] = False; return rec
        except urllib.error.HTTPError as e:
            err = "HTTP %s" % e.code
            if e.code == 429: time.sleep(20 * (a + 1)); continue
            if e.code == 404: break
            time.sleep(2 * (a + 1))
        except Exception as e:
            err = repr(e)[:200]; time.sleep(2 * (a + 1))
    rec = {"ok": False, "data": None, "err": err, "path": path, "ts": int(time.time())}
    with open(cp, "w") as fh: json.dump(rec, fh)
    rec["cached"] = False; return rec

def pools_for_token(net, addr):
    return get("/networks/%s/tokens/%s/pools" % (net, addr))

def ohlcv(net, pool, res="minute", aggregate=1, before=None, limit=1000):
    p = "/networks/%s/pools/%s/ohlcv/%s?aggregate=%d&limit=%d" % (net, pool, res, aggregate, limit)
    if before: p += "&before_timestamp=%d" % before
    return get(p)

def trades(net, pool, min_usd=0):
    return get("/networks/%s/pools/%s/trades?trade_volume_in_usd_greater_than=%d" % (net, pool, min_usd))
