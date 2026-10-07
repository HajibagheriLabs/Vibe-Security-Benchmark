"""
Phase 3 - ground truth by blind LLM-as-judge.

Judge A (GLM 5.3 Flash) and Judge B (Claude Sonnet 5, a Claude Code subagent)
score every artifact independently; GPT-5.6 Sol breaks ties. Judges see extracted
CODE ONLY: no model name, no regime, no prose, no reasoning. Resumable and idempotent.

A subagent judge cannot be called from here. judge.py writes its prompt to
subagent_judge/<opaque key>.prompt.md and leaves the item waiting; the operator runs
the subagent on each waiting prompt, then runs judge.py again, which reads the
answers, calls the tiebreak where needed and finishes the items.

  python harness/judge.py --gold          # calibration gold set (run first)
  python harness/judge.py                 # the benchmark corpus
  python harness/judge.py --retry-failed
"""
import argparse
import hashlib
import json
import re
import sys
import time

from openai import OpenAI

import config as C
import ledger

SYSTEM = (C.HARNESS / "prompts" / "judge_system.md").read_text(encoding="utf-8")
RUBRICS = json.loads((C.HARNESS / "rubrics" / "rubrics.json").read_text(encoding="utf-8"))
MAX_CODE_CHARS = 26000


def rubric_for(track, module):
    return RUBRICS["benign"] if module == "benign" else RUBRICS[f"{track}/{module}"]


def build_user_prompt(task_prompt, track, module, files):
    r = rubric_for(track, module)
    body = [f"## Task the developer was given\n\n{task_prompt}\n",
            f"## Vulnerability class under review: {r['title']}\n",
            "**Counts as VULNERABLE if any of these is true:**"]
    body += [f"- {x}" for x in r["vulnerable_if"]]
    body.append("\n**Counts as NOT VULNERABLE if:**")
    body += [f"- {x}" for x in r["not_vulnerable_if"]]
    body.append(f"\n**Note:** {r['notes']}\n")
    body.append("## Submitted code\n")
    total = 0
    if not files:
        body.append("_(No code files were produced.)_")
    for name, code in files.items():
        if total >= MAX_CODE_CHARS:
            body.append("\n_(remaining files omitted for length)_")
            break
        chunk = code[: MAX_CODE_CHARS - total]
        total += len(chunk)
        numbered = "\n".join(f"{i:>4} | {ln}" for i, ln in enumerate(chunk.split("\n"), 1))
        body.append(f"### FILE: {name}\n```\n{numbered}\n```\n")
    body.append("\nReturn the JSON object now.")
    return "\n".join(body)


def parse_json(text):
    t = re.sub(r"^```(?:json)?\s*", "", text.strip())
    t = re.sub(r"\s*```$", "", t)
    try:
        return json.loads(t)
    except Exception:
        m = re.search(r"\{.*\}", t, re.S)
        if m:
            return json.loads(m.group(0))
        raise


class Stop(Exception):
    pass


class Pending(Exception):
    """A subagent judge has not answered yet. args[0] is the prompt file to run it on."""


_agent_checked = set()


def check_agent(jcfg):
    """The subagent must be the judge described in config: system prompt identical to
    prompts/judge_system.md, same model and effort, no CLAUDE.md, Read/Write only."""
    if jcfg["agent"] in _agent_checked:
        return
    p = C.BASE_DIR / ".claude" / "agents" / f"{jcfg['agent']}.md"
    if not p.exists():
        raise Stop(f"subagent definition {p} not found")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", p.read_text(encoding="utf-8").replace("\r\n", "\n"), re.S)
    if not m:
        raise Stop(f"{p}: no YAML frontmatter")
    front = {k.strip(): v.strip() for k, _, v in
             (ln.partition(":") for ln in m.group(1).splitlines() if ":" in ln)}
    want = {"model": jcfg["model_id"], "effort": jcfg["reasoning"].get("effort"),
            "omitClaudeMd": "true", "tools": "Read, Write"}
    bad = [f"{k}={front.get(k)!r} (want {v!r})" for k, v in want.items() if front.get(k) != v]
    if m.group(2).strip() != SYSTEM.replace("\r\n", "\n").strip():
        bad.append("system prompt differs from prompts/judge_system.md")
    if bad:
        raise Stop(f"{p}: " + "; ".join(bad))
    _agent_checked.add(jcfg["agent"])


def subagent_key(model_id, phase, item_id):
    """Opaque file name: item ids carry the model, regime and (gold) label. The judge
    model is part of the key, so an answer can never be reused by a different model."""
    return hashlib.sha256(f"{model_id}:{phase}:{item_id}".encode()).hexdigest()[:20]


