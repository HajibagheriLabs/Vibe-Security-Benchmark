"""
Spend ledger and budget guard.

Every model call (generation, judging, pre-flight probes; smoke or full) appends
one line to vibe-benchmark/spend_ledger.jsonl. Cost comes from OpenRouter's own
usage.cost when present, otherwise it is estimated from config.PRICES. The
budget guard reads the same file, so it cannot drift from what was spent.
"""
import json
import time

import config as C


def usage_from(raw: dict) -> dict:
    """Normalise an OpenAI-SDK model_dump() into the fields we track."""
    u = (raw or {}).get("usage") or {}
    details = u.get("completion_tokens_details") or {}
    return {
        "prompt_tokens": u.get("prompt_tokens") or 0,
        "completion_tokens": u.get("completion_tokens") or 0,
        "reasoning_tokens": details.get("reasoning_tokens") or 0,
        "cost": u.get("cost"),            # USD, OpenRouter usage accounting
    }


def estimate(model_id: str, prompt_tokens: int, completion_tokens: int, which="now") -> float:
    p = C.PRICES.get(model_id, {}).get(which, (0.0, 0.0))
    return prompt_tokens / 1e6 * p[0] + completion_tokens / 1e6 * p[1]


def record(phase: str, model_id: str, provider_served, usage: dict, **extra) -> float:
    cost = usage.get("cost")
    estimated = cost is None
    if estimated:
        cost = estimate(model_id, usage["prompt_tokens"], usage["completion_tokens"])
    row = {"ts": time.time(), "phase": phase, "smoke": C.SMOKE, "model_id": model_id,
           "provider": provider_served, "prompt_tokens": usage["prompt_tokens"],
           "completion_tokens": usage["completion_tokens"],
           "reasoning_tokens": usage["reasoning_tokens"],
           "cost": round(float(cost), 8), "cost_estimated": estimated}
    row.update(extra)
    with open(C.LEDGER, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")
    return cost


def rows():
    if not C.LEDGER.exists():
        return []
    out = []
    for line in C.LEDGER.read_text(encoding="utf-8").splitlines():
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out


def total_spent() -> float:
    return sum(r.get("cost") or 0.0 for r in rows())


def over_budget() -> bool:
    return total_spent() >= C.BUDGET_USD
