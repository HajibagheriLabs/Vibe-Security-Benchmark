"""
Phase 1 - generation.

One JSON artifact per (scenario x model x regime x pass). Never halts on a single
failure: failures go to results/failed/<model>.json and the run moves on.
Idempotent: existing artifacts are skipped, so it can be stopped and restarted.

  python harness/runner.py --smoke                       # 3 scenarios/track -> smoke/
  python harness/runner.py                               # full run, all models
  python harness/runner.py --only-model deepseek_v4_pro  # one model (safe to run the
                                                         # three models as 3 processes)
  python harness/runner.py --retry-failed [--only-model X]

Never run two processes on the SAME model at once.
"""
import argparse
import hashlib
import json
import os
import random
import sys
import time

import openai
from openai import OpenAI

import config as C
import ledger

SHUFFLE_SEED = 20260905


# ---------------------------------------------------------------- paths
def failed_path(alias):
    return C.RESULTS / "failed" / f"{alias}.json"


def state_path(tag):
    return C.RESULTS / f"runner_state_{tag}.json"


def runlog_path():
    return C.RESULTS / "run_log.jsonl"


# ---------------------------------------------------------------- failure store
def load_failures(alias):
    p = failed_path(alias)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_failures(alias, d):
    p = failed_path(alias)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, indent=2), encoding="utf-8")


