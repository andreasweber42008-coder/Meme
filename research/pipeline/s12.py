"""Stage 1: token universe.  Stage 2: per-token trader lists (winners+losers).

`token traders` is the key route: --order-by profit --direction desc gives
Group A (winners), asc gives Group B (losers) on the SAME token over the SAME
window. Each row already carries per-wallet-per-token profit, cost, fees, the
holding window and avg entry/exit price, so the trade-level dataset needs no
per-wallet activity paging.
"""
import sys, os, json, time
sys.path.insert(0, "/home/user/Meme/research/lib")
import gmgn

ROOT = "/home/user/Meme/research"
DATA = os.path.join(ROOT, "data"); os.makedirs(DATA, exist_ok=True)
TOKENS = os.path.join(DATA, "tokens.jsonl")
TRADES = os.path.join(DATA, "trader_rows.jsonl")
DONE   = os.path.join(DATA, "s2_done.txt")

CHAINS = ["sol", "bsc", "base", "eth", "robinhood", "arc", "stable"]
INTERVALS = ["1h", "6h", "24h"]

def log(*a):
    m = "[%s] %s" % (time.strftime("%H:%M:%S"), " ".join(str(x) for x in a))
    print(m, flush=True)

def rows_of(d):
    if isinstance(d, dict):
        for k in ("rank", "list", "data"):
            if isinstance(d.get(k), list): return d[k]
    return d if isinstance(d, list) else []

def stage1():
    seen, out = set(), []
    if os.path.exists(TOKENS):
        for ln in open(TOKENS):
            try: seen.add(json.loads(ln)["_key"])
            except Exception: pass
        log("stage1: %d tokens already on disk" % len(seen))
    fh = open(TOKENS, "a")
    stats = {}
    for ch in CHAINS:
        for iv in INTERVALS:
            r = gmgn.call("market trending", "--chain", ch, "--interval", iv, "--limit", "100")
            rs = rows_of(gmgn.unwrap(r))
            n_new = 0
            for t in rs:
                a = t.get("address")
                if not a: continue
                k = "%s:%s" % (ch, a)
                if k in seen: continue
                seen.add(k); t["_key"] = k; t["_chain"] = ch; t["_src"] = "trending/%s" % iv
                fh.write(json.dumps(t) + "\n"); n_new += 1
            stats["trending/%s/%s" % (ch, iv)] = (len(rs), n_new)
            log("  trending %-9s %-3s -> %3d rows, %3d new%s" %
                (ch, iv, len(rs), n_new, "" if r["ok"] else "  FAIL: " + r["err"][:90]))
        r = gmgn.call("market trenches", "--chain", ch, "--limit", "80")
        d = gmgn.unwrap(r); rs = []
        if isinstance(d, dict):
            for k in ("new_creation", "near_completion", "completed"):
                if isinstance(d.get(k), list): rs += d[k]
            if not rs: rs = rows_of(d)
        n_new = 0
        for t in rs:
            a = t.get("address")
            if not a: continue
            k = "%s:%s" % (ch, a)
            if k in seen: continue
            seen.add(k); t["_key"] = k; t["_chain"] = ch; t["_src"] = "trenches"
            fh.write(json.dumps(t) + "\n"); n_new += 1
        stats["trenches/%s" % ch] = (len(rs), n_new)
        log("  trenches %-9s     -> %3d rows, %3d new%s" %
            (ch, len(rs), n_new, "" if r["ok"] else "  FAIL: " + r["err"][:90]))
        fh.flush()
    fh.close()
    log("stage1 DONE: %d unique tokens" % len(seen))
    json.dump(stats, open(os.path.join(DATA, "s1_stats.json"), "w"), indent=1)
    return seen

def stage2():
    done = set()
    if os.path.exists(DONE):
        done = set(x.strip() for x in open(DONE) if x.strip())
    toks = []
    for ln in open(TOKENS):
        try: toks.append(json.loads(ln))
        except Exception: pass
    # richest tokens first: more traders => more rows per call
    def vol(t):
        for k in ("volume", "volume_24h", "swaps"):
            try: return float(t.get(k) or 0)
            except Exception: pass
        return 0.0
    toks.sort(key=vol, reverse=True)
    todo = [t for t in toks if t["_key"] not in done]
    log("stage2: %d tokens total, %d done, %d todo" % (len(toks), len(done), len(todo)))
    fh = open(TRADES, "a"); dh = open(DONE, "a")
    nrows = 0
    for i, t in enumerate(todo):
        ch, addr = t["_chain"], t["address"]
        got = 0
        # The API rejects direction=asc ("direction only support [DESC]"), so
        # losers cannot be reached by inverting the profit sort. Two frames
        # instead:
        #   elite   -- order by profit desc: the token's best traders.
        #   neutral -- order by buy_volume_cur desc: the biggest buyers,
        #              selected WITHOUT reference to outcome, so it contains
        #              winners and losers under one sampling rule. Group A/B
        #              is assigned from the profit sign inside this frame,
        #              which is what makes the A-vs-B comparison unbiased.
        for order_by, frame in (("profit", "elite"), ("buy_volume_cur", "neutral")):
            r = gmgn.call("token traders", "--chain", ch, "--address", addr,
                          "--limit", "100", "--order-by", order_by,
                          "--direction", "desc")
            if not r["ok"]:
                continue
            for row in rows_of(gmgn.unwrap(r)):
                w = row.get("address") or row.get("account_address")
                if not w: continue
                pf = row.get("profit")
                try: pf = float(pf)
                except (TypeError, ValueError): pf = 0.0
                row["_token"] = addr; row["_chain"] = ch
                row["_frame"] = frame
                row["_grp"] = "A" if pf > 0 else ("B" if pf < 0 else "Z")
                row["_tok_created"] = t.get("creation_timestamp")
                row["_tok_supply"] = t.get("total_supply")
                fh.write(json.dumps(row) + "\n"); got += 1
        nrows += got
        dh.write(t["_key"] + "\n")
        if i % 10 == 0:
            fh.flush(); dh.flush()
            log("  [%d/%d] %s %s -> %d rows (total %d)" % (i+1, len(todo), ch, addr[:12], got, nrows))
    fh.close(); dh.close()
    log("stage2 DONE: +%d trader rows" % nrows)

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "s1"): stage1()
    if which in ("all", "s2"): stage2()
