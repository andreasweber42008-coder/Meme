import sys, time, json
sys.path.insert(0, "/home/user/Meme/research/lib")
import gmgn

d = gmgn.unwrap(gmgn.call("track smartmoney", "--chain", "sol", "--limit", "100"))
wallets = list(dict.fromkeys(r["maker"] for r in d["list"] if r.get("maker")))
print("pool: %d wallets" % len(wallets))

# Confirm stats returns only the FIRST wallet when given many
args = ["--chain","sol","--period","30d"]
for w in wallets[:20]: args += ["--wallet", w]
dd = gmgn.unwrap(gmgn.call("portfolio stats", *args))
print("stats(20) -> returned wallet_address == wallets[0]? %s"
      % (dd.get("wallet_address") == wallets[0]))

# Does portfolio profits actually batch?
for n in (2, 40):
    sub = wallets[:n]
    args = ["--chain","sol","--period","30d"]
    for w in sub: args += ["--wallet", w]
    t0=time.time(); r = gmgn.call("portfolio profits", *args); el=time.time()-t0
    dd = gmgn.unwrap(r)
    if not r["ok"]:
        print("profits n=%d FAIL %s" % (n, r["err"][:250])); continue
    if isinstance(dd, list): cnt=len(dd)
    elif isinstance(dd, dict):
        cnt = next((len(v) for v in dd.values() if isinstance(v, list)), 1)
    else: cnt="?"
    print("profits n=%-3d %.1fs returned=%s type=%s keys=%s"
          % (n, el, cnt, type(dd).__name__,
             list(dd.keys())[:10] if isinstance(dd,dict) else "-"))
    if n == 2:
        print(json.dumps(dd, indent=1)[:1500])
