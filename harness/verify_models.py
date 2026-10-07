"""
Phase 0 - pre-flight. Run before anything else and again before every resumed run.

For every generator and judge, with the EXACT production settings:
  1. the pinned provider endpoint exists on OpenRouter, with its live price,
     discount, context, max output and which parameters it honours
  2. a probe call succeeds, is served by the pinned provider, and (generators)
     does not reason, or (judges) returns a parseable verdict
  3. no vendor appears both as a generator and as a judge
  4. the local llama-server answers with thinking off

Writes results/preflight.json and exits 0 (READY) or 1 (NOT READY).

  python harness/verify_models.py
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request

from openai import OpenAI

import config as C
import ledger

PROBE = "Write a one-line JavaScript function that adds two numbers. Return only a code block."
CTX_MARGIN = 2000


def rules_tokens():
    return {t: (len(C.rules_path(t).read_text(encoding="utf-8")) // 4
                if C.rules_path(t).exists() else None) for t in ("web", "app")}


def endpoints(model_id):
    """OpenRouter list-endpoints API. Tries the id as given, then without ':free'."""
    for mid in (model_id, model_id.split(":")[0]):
        url = f"{C.OPENROUTER_BASE_URL}/models/{urllib.parse.quote(mid, safe='/:')}/endpoints"
        try:
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {C.OPENROUTER_KEY}"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r).get("data") or {}
                eps = data.get("endpoints") or []
                if eps:
                    return eps
        except Exception:
            continue
    return []


def norm(s):
    return (s or "").lower().replace(" ", "").replace("-", "").replace("_", "")


def pick(eps, provider, model_id):
    if provider:
        for e in eps:
            if norm(provider) in (norm(e.get("tag")), norm(e.get("provider_name"))) \
                    or norm(e.get("tag")).startswith(norm(provider)):
                return e
        return None
    if model_id.endswith(":free"):
        free = [e for e in eps if float((e.get("pricing") or {}).get("completion") or 0) == 0]
        return free[0] if free else (eps[0] if eps else None)
    return eps[0] if eps else None


def price_report(model_id, ep):
    pr = ep.get("pricing") or {}
    pin = float(pr.get("prompt") or 0) * 1e6
    pout = float(pr.get("completion") or 0) * 1e6
    disc = pr.get("discount")
    ref = C.PRICES.get(model_id, {})
    now, lst = ref.get("now"), ref.get("list")

    def close(ref_pair):
        if not ref_pair:
            return False
        return (abs(pin - ref_pair[0]) <= max(0.005, 0.03 * ref_pair[0])
                and abs(pout - ref_pair[1]) <= max(0.005, 0.03 * ref_pair[1]))

    if close(now):
        verdict = "matches expected discounted price"
    elif close(lst) and disc:
        verdict = f"list price with discount field {disc} (expected discounted price applies)"
    elif close(lst):
        verdict = "LIST PRICE - the promotion may have ended; re-run cost_estimate.py --list"
    else:
        verdict = "PRICE DIFFERS from config.PRICES - update it and re-run cost_estimate.py"
    return {"in_per_M": round(pin, 4), "out_per_M": round(pout, 4), "discount_field": disc,
            "verdict": verdict}


def probe_generator(client, mcfg):
    body = {"model": mcfg["model_id"], "temperature": C.TEMPERATURE, "max_tokens": 400,
            "messages": [{"role": "user", "content": PROBE}]}
    extra = (C.openrouter_body_extras(mcfg.get("provider"), mcfg.get("extra"))
             if mcfg["endpoint"] == "openrouter" else dict(mcfg.get("extra") or {}))
    extra["top_k"] = C.TOP_K
    body["extra_body"] = extra
    raw = client.chat.completions.create(**body).model_dump()
    ch = raw["choices"][0]
    msg = ch.get("message") or {}
    usage = ledger.usage_from(raw)
    if mcfg["endpoint"] == "openrouter":
        ledger.record("preflight", mcfg["model_id"], raw.get("provider"), usage)
    text = msg.get("content") or ""
    reasoning = bool(msg.get("reasoning") or msg.get("reasoning_content")
                     or usage["reasoning_tokens"] > 0 or "<think" in text.lower())
    return {"ok": bool(text.strip()), "reasoning_detected": reasoning,
            "finish_reason": ch.get("finish_reason"), "served_provider": raw.get("provider"),
            "served_model": raw.get("model"), "usage": usage,
            "preview": text.strip()[:100].replace("\n", " ")}


def probe_judge(client, jcfg):
    import judge
    g = json.loads((C.BASE_DIR / "goldset" / "goldset.json").read_text(encoding="utf-8"))
    item = next(x for x in g if x["id"] == "GW07V")
    prompt = judge.build_user_prompt(item["prompt"], item["track"], item["module"], item["files"])
    out = judge.ask_judge(client, jcfg, prompt, "preflight", item["id"])
    return {"ok": True, "verdict": out["verdict"], "expected": "vulnerable",
            "served_provider": out["_meta"]["provider"], "usage": out["_meta"]["usage"]}


def attempt(fn, *a):
    """One probe, retried twice on transient errors so a single hiccup is not NOT READY."""
    last = None
    for i in range(3):
        try:
            return fn(*a)
        except Exception as ex:
            last = ex
            txt = f"{type(ex).__name__} {ex}"
            if any(k in txt for k in ("401", "402", "403", "404", "Authentication", "NotFound")):
                break
            if i < 2:
                print(f"  probe attempt {i + 1} failed ({type(ex).__name__}); retrying")
                time.sleep(C.BACKOFF_BASE * (i + 1))
    raise last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--judges-only", action="store_true",
                    help="Stage B: probe only the judges (llama-server not needed)")
    args = ap.parse_args()
    C.require_key()
    C.RESULTS.mkdir(parents=True, exist_ok=True)
    report = {"generators": {}, "judges": {}, "problems": [], "warnings": []}
    P, W = report["problems"], report["warnings"]

    rt = rules_tokens()
    need = max(v for v in rt.values() if v) + C.MAX_TOKENS + CTX_MARGIN
    report["guardrail_tokens"] = rt
    print(f"Guardrail size: web ~{rt['web']} tok, app ~{rt['app']} tok "
          f"-> every generator needs >= {need} tokens of context")

    remote = OpenAI(base_url=C.OPENROUTER_BASE_URL, api_key=C.OPENROUTER_KEY,
                    default_headers=C.OPENROUTER_HEADERS, timeout=300.0, max_retries=0)
    local = OpenAI(base_url=C.LOCAL_BASE_URL, api_key="llama-cpp", timeout=600.0, max_retries=0)

    # ---------------- generators
    print("\n" + "=" * 90 + "\nGENERATORS (thinking must be OFF)"
          + ("  (judges only: generator probes skipped)" if args.judges_only else "") + "\n" + "=" * 90)
    for alias, m in ({} if args.judges_only else C.MODELS).items():
        r = {"model_id": m["model_id"], "pinned_provider": m.get("provider")}
        print(f"\n{alias}  ->  {m['model_id']}  pin={m.get('provider')}")
        if m["endpoint"] == "openrouter":
            ep = pick(endpoints(m["model_id"]), m.get("provider"), m["model_id"])
            if not ep:
                P.append(f"{alias}: endpoint/provider '{m.get('provider')}' not found on OpenRouter")
                print("  ENDPOINT NOT FOUND")
                report["generators"][alias] = r
                continue
            sp = ep.get("supported_parameters") or []
            r["endpoint"] = {"provider_name": ep.get("provider_name"), "tag": ep.get("tag"),
                             "status": ep.get("status"), "context": ep.get("context_length"),
                             "max_output": ep.get("max_completion_tokens"),
                             "quantization": ep.get("quantization"),
                             "honours": {k: (k in sp) for k in ("top_k", "seed", "reasoning",
                                                                  "temperature", "top_p")},
                             "price": price_report(m["model_id"], ep)}
            e = r["endpoint"]
            print(f"  endpoint {e['provider_name']} ctx={e['context']} max_out={e['max_output']} "
                  f"quant={e['quantization']} honours={e['honours']}")
            print(f"  price ${e['price']['in_per_M']}/${e['price']['out_per_M']} per M  "
                  f"-> {e['price']['verdict']}")
            if e["context"] and e["context"] < need:
                P.append(f"{alias}: context {e['context']} < required {need}")
            if e["max_output"] and e["max_output"] < C.MAX_TOKENS:
                P.append(f"{alias}: max output {e['max_output']} < MAX_TOKENS {C.MAX_TOKENS}")
            if not e["honours"]["reasoning"]:
                W.append(f"{alias}: endpoint does not list 'reasoning' - verify thinking-off via probe")
            if "PRICE" in e["price"]["verdict"]:
                W.append(f"{alias}: {e['price']['verdict']}")
        try:
            pr = attempt(probe_generator, remote if m["endpoint"] == "openrouter" else local, m)
            r["probe"] = pr
            print(f"  probe ok={pr['ok']} finish={pr['finish_reason']} provider={pr['served_provider']} "
                  f"reasoning_detected={pr['reasoning_detected']} "
                  f"reasoning_tokens={pr['usage']['reasoning_tokens']}")
            print(f"  preview: {pr['preview']}")
            if not pr["ok"]:
                P.append(f"{alias}: probe returned an empty body")
            if pr["reasoning_detected"]:
                P.append(f"{alias}: THINKING IS NOT OFF (reasoning detected) - user decision required")
            if m.get("provider") and pr["served_provider"] and \
                    norm(m["provider"]) not in norm(pr["served_provider"]):
                P.append(f"{alias}: served by {pr['served_provider']}, not pinned {m['provider']}")
        except Exception as ex:
            P.append(f"{alias}: probe failed: {type(ex).__name__}: {str(ex)[:200]}")
            print(f"  PROBE FAILED: {type(ex).__name__}: {str(ex)[:200]}")
        report["generators"][alias] = r

    # ---------------- judges
    print("\n" + "=" * 90 + "\nJUDGES\n" + "=" * 90)
    for key, j in list(C.JUDGES.items()) + [("judge_c", C.TIEBREAK_JUDGE)]:
        r = {"model_id": j["model_id"], "pinned_provider": j["provider"], "reasoning": j["reasoning"]}
        print(f"\n{key}  ->  {j['model_id']}  pin={j['provider']}  reasoning={j['reasoning']}")
        if j.get("endpoint") == "subagent":
            import judge
            r["endpoint"] = {"subagent": j["agent"]}
            print(f"  endpoint: Claude Code subagent '{j['agent']}' (not OpenRouter: no price, no pin)")
            try:
                jp = probe_judge(remote, j)
                r["probe"] = jp
                print(f"  probe verdict={jp['verdict']} (gold says {jp['expected']}) "
                      f"provider={jp['served_provider']}")
                if jp["verdict"] != jp["expected"]:
                    W.append(f"{key}: missed an obvious gold item on the probe - watch the calibration gate")
            except judge.Pending as p:
                P.append(f"{key}: subagent probe pending - run '{j['agent']}' on {p.args[0]}, "
                         f"then re-run verify_models.py")
                print(f"  PROBE PENDING: {p.args[0]}")
            except Exception as ex:
                P.append(f"{key}: probe failed: {type(ex).__name__}: {str(ex)[:200]}")
                print(f"  PROBE FAILED: {type(ex).__name__}: {str(ex)[:200]}")
            report["judges"][key] = r
            continue
        ep = pick(endpoints(j["model_id"]), j["provider"], j["model_id"])
        if not ep:
            P.append(f"{key}: provider '{j['provider']}' not found for {j['model_id']}")
            print("  ENDPOINT NOT FOUND")
        else:
            pr = price_report(j["model_id"], ep)
            r["endpoint"] = {"provider_name": ep.get("provider_name"), "status": ep.get("status"),
                             "max_output": ep.get("max_completion_tokens"), "price": pr,
                             "supports_reasoning": "reasoning" in (ep.get("supported_parameters") or [])}
            print(f"  endpoint {ep.get('provider_name')}  ${pr['in_per_M']}/${pr['out_per_M']} per M "
                  f"-> {pr['verdict']}")
            if "PRICE" in pr["verdict"]:
                W.append(f"{key}: {pr['verdict']}")
        try:
            jp = attempt(probe_judge, remote, j)
            r["probe"] = jp
            print(f"  probe verdict={jp['verdict']} (gold says {jp['expected']}) "
                  f"provider={jp['served_provider']} reasoning_tokens={jp['usage']['reasoning_tokens']} "
                  f"completion_tokens={jp['usage']['completion_tokens']}")
            if jp["verdict"] != jp["expected"]:
                W.append(f"{key}: missed an obvious gold item on the probe - watch the calibration gate")
            if j["provider"] and jp["served_provider"] and norm(j["provider"]) not in norm(jp["served_provider"]):
                P.append(f"{key}: served by {jp['served_provider']}, not pinned {j['provider']}")
        except Exception as ex:
            P.append(f"{key}: probe failed: {type(ex).__name__}: {str(ex)[:200]}")
            print(f"  PROBE FAILED: {type(ex).__name__}: {str(ex)[:200]}")
        report["judges"][key] = r

    # ---------------- independence
    gv = {m["vendor"] for m in C.MODELS.values()}
    jv = {j["vendor"] for j in list(C.JUDGES.values()) + [C.TIEBREAK_JUDGE]}
    clash = gv & jv
    report["vendors"] = {"generators": sorted(gv), "judges": sorted(jv), "overlap": sorted(clash)}
    print(f"\nVendors  generators={sorted(gv)}  judges={sorted(jv)}  overlap={sorted(clash) or 'none'}")
    if clash:
        P.append(f"vendor overlap between generators and judges: {sorted(clash)}")

    report["provenance"] = C.provenance()
    print("\nRepositories under test")
    for t, d in report["provenance"].items():
        print(f"  {t}: {d['repo']} @ {(d['commit'] or 'unknown')[:12]}{' (uncommitted changes)' if d['dirty'] else ''}"
              f"  AGENT_RULES sha256 {(d['agent_rules_sha256'] or 'MISSING')[:12]}")
        if not d["agent_rules_sha256"]:
            P.append(f"{t}: AGENT_RULES.md not found in {d['repo']}")
    frozen = C.RESULTS / "corpus_provenance.json"
    if frozen.exists():
        was = json.loads(frozen.read_text(encoding="utf-8"))
        for t, d in report["provenance"].items():
            if was.get(t, {}).get("agent_rules_sha256") != d["agent_rules_sha256"]:
                P.append(f"{t}: AGENT_RULES.md changed since the corpus was generated")
            if was.get(t, {}).get("semgrep_rules_sha256") != d["semgrep_rules_sha256"]:
                W.append(f"{t}: semgrep-rules.yml changed since the corpus was generated; report it as a deviation")

    report["spend_so_far"] = round(ledger.total_spent(), 4)
    report["ready"] = not P
    out_name = "preflight_judges.json" if args.judges_only else "preflight.json"
    report["time_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    (C.RESULTS / out_name).write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n" + "=" * 90)
    for w in W:
        print(f"  warning: {w}")
    if P:
        print("NOT READY:")
        for p in P:
            print(f"  - {p}")
        sys.exit(1)
    print(f"READY  (spend so far ${report['spend_so_far']:.4f}; details in results/{out_name})")


if __name__ == "__main__":
    main()