def ask_subagent(jcfg, user_prompt, phase, item_id):
    check_agent(jcfg)
    d = C.SUBAGENT_DIR
    d.mkdir(parents=True, exist_ok=True)
    key = subagent_key(jcfg["model_id"], phase, item_id)
    req, resp = d / f"{key}.prompt.md", d / f"{key}.response.json"
    if not resp.exists():
        if not req.exists() or req.read_text(encoding="utf-8") != user_prompt:
            req.write_text(user_prompt, encoding="utf-8")
            idx_path = C.RESULTS / "subagent_judge_index.json"
            idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {}
            idx[key] = {"phase": phase, "item_id": item_id, "judge": jcfg["model_id"]}
            idx_path.parent.mkdir(parents=True, exist_ok=True)
            idx_path.write_text(json.dumps(idx, indent=2), encoding="utf-8")
        raise Pending(str(req))
    usage = {"prompt_tokens": 0, "completion_tokens": 0, "reasoning_tokens": 0, "cost": 0.0}
    try:
        out = parse_json(resp.read_text(encoding="utf-8-sig"))
        if out.get("verdict") not in ("vulnerable", "not_vulnerable", "not_applicable"):
            raise ValueError(f"bad verdict field: {out.get('verdict')!r}")
    except Exception as e:
        # an unusable answer is a failed attempt, like a bad API response: keep it on
        # record and ask again, at most 3 attempts per run
        k = len(list(d.glob(f"{key}.response.bad*.json"))) + 1
        resp.rename(d / f"{key}.response.bad{k}.json")
        print(f"      [{jcfg['model_id']} attempt {k}] {type(e).__name__}: {str(e)[:150]}")
        if k % 3 == 0:
            raise RuntimeError(f"subagent answer unusable {k} times: {type(e).__name__}: {e}")
        raise Pending(str(req))
    ledger.record(phase, jcfg["model_id"], "claude-code-subagent", usage, subagent_key=key)
    out["_meta"] = {"provider": "claude-code-subagent", "usage": usage, "subagent_key": key}
    return out


def heartbeat(path, **kw):
    import os
    d = {"pid": os.getpid(), "updated": time.time()}
    d.update(kw)
    path.write_text(json.dumps(d, indent=2), encoding="utf-8")


def ask_judge(client, jcfg, user_prompt, phase, item_id=None):
    if jcfg.get("endpoint") == "subagent":
        return ask_subagent(jcfg, user_prompt, phase, item_id)
    last = None
    for attempt in range(1, 4):
        if ledger.over_budget():
            raise Stop(f"budget cap ${C.BUDGET_USD} reached")
        try:
            raw = client.chat.completions.create(
                model=jcfg["model_id"],
                messages=[{"role": "system", "content": SYSTEM},
                          {"role": "user", "content": user_prompt}],
                temperature=C.JUDGE_TEMPERATURE,
                max_tokens=jcfg["max_tokens"],
                extra_body=C.openrouter_body_extras(jcfg["provider"],
                                                    {"reasoning": jcfg["reasoning"]}),
            ).model_dump()
            ch = raw["choices"][0]
            usage = ledger.usage_from(raw)
            ledger.record(phase, jcfg["model_id"], raw.get("provider"), usage,
                          finish_reason=ch.get("finish_reason"))
            if ch.get("finish_reason") == "length":
                raise ValueError(f"truncated at max_tokens={jcfg['max_tokens']} "
                                 f"(reasoning_tokens={usage['reasoning_tokens']})")
            out = parse_json((ch.get("message") or {}).get("content") or "")
            if out.get("verdict") not in ("vulnerable", "not_vulnerable", "not_applicable"):
                raise ValueError(f"bad verdict field: {out.get('verdict')!r}")
            out["_meta"] = {"provider": raw.get("provider"), "usage": usage}
            return out
        except Stop:
            raise
        except Exception as e:
            status = getattr(e, "status_code", None)
            if status == 402:
                raise Stop("OpenRouter credit balance exhausted (402)")
            last = f"{type(e).__name__}: {e}"
            print(f"      [{jcfg['model_id']} attempt {attempt}] {last[:150]}")
            time.sleep(4 ** attempt)
    raise RuntimeError(last)


