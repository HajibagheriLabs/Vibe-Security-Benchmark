"""
Budget forecast, and actual spend from the ledger.

  python harness/cost_estimate.py              # forecast at today's discounted prices
  python harness/cost_estimate.py --list       # forecast if every promotion has ended
  python harness/cost_estimate.py --actual     # what has really been spent (ledger)

Prices live in config.PRICES (USD per 1M tokens). Every assumption below is a
named constant so the arithmetic can be checked by hand.
"""
import argparse
import collections
import json

import config as C
import ledger

TOK_PER_CHAR = 1 / 3.5          # conservative for code + markdown

# --- generation assumptions (per call) ---
OUT_BASELINE = 800              # visible output tokens, baseline arm
OUT_GUARDED = 1400              # guardrailed answers run longer
RETRY_OVERHEAD = 0.05           # truncations / transient re-calls

# --- judging assumptions ---
CODE_TOKENS = 1400              # mean extracted code per artifact, line-numbered
JUDGE_JSON_OUT = 300            # visible JSON verdict
TIE_RATE = 0.15                 # share of items where judge A and B disagree
GOLD_RERUNS = 1                 # one extra gold-set pass if the gate needs a rubric fix
REASONING = {                   # reasoning tokens per call: (expected, worst case)
    "judge_a": (0, 1500),       # GLM 5.3 Flash, reasoning disabled; worst = cannot disable
    "judge_b": (150, 1500),     # Claude Sonnet 5 subagent: $0 here, paid by the Claude plan
    "judge_c": (800, 3000),     # GPT-5.6 Sol at low effort
}


def n_scenarios(track):
    return len(json.loads((C.HARNESS / f"scenarios_{track}.json").read_text(encoding="utf-8")))


def tok(path):
    return int(len(path.read_text(encoding="utf-8")) * TOK_PER_CHAR)


def price(model_id, which):
    return C.PRICES[model_id][which]


def usd(model_id, m_in, m_out, which):
    pi, po = price(model_id, which)
    return m_in * pi + m_out * po


