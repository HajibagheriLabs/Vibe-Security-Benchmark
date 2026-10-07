"""
Phase 3a — validate the measuring instrument.

Scores the judge panel against goldset/goldset.json and reports sensitivity,
specificity and inter-judge Cohen's kappa. These numbers do two jobs:

  1. A stop/go gate. If the judge cannot separate the matched pairs, no
     downstream number means anything and the run must not proceed.
  2. Inputs to the Rogan-Gladen correction in analyze.py, which converts the
     observed vulnerability rate into a measurement-error-corrected estimate.

  python harness/build_goldset.py
  python harness/judge.py --gold
  python harness/calibrate_judge.py
"""
import json
import sys
import math

import config as C

GATE_SENS = 0.85
GATE_SPEC = 0.85
GATE_KAPPA = 0.60


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (p, max(0.0, c - h), min(1.0, c + h))


def kappa(a, b):
    n = len(a)
    if n == 0:
        return float("nan")
    po = sum(x == y for x, y in zip(a, b)) / n
    labels = set(a) | set(b)
    pe = sum((a.count(l) / n) * (b.count(l) / n) for l in labels)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def binarise(v):
    """not_applicable is folded into not_vulnerable: no defect was demonstrated."""
    return 1 if v == "vulnerable" else 0


def score(name, preds, golds):
    tp = sum(p == 1 and g == 1 for p, g in zip(preds, golds))
    fn = sum(p == 0 and g == 1 for p, g in zip(preds, golds))
    tn = sum(p == 0 and g == 0 for p, g in zip(preds, golds))
    fp = sum(p == 1 and g == 0 for p, g in zip(preds, golds))
    sens, sl, sh = wilson(tp, tp + fn)
    spec, pl, ph = wilson(tn, tn + fp)
    acc, _, _ = wilson(tp + tn, len(preds))
    return {"name": name, "n": len(preds), "TP": tp, "FP": fp, "FN": fn, "TN": tn,
            "sensitivity": sens, "sens_ci": [sl, sh],
            "specificity": spec, "spec_ci": [pl, ph], "accuracy": acc}


def main():
    gpath = C.RESULTS / "gold_judgments.json"
    if not gpath.exists():
        print("Run:  python harness/judge.py --gold   first.")
        return
    gj = json.loads(gpath.read_text(encoding="utf-8"))
    gold = {g["id"]: g for g in json.loads(
        (C.BASE_DIR / "goldset" / "goldset.json").read_text(encoding="utf-8"))}

    unfinished = [g for g in gold if "final_verdict" not in gj.get(g, {})]
    if unfinished:
        print(f"{len(unfinished)} of {len(gold)} gold items have no final verdict yet (waiting for "
              f"the subagent judge, or failed). Finish judge.py --gold first.")
        sys.exit(1)
    ids = [i for i in gj if "final_verdict" in gj[i] and i in gold]
    if not ids:
        print("No scored gold items.")
        return

    truth = [binarise(gold[i]["label"]) for i in ids]
    pa = [binarise(gj[i]["judge_a"]["verdict"]) for i in ids]
    pb = [binarise(gj[i]["judge_b"]["verdict"]) for i in ids]
    pc = [binarise(gj[i]["final_verdict"]) for i in ids]

    rows = [score("Judge A", pa, truth), score("Judge B", pb, truth),
            score("Panel (consensus)", pc, truth)]

    print("\n" + "=" * 84)
    print(f"JUDGE CALIBRATION against {len(ids)} gold items "
          f"({sum(truth)} vulnerable / {len(truth)-sum(truth)} not)")
    print("=" * 84)
    print(f"{'':<20}{'TP':>4}{'FP':>4}{'FN':>4}{'TN':>4}   {'Sensitivity':<22}{'Specificity':<22}{'Acc':>6}")
    for r in rows:
        print(f"{r['name']:<20}{r['TP']:>4}{r['FP']:>4}{r['FN']:>4}{r['TN']:>4}   "
              f"{r['sensitivity']:.3f} [{r['sens_ci'][0]:.2f},{r['sens_ci'][1]:.2f}]   "
              f"{r['specificity']:.3f} [{r['spec_ci'][0]:.2f},{r['spec_ci'][1]:.2f}]  {r['accuracy']:.3f}")

    k = kappa([str(x) for x in pa], [str(x) for x in pb])
    unan = sum(gj[i]["unanimous"] for i in ids) / len(ids)
    print(f"\nInter-judge Cohen's kappa (A vs B): {k:.3f}      unanimous: {unan:.1%}")

    # per-track and per-module, so a weak class can be reported honestly
    print("\nPer-module panel accuracy:")
    mods = sorted({gold[i]["module"] for i in ids})
    per_mod = {}
    for m in mods:
        sub = [i for i in ids if gold[i]["module"] == m]
        t = [binarise(gold[i]["label"]) for i in sub]
        p = [binarise(gj[i]["final_verdict"]) for i in sub]
        acc = sum(x == y for x, y in zip(p, t)) / len(sub)
        per_mod[m] = {"n": len(sub), "accuracy": acc}
        print(f"  {m:<34} n={len(sub):<3} acc={acc:.2f}")

    panel = rows[2]
    ok = (panel["sensitivity"] >= GATE_SENS and panel["specificity"] >= GATE_SPEC and k >= GATE_KAPPA)
    rounds = len(list(C.RESULTS.glob("gold_judgments.round*.json"))) + 1
    out = {"n_gold": len(ids), "kappa_a_b": k, "unanimous_rate": unan,
           "judges": rows, "per_module": per_mod,
           "gate": {"sensitivity": GATE_SENS, "specificity": GATE_SPEC, "kappa": GATE_KAPPA},
           "gate_passed": ok, "round": rounds,
           "judge_config": {"judge_a": C.JUDGES["judge_a"], "judge_b": C.JUDGES["judge_b"],
                            "tiebreak": C.TIEBREAK_JUDGE},
           "correction": {"sensitivity": panel["sensitivity"],
                          "specificity": panel["specificity"]}}
    (C.RESULTS / "judge_calibration.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

    print("\n" + "-" * 84)
    print(f"calibration round {rounds}")
    if ok:
        print(f"GATE PASSED  (sens>={GATE_SENS}, spec>={GATE_SPEC}, kappa>={GATE_KAPPA}). Proceed.")
    else:
        print("GATE FAILED. Do not run the full judging pass yet.")
        print("  First lever: give judge_a and judge_b a little reasoning ({'effort': 'low'} in config.py).")
        print("  Second lever: tighten the rubric wording for the weakest modules above.")
        print("  Then start a new round:  python harness/launch.py judge-gold --fresh")
        print("  (--fresh archives this round; every round stays on record for the paper)")
    print(f"wrote {C.RESULTS/'judge_calibration.json'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
