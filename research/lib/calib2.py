import sys, time, json
sys.path.insert(0, "/home/user/Meme/research/lib")
import gmgn

d = gmgn.unwrap(gmgn.call("track smartmoney", "--chain", "sol", "--limit", "100"))
wallets = list(dict.fromkeys(r["maker"] for r in d["list"] if r.get("maker")))
print("unique wallets from 1 smartmoney page: %d" % len(wallets))

for n in (1, 20, 100):
    sub = wallets[:n]
    if len(sub) < n:
        print("  (only %d available, testing that)" % len(sub)); sub = wallets
    args = ["--chain", "sol", "--period", "30d"]
    for w in sub:
        args += ["--wallet", w]
    t0 = time.time()
    r = gmgn.call("portfolio stats", *args)
    el = time.time() - t0
    dd = gmgn.unwrap(r)
    if not r["ok"]:
        print("n=%-3d FAIL %.1fs  %s" % (len(sub), el, r["err"][:200])); continue
    # how many wallets came back?
    cnt = None
    if isinstance(dd, list): cnt = len(dd)
    elif isinstance(dd, dict):
        for k, v in dd.items():
            if isinstance(v, list): cnt = len(v); break
        if cnt is None: cnt = 1
    print("n=%-3d OK  %.1fs  returned=%s  cached=%s  toptype=%s keys=%s"
          % (len(sub), el, cnt, r["cached"], type(dd).__name__,
             list(dd.keys())[:8] if isinstance(dd, dict) else "-"))
    if n == 1:
        print(json.dumps(dd, indent=1)[:1800])
