"""Compact the fat trader_rows.jsonl into the per-trade CSV (deliverable #2).

Reads append-only JSONL while stage 2 may still be writing; a torn final line
is skipped. Every derived column is arithmetic on fields present in the row --
nothing inferred.
"""
import sys, os, json, gzip, csv

ROOT = "/home/user/Meme/research"
SRC  = os.path.join(ROOT, "data", "trader_rows.jsonl")
DST  = os.path.join(ROOT, "data", "trades.csv.gz")

COLS = ["chain","token","wallet","grp","profit","realized_profit","unrealized_profit",
        "total_cost","bought_cost","sold_income","bought_fee","sold_fee",
        "buy_tx","sell_tx","start_holding_at","end_holding_at","hold_s",
        "avg_cost","avg_sold","multiple","balance","amount_cur","still_holding",
        "transfer_in","transfer_in_amt","is_suspicious","wallet_tag","tags",
        "tok_created","tok_supply","entry_mc","tok_age_at_entry_s"]

def f(v, d=0.0):
    try:
        if v is None or v == "": return d
        return float(v)
    except (TypeError, ValueError): return d

def i(v, d=0):
    try:
        if v is None or v == "": return d
        return int(float(v))
    except (TypeError, ValueError): return d

def main():
    n_in = n_out = n_bad = 0
    with gzip.open(DST, "wt", newline="") as gz:
        w = csv.writer(gz); w.writerow(COLS)
        for ln in open(SRC, errors="replace"):
            n_in += 1
            ln = ln.strip()
            if not ln: continue
            try: r = json.loads(ln)
            except Exception: n_bad += 1; continue   # torn last line while writing
            start, end = i(r.get("start_holding_at")), i(r.get("end_holding_at"))
            hold = end - start if (start and end and end >= start) else ""
            ac, asold = f(r.get("avg_cost")), f(r.get("avg_sold"))
            mult = round(asold / ac, 6) if ac > 0 and asold > 0 else ""
            sup = f(r.get("_tok_supply"))
            created = i(r.get("_tok_created"))
            entry_mc = round(ac * sup, 2) if ac > 0 and sup > 0 else ""
            age = start - created if (start and created and start >= created) else ""
            bal, amt = f(r.get("balance")), f(r.get("amount_cur"))
            w.writerow([
                r.get("_chain",""), r.get("_token",""),
                r.get("address") or r.get("account_address",""), r.get("_grp",""),
                round(f(r.get("profit")),4), round(f(r.get("realized_profit")),4),
                round(f(r.get("unrealized_profit")),4), round(f(r.get("total_cost")),4),
                round(f(r.get("history_bought_cost")),4), round(f(r.get("history_sold_income")),4),
                round(f(r.get("history_bought_fee")),6), round(f(r.get("history_sold_fee")),6),
                i(r.get("buy_tx_count_cur")), i(r.get("sell_tx_count_cur")),
                start, end, hold, ac, asold, mult,
                bal, amt, 1 if (bal > 0 or amt > 0) else 0,
                1 if r.get("transfer_in") else 0, f(r.get("history_transfer_in_amount")),
                1 if r.get("is_suspicious") else 0, r.get("wallet_tag_v2",""),
                "|".join(r.get("tags") or []), created, sup, entry_mc, age,
            ])
            n_out += 1
    print("rows in=%d  written=%d  unparsable=%d  -> %s (%.1f KB)"
          % (n_in, n_out, n_bad, DST, os.path.getsize(DST)/1024))

main()