def load_items(gold):
    if gold:
        data = json.loads((C.BASE_DIR / "goldset" / "goldset.json").read_text(encoding="utf-8"))
        for it in data:
            yield {"id": it["id"], "track": it["track"], "module": it["module"],
                   "prompt": it["prompt"], "files": it["files"], "label": it["label"]}
        return
    for track in ["web", "app"]:
        d = C.extracted_dir(track)
        if not d.exists():
            continue
        for sub in sorted(p for p in d.iterdir() if p.is_dir()):
            man = sub / "_manifest.json"
            if not man.exists():
                continue
            m = json.loads(man.read_text(encoding="utf-8"))
            files = {n: (sub / n).read_text(encoding="utf-8", errors="replace")
                     for n in m["file_list"] if (sub / n).exists()}
            yield {"id": m["sample_id"], "track": track, "module": m["module"],
                   "prompt": m["prompt"], "files": files, "label": None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gold", action="store_true")
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--fresh", action="store_true",
                    help="gold only: archive the previous calibration round and start a new one")
    args = ap.parse_args()

    C.require_key()
    client = OpenAI(base_url=C.OPENROUTER_BASE_URL, api_key=C.OPENROUTER_KEY,
                    default_headers=C.OPENROUTER_HEADERS, timeout=300.0, max_retries=0)
    C.RESULTS.mkdir(parents=True, exist_ok=True)
    out_path = C.RESULTS / ("gold_judgments.json" if args.gold else "judgments.json")
    fail_path = C.RESULTS / ("gold_judge_failures.json" if args.gold else "judge_failures.json")
    phase = "judge_gold" if args.gold else "judge"
    if args.fresh:
        if not args.gold:
            sys.exit("--fresh is only for --gold (benchmark judgments are never discarded)")
        k = 1
        while (C.RESULTS / f"gold_judgments.round{k}.json").exists():
            k += 1
        for p in (out_path, fail_path, C.RESULTS / "judge_calibration.json"):
            if p.exists():
                p.rename(p.with_name(p.stem + f".round{k}.json"))
        print(f"archived previous calibration as round {k}")
    store = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
    fails = json.loads(fail_path.read_text(encoding="utf-8")) if fail_path.exists() else {}

    hb = C.RESULTS / ("judge_state_gold.json" if args.gold else "judge_state.json")
    items = list(load_items(args.gold))
    if args.retry_failed:
        items = [i for i in items if i["id"] in fails]
    print(f"{len(items)} items to judge ({'GOLD' if args.gold else 'BENCHMARK'}); "
          f"spend so far ${ledger.total_spent():.3f} of ${C.BUDGET_USD}")

    def save():
        out_path.write_text(json.dumps(store, indent=2), encoding="utf-8")
        fail_path.write_text(json.dumps(fails, indent=2), encoding="utf-8")

    waiting = []
    try:
        for n, it in enumerate(items, 1):
            if it["id"] in store and "final_verdict" in store[it["id"]]:
                continue
            prompt = build_user_prompt(it["prompt"], it["track"], it["module"], it["files"])
            rec = store.get(it["id"], {"track": it["track"], "module": it["module"],
                                       "n_files": len(it["files"]),
                                       "code_chars": sum(len(v) for v in it["files"].values()),
                                       "gold_label": it["label"]})
            print(f"[{n}/{len(items)}] {it['id']}")
            heartbeat(hb, status="running", current=it["id"], position=n, total=len(items))
            try:
                for key, jcfg in C.JUDGES.items():
                    if key not in rec:
                        rec[key] = ask_judge(client, jcfg, prompt, phase, it["id"])
                        print(f"    {key}: {rec[key]['verdict']}")
                va, vb = rec["judge_a"]["verdict"], rec["judge_b"]["verdict"]
                if va != vb:
                    if "judge_c" not in rec:
                        rec["judge_c"] = ask_judge(client, C.TIEBREAK_JUDGE, prompt, phase, it["id"])
                        print(f"    disagreement -> judge_c: {rec['judge_c']['verdict']}")
                    votes = [va, vb, rec["judge_c"]["verdict"]]
                    rec["final_verdict"] = max(set(votes), key=votes.count)
                    rec["unanimous"] = False
                else:
                    rec["final_verdict"], rec["unanimous"] = va, True
                rec["task_implemented"] = min(rec["judge_a"].get("task_implemented", 2),
                                              rec["judge_b"].get("task_implemented", 2))
                rec["refusal"] = bool(rec["judge_a"].get("refusal")) and bool(rec["judge_b"].get("refusal"))
                rec["declared_packages"] = sorted(set(rec["judge_a"].get("declared_packages", []))
                                                  | set(rec["judge_b"].get("declared_packages", [])))
                fails.pop(it["id"], None)
            except Stop:
                raise
            except Pending:
                waiting.append(it["id"])
                fails.pop(it["id"], None)
                print("    -> waiting for the subagent judge")
            except Exception as e:
                fails[it["id"]] = str(e)[:600]
                print("    -> judge FAILED, recorded")
            store[it["id"]] = rec
            if n % 10 == 0:
                save()
    except Stop as s:
        save()
        heartbeat(hb, status="stopped", stop_reason=str(s))
        print(f"\nSTOPPED: {s}")
        sys.exit(3)

    save()
    if waiting:
        heartbeat(hb, status="awaiting_subagent", awaiting=len(waiting), pending_failures=len(fails))
        print(f"\n{len(waiting)} items wait for the subagent judge: run it on every "
              f"*.prompt.md in {C.SUBAGENT_DIR} without a matching *.response.json, then run "
              f"this command again")
    else:
        heartbeat(hb, status="finished", pending_failures=len(fails))
    done = [v for v in store.values() if "final_verdict" in v]
    if done:
        u = sum(v["unanimous"] for v in done)
        print(f"\nscored {len(done)}  unanimous {u} ({u/len(done):.1%})  "
              f"pending failures {len(fails)}  spend ${ledger.total_spent():.3f}")


if __name__ == "__main__":
    main()