def forecast(which):
    print(f"Prices: {'LIST (promotions ended)' if which == 'list' else 'CURRENT discounted'} "
          f"- from config.PRICES, USD per 1M tokens\n")
    frame = int(len(C.FRAME) * TOK_PER_CHAR) + 15
    user = 30
    rules = {t: tok(C.rules_path(t)) for t in ("web", "app")}
    calls_per_regime = {t: n_scenarios(t) * len(C.PASSES) for t in ("web", "app")}

    # ---------------- A. generation
    print("=" * 84)
    print("A. GENERATION  (per generator: 240 calls = 60 scenarios x 2 regimes x 2 passes)")
    print("=" * 84)
    print(f"  input/call: frame {frame} + prompt {user}; guardrailed adds AGENT_RULES "
          f"web {rules['web']} / app {rules['app']}")
    print(f"  output/call: baseline {OUT_BASELINE}, guardrailed {OUT_GUARDED}\n")
    g_in = g_out = 0
    for t in ("web", "app"):
        n = calls_per_regime[t]
        g_in += n * (frame + user) + n * (frame + user + rules[t])
        g_out += n * OUT_BASELINE + n * OUT_GUARDED
    gen_total = 0.0
    for alias, m in C.MODELS.items():
        mid = m["model_id"]
        cost = usd(mid, g_in / 1e6, g_out / 1e6, which) * (1 + RETRY_OVERHEAD)
        pi, po = price(mid, which)
        print(f"  {alias:<16} {g_in/1e6:.3f}M in x ${pi:<5} + {g_out/1e6:.3f}M out x ${po:<5}"
              f" (+{RETRY_OVERHEAD:.0%})  = ${cost:6.2f}")
        gen_total += cost

    # ---------------- B. judging
    sys_t = tok(C.HARNESS / "prompts" / "judge_system.md")
    rub = json.loads((C.HARNESS / "rubrics" / "rubrics.json").read_text(encoding="utf-8"))
    rub_t = sum(int(len(json.dumps(v)) * TOK_PER_CHAR) for k, v in rub.items()
                if not k.startswith("_")) // (len(rub) - 1)
    j_in = sys_t + rub_t + user + CODE_TOKENS + 40
    artifacts = sum(n_scenarios(t) for t in ("web", "app")) * len(C.MODELS) * len(C.REGIMES) * len(C.PASSES)
    gold = len(json.loads((C.BASE_DIR / "goldset" / "goldset.json").read_text(encoding="utf-8")))
    items = artifacts + gold * (1 + GOLD_RERUNS)
    ties = round(items * TIE_RATE)

    print("\n" + "=" * 84)
    print("B. JUDGING")
    print("=" * 84)
    print(f"  input/call: system {sys_t} + rubric {rub_t} + prompt {user} + code {CODE_TOKENS} "
          f"+ 40 = {j_in} tok;  visible output {JUDGE_JSON_OUT} tok")
    print(f"  items: {artifacts} artifacts + {gold} gold x {1 + GOLD_RERUNS} = {items}   "
          f"ties at {TIE_RATE:.0%}: {ties}\n")
    j_exp = j_worst = 0.0
    plan = [("judge_a", C.JUDGES["judge_a"], items), ("judge_b", C.JUDGES["judge_b"], items),
            ("judge_c", C.TIEBREAK_JUDGE, ties)]
    for key, jc, n in plan:
        mid = jc["model_id"]
        r_exp, r_worst = REASONING[key]
        m_in = n * j_in / 1e6
        e = usd(mid, m_in, n * (JUDGE_JSON_OUT + r_exp) / 1e6, which)
        w = usd(mid, m_in, n * (JUDGE_JSON_OUT + r_worst) / 1e6, which)
        pi, po = price(mid, which)
        print(f"  {key} {mid:<26} {n:>4} calls  {m_in:.3f}M in x ${pi:<5} + "
              f"{n*(JUDGE_JSON_OUT+r_exp)/1e6:.3f}M out x ${po:<5} = ${e:5.2f}   (worst ${w:5.2f})")
        j_exp += e
        j_worst += w

    # ---------------- C. small items
    smoke = usd("deepseek/deepseek-v4-pro-0813", 24 * 2000 / 1e6, 24 * 1100 / 1e6, which)
    pre = 0.05
    print("\n" + "=" * 84)
    print("C. PRE-FLIGHT PROBES + SMOKE TEST (24 DeepSeek calls; Qwen/Nemotron free)")
    print("=" * 84)
    print(f"  ~${pre + smoke:.2f}")

    total = gen_total + j_exp + pre + smoke
    worst = gen_total * 2 + j_worst + pre + smoke
    print("\n" + "=" * 84)
    print(f"  generation              ${gen_total:6.2f}")
    print(f"  judging (expected)      ${j_exp:6.2f}")
    print(f"  probes + smoke          ${pre + smoke:6.2f}")
    print(f"  TOTAL EXPECTED          ${total:6.2f}")
    print(f"  WORST CASE              ${worst:6.2f}   (2x generation output, max judge reasoning)")
    print(f"  budget cap in config    ${C.BUDGET_USD:6.2f}")
    print("=" * 84)
    print("  Paid from your existing OpenRouter balance; no new top-up fee.")
    print("  Free-tier requests used: 240 Nemotron + 24 smoke + probes (cap 1000/day).")


def actual():
    rows = ledger.rows()
    if not rows:
        print("ledger is empty - nothing spent yet")
        return
    agg = collections.defaultdict(lambda: [0, 0, 0, 0, 0.0, 0])
    for r in rows:
        a = agg[(r["phase"], r["model_id"])]
        a[0] += 1
        a[1] += r["prompt_tokens"]
        a[2] += r["completion_tokens"]
        a[3] += r["reasoning_tokens"]
        a[4] += r.get("cost") or 0.0
        a[5] += bool(r.get("cost_estimated"))
    print(f"{'phase':<12}{'model':<42}{'calls':>6}{'in':>11}{'out':>10}{'reason':>9}{'USD':>9}")
    for (ph, mid), a in sorted(agg.items()):
        est = " *" if a[5] else ""
        print(f"{ph:<12}{mid:<42}{a[0]:>6}{a[1]:>11,}{a[2]:>10,}{a[3]:>9,}{a[4]:>9.4f}{est}")
    print(f"{'TOTAL':<54}{'':>36}{sum(a[4] for a in agg.values()):>9.4f}")
    if any(a[5] for a in agg.values()):
        print("* some rows estimated from config.PRICES (provider returned no usage.cost)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--actual", action="store_true")
    ap.add_argument("--list", action="store_true", help="use list prices (promotions ended)")
    a = ap.parse_args()
    actual() if a.actual else forecast("list" if a.list else "now")
