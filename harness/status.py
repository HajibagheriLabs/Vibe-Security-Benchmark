"""
One-screen health report for a running or finished benchmark. Cheap to run;
this is what the operator polls instead of reading logs.

  python harness/status.py            # full run
  python harness/status.py --smoke    # smoke run
  python harness/status.py --json

Exit code: 0 healthy or done, 1 needs attention, 2 stalled.
"""
import argparse
import sys
import collections
import json
import os
import subprocess
import time
import urllib.request
from datetime import datetime, timezone

import config as C
import ledger

STALL_MINUTES = 20


def expected_per_model(smoke):
    n = 0
    for t in ("web", "app"):
        sc = json.loads((C.HARNESS / f"scenarios_{t}.json").read_text(encoding="utf-8"))
        if smoke:
            sc = [s for s in sc if s["id"].endswith(("-01", "-15", "-B1"))]
        n += len(sc)
    return n * len(C.REGIMES) * len(C.PASSES)


def local_up():
    try:
        with urllib.request.urlopen(C.LOCAL_BASE_URL.rstrip("/") + "/models", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def alive(pid):
    """Process liveness without signalling it (os.kill would terminate on Windows)."""
    if not pid:
        return None
    try:
        if os.name == "nt":
            out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"],
                                 capture_output=True, text=True, timeout=10).stdout
            return str(pid) in out
        st = f"/proc/{pid}/status"
        if not os.path.exists(st):
            return False
        with open(st) as fh:
            return not any(l.startswith("State:") and "Z" in l.split()[1] for l in fh)
    except Exception:
        return None