def record_failure(alias, sid, meta, reason, body=None):
    f = load_failures(alias)
    m = dict(meta)
    m["reason"] = str(reason)[:2000]
    m["failed_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    if body:
        m["last_body_preview"] = body[:3000]
    f[sid] = m
    save_failures(alias, f)


def clear_failure(alias, sid):
    f = load_failures(alias)
    if sid in f:
        del f[sid]
        save_failures(alias, f)


# ---------------------------------------------------------------- heartbeat
class State:
    def __init__(self, tag, total):
        self.path = state_path(tag)
        self.d = {"tag": tag, "mode": "smoke" if C.SMOKE else "full", "pid": os.getpid(),
                  "status": "running", "stop_reason": None, "started": time.time(),
                  "updated": time.time(), "plan_total": total, "skipped_existing": 0,
                  "generated_now": 0, "failed_now": 0, "parked": {}, "current": None}
        self.flush()

    def set(self, **kw):
        self.d.update(kw)
        self.d["updated"] = time.time()
        self.flush()

    def bump(self, key):
        self.d[key] += 1
        self.set()

    def flush(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.d, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- clients
def build_clients(needed):
    clients = {}
    if "openrouter" in needed:
        C.require_key()
        clients["openrouter"] = OpenAI(base_url=C.OPENROUTER_BASE_URL, api_key=C.OPENROUTER_KEY,
                                       default_headers=C.OPENROUTER_HEADERS,
                                       timeout=600.0, max_retries=0)
    if "local" in needed:
        clients["local"] = OpenAI(base_url=C.LOCAL_BASE_URL, api_key="llama-cpp",
                                  timeout=1800.0, max_retries=0)
    return clients


# ---------------------------------------------------------------- free-tier governor
_last_free = [0.0]


def free_gate():
    wait = C.FREE_MIN_INTERVAL - (time.time() - _last_free[0])
    if wait > 0:
        time.sleep(wait)
    _last_free[0] = time.time()


def classify(e):
    """-> credits | daily | burst | connection | no_endpoint | transport"""
    status = getattr(e, "status_code", None)
    t = f"{type(e).__name__} {e}".lower()
    if status == 402 or "insufficient credit" in t or "requires more credits" in t:
        return "credits"
    if status == 429 or "rate limit" in t or "rate-limit" in t:
        if any(k in t for k in ("per-day", "per day", "daily", "per_day")):
            return "daily"
        return "burst"
    if isinstance(e, (openai.APIConnectionError, openai.APITimeoutError)) and status is None:
        return "connection"
    if status == 404 or "no endpoints found" in t or "no allowed providers" in t:
        return "no_endpoint"
    return "transport"


# ---------------------------------------------------------------- one call
def seed_for(sample_id):
    return int(hashlib.sha256(sample_id.encode()).hexdigest()[:8], 16)


def call_once(client, mcfg, messages, seed):
    body = {"model": mcfg["model_id"], "messages": messages, "temperature": C.TEMPERATURE,
            "top_p": C.TOP_P, "max_tokens": C.MAX_TOKENS, "seed": seed}
    if mcfg["endpoint"] == "openrouter":
        extra = C.openrouter_body_extras(mcfg.get("provider"), mcfg.get("extra"))
    else:
        extra = dict(mcfg.get("extra") or {})
    extra["top_k"] = C.TOP_K
    body["extra_body"] = extra
    if mcfg.get("free_tier"):
        free_gate()
    raw = client.chat.completions.create(**body).model_dump()
    ch = raw["choices"][0]
    msg = ch.get("message") or {}
    text = msg.get("content") or ""
    usage = ledger.usage_from(raw)
    meta = {"finish_reason": ch.get("finish_reason"), "generation_id": raw.get("id"),
            "provider": raw.get("provider"), "served_model": raw.get("model"),
            "usage": usage,
            "reasoning_field_present": bool(msg.get("reasoning") or msg.get("reasoning_content")),
            "reasoning_detected": bool(msg.get("reasoning") or msg.get("reasoning_content")
                                       or usage["reasoning_tokens"] > 0)}
    ledger.record("generation", mcfg["model_id"], raw.get("provider"), usage,
                  finish_reason=ch.get("finish_reason"))
    return text, meta


def generate(client, mcfg, messages, seed):
    """Returns (text, meta, attempts, failure) where failure = (kind, reason, body)."""
    last = ("transport", "unknown", None)
    burst_waits = 0
    attempt = 0
    while attempt < C.MAX_ATTEMPTS:
        attempt += 1
        try:
            text, meta = call_once(client, mcfg, messages, seed + attempt - 1)
            if meta["finish_reason"] == "length":
                last = ("truncated", f"finish_reason=length at {C.MAX_TOKENS} tokens", text)
                print(f"      [attempt {attempt}] truncated")
            elif not text.strip():
                last = ("empty", "empty body", None)
                print(f"      [attempt {attempt}] empty body")
            else:
                return text, meta, attempt, None
        except Exception as e:
            kind = classify(e)
            last = (kind, f"{type(e).__name__}: {e}", None)
            print(f"      [attempt {attempt}] {kind}: {str(e)[:150]}")
            if kind in ("credits", "daily", "no_endpoint"):
                return None, None, attempt, last
            if kind == "burst" and burst_waits < 5:
                burst_waits += 1
                attempt -= 1                     # a per-minute wait is not a failed attempt
                time.sleep(C.FREE_BURST_BACKOFF)
                continue
        if attempt < C.MAX_ATTEMPTS:
            time.sleep(C.BACKOFF_BASE ** attempt)
    return None, None, attempt, last


# ---------------------------------------------------------------- plan
def build_tasks(tracks, smoke, only_model):
    aliases = [only_model] if only_model else list(C.MODELS)
    tasks = []
    for track in tracks:
        sc_all = json.loads((C.HARNESS / f"scenarios_{track}.json").read_text(encoding="utf-8"))
        if smoke:
            sc_all = [s for s in sc_all if s["id"].endswith(("-01", "-15", "-B1"))]
        for sc in sc_all:
            for alias in aliases:
                for regime in C.REGIMES:
                    for p in C.PASSES:
                        tasks.append({"sample_id": f"{sc['id']}_{alias}_{regime}_{p}",
                                      "track": track, "scenario": sc, "model_alias": alias,
                                      "regime": regime, "pass": p})
    random.Random(SHUFFLE_SEED).shuffle(tasks)
    return tasks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", choices=["web", "app", "both"], default="both")
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--only-model", choices=list(C.MODELS))
    args = ap.parse_args()
    C.set_smoke(args.smoke)

    tracks = ["web", "app"] if args.track == "both" else [args.track]
    rules = {}
    for t in tracks:
        p = C.rules_path(t)
        if not p.exists():
            print(f"FATAL: {p} not found. Clone both repos next to vibe-benchmark/.")
            sys.exit(2)
        rules[t] = p.read_text(encoding="utf-8")

    # Freeze the rulesets: the first runner records their hashes, and every later
    # run (resume, retry) refuses to continue if AGENT_RULES.md has changed.
    C.RESULTS.mkdir(parents=True, exist_ok=True)
    prov_file, prov = C.RESULTS / "corpus_provenance.json", C.provenance()
    if prov_file.exists():
        was = json.loads(prov_file.read_text(encoding="utf-8"))
        changed = [t for t in tracks if was.get(t, {}).get("agent_rules_sha256") != prov[t]["agent_rules_sha256"]]
        if changed:
            print(f"FATAL: AGENT_RULES.md changed since this corpus was started ({', '.join(changed)}). "
                  f"Restore the original file; a corpus must be generated with one ruleset.")
            sys.exit(2)
    else:
        prov_file.write_text(json.dumps(prov, indent=2), encoding="utf-8")

    tasks = build_tasks(tracks, args.smoke, args.only_model)
    if args.retry_failed:
        pending = set()
        for a in ([args.only_model] if args.only_model else C.MODELS):
            pending |= set(load_failures(a))
        tasks = [t for t in tasks if t["sample_id"] in pending]

    needed = {C.MODELS[t["model_alias"]]["endpoint"] for t in tasks}
    clients = build_clients(needed)
    tag = args.only_model or "all"
    st = State(tag, len(tasks))
    print(f"[{'RETRY' if args.retry_failed else 'SMOKE' if args.smoke else 'FULL'}] "
          f"{len(tasks)} tasks, models={args.only_model or 'all'}, data={C.DATA_ROOT}")

    parked, consec = {}, {}
    for i, t in enumerate(tasks, 1):
        sid, track, sc, alias = t["sample_id"], t["track"], t["scenario"], t["model_alias"]
        mcfg = C.MODELS[alias]
        C.samples_dir(track).mkdir(parents=True, exist_ok=True)
        dest = C.samples_dir(track) / f"{sid}.json"
        meta_f = {"track": track, "model_alias": alias, "regime": t["regime"],
                  "pass": t["pass"], "scenario_id": sc["id"]}

        if dest.exists():
            clear_failure(alias, sid)
            st.bump("skipped_existing")
            continue
        if alias in parked:
            record_failure(alias, sid, meta_f, f"skipped: model parked ({parked[alias]})")
            continue
        if mcfg["endpoint"] == "openrouter" and not mcfg.get("free_tier") and ledger.over_budget():
            st.set(status="stopped", stop_reason=f"budget cap ${C.BUDGET_USD} reached")
            print(f"\nSTOPPED: spend reached the ${C.BUDGET_USD} cap in config.BUDGET_USD.")
            sys.exit(3)

        system = C.BASELINE_SYSTEM if t["regime"] == "baseline" else C.guardrailed_system(rules[track])
        messages = [{"role": "system", "content": system},
                    {"role": "user", "content": sc["prompt"]}]
        st.set(current=sid)
        print(f"[{i}/{len(tasks)}] {sid}")
        text, meta, attempts, fail = generate(clients[mcfg["endpoint"]], mcfg, messages, seed_for(sid))

        if text is None:
            kind, reason, body = fail
            record_failure(alias, sid, meta_f, f"[{kind}] {reason}", body)
            st.bump("failed_now")
            consec[alias] = consec.get(alias, 0) + 1
            if kind == "credits":
                st.set(status="stopped", stop_reason="OpenRouter credit balance exhausted (402)")
                print("\nSTOPPED: OpenRouter returned 402 - top up credit.")
                sys.exit(4)
            why = None
            if kind == "daily" and mcfg.get("free_tier") and C.PARK_MODEL_ON_DAILY_LIMIT:
                why = "daily free-tier quota exhausted; resets 00:00 UTC"
            elif kind == "no_endpoint":
                why = f"pinned provider '{mcfg.get('provider')}' unavailable for this model"
            elif kind == "connection" and mcfg["endpoint"] == "local":
                why = "local llama-server unreachable"
            elif consec[alias] >= C.CONSECUTIVE_FAIL_PARK:
                why = f"{consec[alias]} consecutive failed tasks (last: {kind})"
            if why:
                parked[alias] = why
                st.set(parked=dict(parked))
                print(f"    -> PARKED {alias}: {why}")
            continue

        consec[alias] = 0
        artifact = {
            "sample_id": sid, "scenario_id": sc["id"], "track": track, "module": sc["module"],
            "cwe": sc["cwe"], "lang": sc["lang"], "expected_vulnerable": sc["expected_vulnerable"],
            "model": alias, "model_id": mcfg["model_id"], "pinned_provider": mcfg.get("provider"),
            "regime": t["regime"], "pass": t["pass"], "prompt": sc["prompt"],
            "system_prompt_chars": len(system), "raw_response": text, "attempts": attempts,
            "seed": seed_for(sid),
            "sampling": {"temperature": C.TEMPERATURE, "top_p": C.TOP_P, "top_k": C.TOP_K,
                         "max_tokens": C.MAX_TOKENS},
            "api_meta": meta, "timestamp": time.time(),
        }
        dest.write_text(json.dumps(artifact, indent=2, ensure_ascii=False), encoding="utf-8")
        clear_failure(alias, sid)
        with open(runlog_path(), "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"sample_id": sid, "model": alias, "provider": meta["provider"],
                                 "served_model": meta["served_model"], "usage": meta["usage"],
                                 "reasoning_detected": meta["reasoning_detected"],
                                 "finish_reason": meta["finish_reason"], "ts": time.time()}) + "\n")
        st.bump("generated_now")
        flag = "  REASONING DETECTED" if meta["reasoning_detected"] else ""
        print(f"    -> ok (provider={meta['provider']}){flag}")

    pending = sum(len(load_failures(a)) for a in ([args.only_model] if args.only_model else C.MODELS))
    st.set(status="finished", current=None)
    print("\n" + "=" * 60)
    for k in ("skipped_existing", "generated_now", "failed_now"):
        print(f"  {k:<18}: {st.d[k]}")
    print(f"  pending failures  : {pending}")
    print(f"  spend so far      : ${ledger.total_spent():.4f}")
    if parked:
        print(f"  parked            : {parked}")
    print("=" * 60)


if __name__ == "__main__":
    main()
