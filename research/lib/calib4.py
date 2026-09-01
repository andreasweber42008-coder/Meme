import sys, json
sys.path.insert(0,"/home/user/Meme/research/lib")
import gmgn
d = gmgn.unwrap(gmgn.call("market trending","--chain","sol","--interval","1h","--limit","100"))
rows = d["rank"] if isinstance(d,dict) and "rank" in d else d
print("trending tokens:", len(rows), "| row0 keys:", sorted(rows[0].keys())[:40])
tok = rows[0]["address"]
print("probe token:", tok, rows[0].get("symbol"))
r = gmgn.call("token traders","--chain","sol","--address",tok,"--limit","100","--order-by","profit")
dd = gmgn.unwrap(r)
print("traders ok=%s type=%s keys=%s" % (r["ok"], type(dd).__name__, list(dd.keys())[:8] if isinstance(dd,dict) else "-"))
tr = dd["list"] if isinstance(dd,dict) and "list" in dd else dd
print("n traders:", len(tr) if isinstance(tr,list) else "?")
if isinstance(tr,list) and tr:
    print("trader keys:", sorted(tr[0].keys()))
    print(json.dumps(tr[0], indent=1)[:1500])
    prof=[float(t.get("profit") or 0) for t in tr]
    print("profit>0: %d   profit<0: %d   ==0: %d" % (sum(1 for p in prof if p>0), sum(1 for p in prof if p<0), sum(1 for p in prof if p==0)))