def norm(s):
    return (s or "").lower().replace(" ", "").replace("-", "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    C.set_smoke(args.smoke)

    exp = expected_per_model(args.smoke)
    rep = {"mode": "smoke" if args.smoke else "full", "time_utc": datetime.now(timezone.utc).isoformat(),
           "models": {}, "runners": {}, "attention": [], "stalled": False}
    A = rep["attention"]

    # ---------------- artifacts per model
    per = collections.defaultdict(lambda: {"present": 0, "reasoning_detected": 0,
                                           "providers": collections.Counter()})
    for t in ("web", "app"):
        d = C.samples_dir(t)
        if not d.exists():
            continue
        for f in d.glob("*.json"):
            try:
                a = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                A.append(f"unreadable artifact {f.name}")
                continue
            m = per[a["model"]]
            m["present"] += 1
            meta = a.get("api_meta") or {}
            m["reasoning_detected"] += bool(meta.get("reasoning_detected"))
            m["providers"][meta.get("provider") or "local"] += 1

    for alias, cfg in C.MODELS.items():
        fails = {}
        fp = C.RESULTS / "failed" / f"{alias}.json"
        if fp.exists():
            fails = json.loads(fp.read_text(encoding="utf-8"))
        kinds = collections.Counter()
        for v in fails.values():
            r = v.get("reason", "")
            kinds[r[1:r.index("]")] if r.startswith("[") and "]" in r else "parked/other"] += 1
        p = per[alias]
        row = {"present": p["present"], "expected": exp, "failed_pending": len(fails),
               "failure_kinds": dict(kinds), "reasoning_detected": p["reasoning_detected"],
               "providers": dict(p["providers"])}
        rep["models"][alias] = row
        if p["reasoning_detected"]:
            A.append(f"{alias}: {p['reasoning_detected']} artifacts show reasoning (thinking not off)")
        if kinds.get("truncated"):
            A.append(f"{alias}: {kinds['truncated']} truncated at max_tokens")
        pin = cfg.get("provider")
        if pin:
            wrong = {k: v for k, v in p["providers"].items() if norm(pin) not in norm(k)}
            if wrong:
                A.append(f"{alias}: served by unpinned provider(s) {wrong}")

    # ---------------- runner processes
    now = time.time()
    for sf in sorted(C.RESULTS.glob("runner_state_*.json")):
        s = json.loads(sf.read_text(encoding="utf-8"))
        age = (now - s.get("updated", now)) / 60
        rep["runners"][s["tag"]] = {"status": s["status"], "stop_reason": s.get("stop_reason"),
                                    "updated_min_ago": round(age, 1), "current": s.get("current"),
                                    "generated_now": s.get("generated_now"),
                                    "failed_now": s.get("failed_now"), "parked": s.get("parked")}
        is_alive = alive(s.get("pid")) if s["status"] == "running" else None
        rep["runners"][s["tag"]]["process_alive"] = is_alive
        if s["status"] == "running" and is_alive is False:
            rep["stalled"] = True
            A.append(f"runner '{s['tag']}' says running but its process is gone (crashed) - relaunch it")
        elif s["status"] == "running" and age > STALL_MINUTES:
            rep["stalled"] = True
            A.append(f"runner '{s['tag']}' has not updated for {age:.0f} min (hung?)")
        if s["status"] == "stopped":
            A.append(f"runner '{s['tag']}' stopped: {s.get('stop_reason')}")
        for alias, why in (s.get("parked") or {}).items():
            A.append(f"{alias} parked: {why}")

    rep["local_server_up"] = local_up()
    if not rep["local_server_up"] and rep["models"].get("qwen_local", {}).get("present", 0) < exp:
        A.append("local llama-server is not answering on " + C.LOCAL_BASE_URL)

    # ---------------- judging (stage B)
    for hb_name, label in (("judge_state_gold.json", "judging_gold"), ("judge_state.json", "judging")):
        hb = C.RESULTS / hb_name
        if not hb.exists():
            continue
        h = json.loads(hb.read_text(encoding="utf-8"))
        age = (now - h.get("updated", now)) / 60
        jr = {"status": h.get("status"), "position": h.get("position"), "total": h.get("total"),
              "updated_min_ago": round(age, 1), "stop_reason": h.get("stop_reason")}
        jf = C.RESULTS / ("gold_judge_failures.json" if "gold" in hb_name else "judge_failures.json")
        if jf.exists():
            jr["failed_pending"] = len(json.loads(jf.read_text(encoding="utf-8")))
        rep[label] = jr
        if h.get("status") == "running":
            if alive(h.get("pid")) is False:
                rep["stalled"] = True
                A.append(f"{label}: process is gone (crashed) - relaunch it")
            elif age > STALL_MINUTES:
                rep["stalled"] = True
                A.append(f"{label}: no progress for {age:.0f} min")
        if h.get("status") == "stopped":
            A.append(f"{label} stopped: {h.get('stop_reason')}")
        if h.get("status") == "awaiting_subagent":
            A.append(f"{label}: {h.get('awaiting')} items wait for the subagent judge - run it on the "
                     f"waiting prompts in subagent_judge/, then relaunch "
                     f"{'judge-gold' if 'gold' in hb_name else 'judge'}")
        if h.get("status") == "finished" and jr.get("failed_pending"):
            A.append(f"{label}: {jr['failed_pending']} items failed - run launch.py "
                     f"{'judge-gold' if 'gold' in hb_name else 'judge-retry'}")

    # ---------------- spend
    rows = ledger.rows()
    by = collections.defaultdict(float)
    for r in rows:
        by[f"{r['phase']}:{r['model_id']}"] += r.get("cost") or 0
    today = datetime.now(timezone.utc).date()
    free_today = sum(1 for r in rows if r["model_id"].endswith(":free")
                     and datetime.fromtimestamp(r["ts"], timezone.utc).date() == today)
    total = sum(by.values())
    rep["spend"] = {"total_usd": round(total, 4), "budget_usd": C.BUDGET_USD,
                    "by_phase_model": {k: round(v, 4) for k, v in sorted(by.items())},
                    "free_requests_today_utc": free_today}
    if total >= 0.8 * C.BUDGET_USD:
        A.append(f"spend ${total:.2f} is over 80% of the ${C.BUDGET_USD} budget")

    all_done = all(v["present"] >= v["expected"] for v in rep["models"].values())
    rep["generation_complete"] = all_done
    active = [t for t, r in rep["runners"].items() if r["status"] == "running"]
    if rep["runners"] and not active and not all_done:
        missing = sum(max(0, v["expected"] - v["present"]) for v in rep["models"].values())
        listed = sum(v["failed_pending"] for v in rep["models"].values())
        A.append(f"no runner is active and {missing} samples are missing ({listed} listed as failed) - "
                 f"resolve the cause, then launch.py retry" + (
                     "" if listed >= missing else "; samples not listed as failed need launch.py generate, "
                                                  "which resumes and skips finished samples"))
    judging_now = [l for l in ("judging_gold", "judging") if rep.get(l, {}).get("status") == "running"]
    rep["judging_active"] = judging_now
    if rep["stalled"]:
        rep["verdict"] = "STALLED"
    elif A:
        rep["verdict"] = "ATTENTION"
    elif judging_now:
        rep["verdict"] = "OK"
    elif rep.get("judging", {}).get("status") == "finished":
        rep["verdict"] = "DONE"
    elif all_done and not active:
        rep["verdict"] = "DONE"
    else:
        rep["verdict"] = "OK"
    if judging_now:
        phase = "judging in progress"
    elif rep.get("judging", {}).get("status") == "finished":
        phase = "judging complete"
    elif rep.get("judging_gold", {}).get("status") == "finished":
        phase = "gold judged, run calibrate_judge.py"
    elif all_done:
        phase = "generation complete"
    else:
        phase = "generating" if active else "generation not running"
    rep["phase"] = phase

    if args.json:
        lines = [json.dumps(rep, indent=2)]
    else:
        lines = [f"[{rep['verdict']}] {rep['mode']} run: {phase}  {rep['time_utc'][:19]}Z  "
                 f"spend ${total:.3f}/${C.BUDGET_USD}  free req today {free_today}/1000  "
                 f"llama-server {'up' if rep['local_server_up'] else 'DOWN'}"]
        for alias, r in rep["models"].items():
            lines.append(f"  {alias:<16} {r['present']:>4}/{r['expected']:<4} failed={r['failed_pending']:<3}"
                         f" {r['failure_kinds'] or ''} providers={r['providers']}")
        for tag, r in rep["runners"].items():
            lines.append(f"  runner[{tag}] {r['status']} updated {r['updated_min_ago']}m ago "
                         f"alive={r.get('process_alive')} current={r['current']}")
        for label in ("judging_gold", "judging"):
            if label in rep:
                j = rep[label]
                pos = f" {j['position']}/{j['total']}" if j.get("position") is not None else ""
                lines.append(f"  {label}: {j['status']}{pos}  updated {j['updated_min_ago']}m ago  "
                             f"failed_pending={j.get('failed_pending', 0)}"
                             + (f"  stop_reason={j['stop_reason']}" if j.get("stop_reason") else ""))
        lines += [f"  ! {a}" for a in A]
    code = 2 if rep["stalled"] else (1 if A else 0)
    try:
        sys.stdout.write("\n".join(lines) + "\n")
        sys.stdout.flush()
    except BrokenPipeError:      # output piped into head/Select-Object: keep the exit code
        try:
            sys.stdout = open(os.devnull, "w")
        except Exception:
            pass
    raise SystemExit(code)


if __name__ == "__main__":
    main()
