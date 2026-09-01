"""Rate-limited, disk-cached wrapper around gmgn-cli.

Every response is written to research/raw/ keyed by a hash of the argv, so the
whole pipeline is resumable: a re-run replays from cache and only pays the rate
limit for genuinely new requests.
"""
import hashlib, json, os, re, subprocess, sys, time, fcntl, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
LOGS = os.path.join(ROOT, "logs")
LOCK = os.path.join(LOGS, "ratelimit.lock")
os.makedirs(RAW, exist_ok=True)
os.makedirs(LOGS, exist_ok=True)

# Brief says ~20 req/min leaky bucket -> pace at 2.8s. Measured & adjustable.
PACE = float(os.environ.get("GMGN_PACE", "2.8"))

class RateLimitBanned(Exception):
    pass

def _key(args):
    return hashlib.sha256("\x00".join(args).encode()).hexdigest()[:32]

def _cache_path(route, args):
    d = os.path.join(RAW, route.replace(" ", "_"))
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, _key(args) + ".json")

def _throttle():
    """Cross-process pacing via a lock file holding the last-call timestamp."""
    with open(LOCK, "a+") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        try:
            fh.seek(0)
            raw = fh.read().strip()
            last = float(raw) if raw else 0.0
            wait = PACE - (time.time() - last)
            if wait > 0:
                time.sleep(wait)
            fh.seek(0); fh.truncate()
            fh.write(str(time.time()))
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)

def call(route, *args, cache=True, retries=3, timeout=90):
    """Run `gmgn-cli <route> <args> --raw`, returning parsed JSON.

    Returns dict with keys: ok(bool), data(parsed json or None), err(str),
    cached(bool). Never raises except RateLimitBanned.
    """
    argv = route.split() + [str(a) for a in args] + ["--raw"]
    cp = _cache_path(route, argv)
    if cache and os.path.exists(cp):
        try:
            with open(cp) as fh:
                rec = json.load(fh)
            rec["cached"] = True
            return rec
        except Exception:
            pass  # corrupt cache entry -> refetch

    last_err = ""
    for attempt in range(retries):
        _throttle()
        try:
            r = subprocess.run(["gmgn-cli"] + argv, capture_output=True,
                               text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            last_err = "timeout"; continue
        out, err = r.stdout.strip(), r.stderr.strip()
        # Only a genuine rate-limit signal counts: the explicit code, or a 429
        # on a FAILED call. A bare "429" inside a successful JSON payload is
        # just digits in a hash and must not trip this.
        blob = (out + " " + err)
        if "RATE_LIMIT_BANNED" in blob:
            raise RateLimitBanned(blob[:500])
        if r.returncode != 0 and re.search(r"\b429\b|rate.?limit", err, re.I):
            raise RateLimitBanned(err[:500])
        if r.returncode == 0 and out:
            try:
                data = json.loads(out)
            except json.JSONDecodeError as e:
                last_err = f"badjson: {e}: {out[:200]}"; continue
            rec = {"ok": True, "data": data, "err": err, "argv": argv,
                   "ts": int(time.time())}
            with open(cp, "w") as fh:
                json.dump(rec, fh)
            rec["cached"] = False
            return rec
        last_err = f"exit={r.returncode} stderr={err[:300]} stdout={out[:200]}"
        time.sleep(1.5 * (attempt + 1) + random.random())

    rec = {"ok": False, "data": None, "err": last_err, "argv": argv,
           "ts": int(time.time())}
    with open(cp, "w") as fh:   # negative-cache so retries don't burn budget
        json.dump(rec, fh)
    rec["cached"] = False
    return rec

def unwrap(rec):
    """GMGN wraps payloads as {code:0,data:{...}}. Return inner data or None."""
    if not rec.get("ok"):
        return None
    d = rec["data"]
    if isinstance(d, dict) and "code" in d and "data" in d:
        if d.get("code") not in (0, "0"):
            return None
        return d["data"]
    return d
