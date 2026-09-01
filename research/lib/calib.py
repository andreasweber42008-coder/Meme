import sys, time, json
sys.path.insert(0, "/home/user/Meme/research/lib")
import gmgn

t0 = time.time()
r = gmgn.call("track smartmoney", "--chain", "sol", "--limit", "100")
d = gmgn.unwrap(r)
print("track smartmoney ok=%s cached=%s  %.1fs" % (r["ok"], r["cached"], time.time()-t0))
if not r["ok"]:
    print("ERR:", r["err"][:400]); sys.exit(1)

# shape
print("top-level type:", type(d).__name__)
if isinstance(d, dict):
    print("keys:", list(d.keys())[:20])
    for k in ("rank","list","data","activities"):
        if k in d and isinstance(d[k], list):
            rows = d[k]; print("list key=%s len=%d" % (k, len(rows))); break
    else:
        rows = []
elif isinstance(d, list):
    rows = d; print("len:", len(rows))
else:
    rows = []
if rows:
    print("row0 keys:", sorted(rows[0].keys()))
    print(json.dumps(rows[0], indent=1)[:1200])
