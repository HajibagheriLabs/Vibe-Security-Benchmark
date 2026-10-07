"""
Phase 5 — analysis.

Produces every number the paper needs, with uncertainty attached:

  VIR   vulnerability injection rate, per track x model x regime, Wilson CI
  GRR   guardrail reduction rate, with a scenario-clustered bootstrap CI
  ARR   absolute risk reduction and odds ratio (GRR alone is unstable when the
        baseline rate is small and has no natural CI)
  McNemar exact paired test, scenario level
  Corrected VIR via Rogan-Gladen using the judge's measured sensitivity and
        specificity, so measurement error in the instrument is propagated
  Detector precision / recall / F1 against the judge panel, Wilson CIs
  Diagnostics: pass-to-pass consistency, verbosity bias, benign over-flagging,
        refusal and no-code rates, thinking leakage, token cost

  python harness/analyze.py
"""
import csv
import json
import math
import random
from collections import defaultdict

import config as C

Z = 1.96
BOOT = 5000
random.seed(20260905)


# ------------------------------------------------------------------ stats
def wilson(k, n):
    if n == 0:
        return (float("nan"), float("nan"), float("nan"))
    p, d = k / n, 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d
    h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return p, max(0.0, c - h), min(1.0, c + h)


def binom_p_two_sided(b, c):
    """Exact McNemar: P(X<=min | n=b+c, p=0.5), doubled."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    tail = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n)
    return min(1.0, 2 * tail)


def odds_ratio(a, n1, b, n2):
    """a/n1 vs b/n2 with Haldane-Anscombe correction; returns OR and 95% CI."""
    x1, y1 = a + 0.5, n1 - a + 0.5
    x2, y2 = b + 0.5, n2 - b + 0.5
    or_ = (x1 / y1) / (x2 / y2)
    se = math.sqrt(1 / x1 + 1 / y1 + 1 / x2 + 1 / y2)
    return or_, math.exp(math.log(or_) - Z * se), math.exp(math.log(or_) + Z * se)


def cluster_bootstrap_grr(rows):
    """Resample SCENARIOS (not artifacts) so within-scenario correlation is respected."""
    by_sc = defaultdict(list)
    for r in rows:
        by_sc[r["scenario_id"]].append(r)
    scenarios, out = list(by_sc), []
    if not scenarios:
        return (float("nan"),) * 3
    for _ in range(BOOT):
        draw = [by_sc[random.choice(scenarios)] for _ in scenarios]
        bv = bt = gv = gt = 0
        for grp in draw:
            for r in grp:
                if r["regime"] == "baseline":
                    bt += 1
                    bv += r["vuln"]
                else:
                    gt += 1
                    gv += r["vuln"]
        if bt and gt and bv:
            out.append((bv / bt - gv / gt) / (bv / bt))
    if not out:
        return (float("nan"),) * 3
    out.sort()
    return (sum(out) / len(out), out[int(0.025 * len(out))], out[int(0.975 * len(out)) - 1])


def rogan_gladen(observed, sens, spec):
    d = sens + spec - 1
    if d <= 0.05:
        return float("nan")
    return min(1.0, max(0.0, (observed + spec - 1) / d))


def kappa(a, b):
    n = len(a)
    if not n:
        return float("nan")
    po = sum(x == y for x, y in zip(a, b)) / n
    pe = sum((a.count(l) / n) * (b.count(l) / n) for l in set(a) | set(b))
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


# ------------------------------------------------------------------ load
def load():
    J = json.loads((C.RESULTS / "judgments.json").read_text(encoding="utf-8"))
    D = {}
    p = C.RESULTS / "detections.json"
    if p.exists():
        D = json.loads(p.read_text(encoding="utf-8"))
    cal = {}
    p = C.RESULTS / "judge_calibration.json"
    if p.exists():
        cal = json.loads(p.read_text(encoding="utf-8"))

    rows = []
    for track in ["web", "app"]:
        d = C.extracted_dir(track)
        if not d.exists():
            continue
        for sub in sorted(x for x in d.iterdir() if x.is_dir()):
            man = sub / "_manifest.json"
            if not man.exists():
                continue
            m = json.loads(man.read_text(encoding="utf-8"))
            j = J.get(m["sample_id"])
            if not j or "final_verdict" not in j:
                continue
            rows.append({
                "sample_id": m["sample_id"], "scenario_id": m["scenario_id"],
                "track": track, "module": m["module"], "model": m["model"],
                "regime": m["regime"], "pass": m["pass"],
                "expected_vulnerable": m["expected_vulnerable"],
                "vuln": 1 if j["final_verdict"] == "vulnerable" else 0,
                "verdict": j["final_verdict"], "unanimous": j["unanimous"],
                "va": j["judge_a"]["verdict"], "vb": j["judge_b"]["verdict"],
                "task_implemented": j.get("task_implemented", 2),
                "refusal": bool(j.get("refusal")),
                "no_code": m["no_code"], "code_chars": m["code_chars"],
                "thinking_leaked": m["thinking_leaked"],
                "det": D.get(m["sample_id"], {}),
            })
    return rows, cal


# ------------------------------------------------------------------ report
def main():
    rows, cal = load()
    if not rows:
        print("No judged artifacts. Run runner -> extract -> judge first.")
        return

    sens = cal.get("correction", {}).get("sensitivity")
    spec = cal.get("correction", {}).get("specificity")

    # primary population: security scenarios where a usable implementation exists
    prim = [r for r in rows if r["expected_vulnerable"] and r["task_implemented"] >= 1]
    benign = [r for r in rows if not r["expected_vulnerable"]]

    print("=" * 92)
    print(f"CORPUS  total judged {len(rows)}   security scenarios {sum(r['expected_vulnerable'] for r in rows)}"
          f"   benign controls {len(benign)}")
    print(f"        excluded from primary (no usable implementation): "
          f"{sum(1 for r in rows if r['expected_vulnerable'] and r['task_implemented'] < 1)}")
    print("=" * 92)

    # -------------------------------------------------- 1. VIR / GRR
    print("\nPART 1 — VULNERABILITY INJECTION RATE AND GUARDRAIL EFFECT\n")
    hdr = (f"{'Track':<5} {'Model':<15} {'Baseline VIR':<24} {'Guardrailed VIR':<24} "
           f"{'GRR [95% CI]':<24} {'OR [95% CI]':<20} {'McNemar p':>10}")
    print(hdr)
    print("-" * len(hdr))

    table1 = []
    for track in ["web", "app"]:
        for model in C.MODELS:
            sub = [r for r in prim if r["track"] == track and r["model"] == model]
            if not sub:
                continue
            b = [r for r in sub if r["regime"] == "baseline"]
            g = [r for r in sub if r["regime"] == "guardrailed"]
            bv, bt = sum(r["vuln"] for r in b), len(b)
            gv, gt = sum(r["vuln"] for r in g), len(g)
            bp, bl, bh = wilson(bv, bt)
            gp, gl, gh = wilson(gv, gt)
            grr, gcl, gch = cluster_bootstrap_grr(sub)
            or_, ol, oh = odds_ratio(gv, gt, bv, bt)

            # scenario-level pairing: "vulnerable in at least one pass"
            pb, pg = {}, {}
            for r in b:
                pb[r["scenario_id"]] = max(pb.get(r["scenario_id"], 0), r["vuln"])
            for r in g:
                pg[r["scenario_id"]] = max(pg.get(r["scenario_id"], 0), r["vuln"])
            common = set(pb) & set(pg)
            disc_b = sum(1 for s in common if pb[s] == 1 and pg[s] == 0)
            disc_g = sum(1 for s in common if pb[s] == 0 and pg[s] == 1)
            pval = binom_p_two_sided(disc_b, disc_g)

            print(f"{track.upper():<5} {model:<15} "
                  f"{bv:>3}/{bt:<3} {bp:6.1%} [{bl:.2f},{bh:.2f}]  "
                  f"{gv:>3}/{gt:<3} {gp:6.1%} [{gl:.2f},{gh:.2f}]  "
                  f"{grr:6.1%} [{gcl:.2f},{gch:.2f}]     "
                  f"{or_:5.2f} [{ol:.2f},{oh:.2f}]  {pval:>10.4g}")

            entry = {"track": track, "model": model,
                     "baseline_vuln": bv, "baseline_n": bt, "baseline_vir": bp,
                     "baseline_ci": [bl, bh],
                     "guard_vuln": gv, "guard_n": gt, "guard_vir": gp, "guard_ci": [gl, gh],
                     "arr": bp - gp, "grr": grr, "grr_ci": [gcl, gch],
                     "odds_ratio": or_, "or_ci": [ol, oh],
                     "mcnemar_b": disc_b, "mcnemar_c": disc_g, "mcnemar_p": pval,
                     "n_scenarios_paired": len(common)}
            if sens and spec:
                entry["baseline_vir_corrected"] = rogan_gladen(bp, sens, spec)
                entry["guard_vir_corrected"] = rogan_gladen(gp, sens, spec)
            table1.append(entry)

    if sens and spec:
        print(f"\nMeasurement-error-corrected VIR (Rogan-Gladen, judge sens={sens:.3f} spec={spec:.3f}):")
        for e in table1:
            print(f"  {e['track'].upper():<4} {e['model']:<15} "
                  f"baseline {e['baseline_vir']:.1%} -> {e['baseline_vir_corrected']:.1%}   "
                  f"guardrailed {e['guard_vir']:.1%} -> {e['guard_vir_corrected']:.1%}")
    else:
        print("\n(no judge calibration found — run calibrate_judge.py for corrected rates)")

    # -------------------------------------------------- 2. per class
    print("\n\nPART 2 — BY VULNERABILITY CLASS (models pooled)\n")
    print(f"{'Track':<5} {'Class':<34} {'Baseline':<14} {'Guardrailed':<14} {'ARR':>8}")
    print("-" * 78)
    table2 = []
    for track in ["web", "app"]:
        mods = sorted({r["module"] for r in prim if r["track"] == track})
        for mod in mods:
            sub = [r for r in prim if r["track"] == track and r["module"] == mod]
            b = [r for r in sub if r["regime"] == "baseline"]
            g = [r for r in sub if r["regime"] == "guardrailed"]
            bp = sum(r["vuln"] for r in b) / len(b) if b else float("nan")
            gp = sum(r["vuln"] for r in g) / len(g) if g else float("nan")
            print(f"{track.upper():<5} {mod:<34} {sum(r['vuln'] for r in b):>3}/{len(b):<3} {bp:6.1%}  "
                  f"{sum(r['vuln'] for r in g):>3}/{len(g):<3} {gp:6.1%}  {bp-gp:>7.1%}")
            table2.append({"track": track, "module": mod, "baseline_vir": bp,
                           "guard_vir": gp, "arr": bp - gp, "n": len(sub)})

    # -------------------------------------------------- 3. detectors
    det_meta = {}
    pm = C.RESULTS / "detection_meta.json"
    if pm.exists():
        det_meta = json.loads(pm.read_text(encoding="utf-8"))
    if any(r["det"] for r in rows):
        print("\n\nPART 3 — DETECTOR ACCURACY AGAINST THE JUDGE PANEL\n")
        print(f"{'Track':<5} {'Detector':<16} {'TP':>4}{'FP':>4}{'FN':>4}{'TN':>4}  "
              f"{'Precision':<22}{'Recall':<22}{'F1':>7}")
        print("-" * 90)
        table3 = []
        for track in ["web", "app"]:
            sub = [r for r in rows if r["track"] == track and r["expected_vulnerable"] and r["det"]]
            for det in ["oss_semgrep", "vibesec_rules", "vibesec_full"]:
                tp = sum(1 for r in sub if r["vuln"] and r["det"][det]["detected"])
                fn = sum(1 for r in sub if r["vuln"] and not r["det"][det]["detected"])
                fp = sum(1 for r in sub if not r["vuln"] and r["det"][det]["detected"])
                tn = sum(1 for r in sub if not r["vuln"] and not r["det"][det]["detected"])
                pr, pl, ph = wilson(tp, tp + fp)
                rc, rl, rh = wilson(tp, tp + fn)
                f1 = 0 if not (pr and rc) or math.isnan(pr) or math.isnan(rc) else 2 * pr * rc / (pr + rc)
                print(f"{track.upper():<5} {det:<16} {tp:>4}{fp:>4}{fn:>4}{tn:>4}  "
                      f"{pr:6.1%} [{pl:.2f},{ph:.2f}]    {rc:6.1%} [{rl:.2f},{rh:.2f}]   {f1:6.1%}")
                table3.append({"track": track, "detector": det, "TP": tp, "FP": fp,
                               "FN": fn, "TN": tn, "precision": pr, "recall": rc, "f1": f1})
        if det_meta:
            print(f"\n  Semgrep {det_meta.get('semgrep_version', '?')}")
            for track, m in det_meta.get("tracks", {}).items():
                sizes = m.get("oss_pack_sizes", {})
                print(f"  {track}: registry packs used: "
                      + (", ".join(f"{c} ({sizes[c]['rules']} rules)" if c in sizes else c
                                   for c in m["oss_used"]) or "none"))
                if m["oss_skipped"]:
                    print(f"  {track}: registry packs SKIPPED (report in the paper): "
                          f"{', '.join(m['oss_skipped'])}")
                for b in m.get("vibesec_rule_errors", []):
                    print(f"  {track}: project rule NOT LOADED by Semgrep (report in the paper): {b}")
    else:
        table3 = []
        print("\n(no detections.json — run detect.py for Part 3)")

    # -------------------------------------------------- 4. diagnostics
    print("\n\nPART 4 — DIAGNOSTICS AND VALIDITY CHECKS\n")

    k = kappa([r["va"] for r in rows], [r["vb"] for r in rows])
    unan = sum(r["unanimous"] for r in rows) / len(rows)
    print(f"  judge agreement on benchmark   kappa={k:.3f}, unanimous={unan:.1%}")

    cells = defaultdict(list)
    for r in rows:
        cells[(r["scenario_id"], r["model"], r["regime"])].append(r["vuln"])
    full = [v for v in cells.values() if len(v) == 2]
    cons = sum(1 for v in full if v[0] == v[1]) / len(full) if full else float("nan")
    print(f"  pass-to-pass consistency       {cons:.1%} of {len(full)} cells agree across both passes")

    for reg in C.REGIMES:
        s = [r for r in prim if r["regime"] == reg]
        if not s:
            continue
        vl = [r["code_chars"] for r in s if r["vuln"]]
        cl = [r["code_chars"] for r in s if not r["vuln"]]
        print(f"  median code size, {reg:<12} vulnerable {int(sorted(vl)[len(vl)//2]) if vl else 0:>6} ch"
              f" | clean {int(sorted(cl)[len(cl)//2]) if cl else 0:>6} ch")
    print("    (large gaps here indicate the judge may be responding to verbosity; "
          "check the matched gold pairs)")

    if benign:
        fb = sum(r["vuln"] for r in benign)
        print(f"\n  benign controls flagged vulnerable  {fb}/{len(benign)} ({fb/len(benign):.1%})"
              f"   <- guardrail/judge over-application")
        for det in ["oss_semgrep", "vibesec_rules"]:
            bb = [r for r in benign if r["det"]]
            if bb:
                n = sum(1 for r in bb if r["det"][det]["any_finding"])
                print(f"    {det:<16} raised >=1 finding on {n}/{len(bb)} benign artifacts")

    nrf = sum(r["refusal"] for r in rows)
    nnc = sum(r["no_code"] for r in rows)
    ntl = sum(r["thinking_leaked"] for r in rows)
    print(f"\n  refusals {nrf} ({nrf/len(rows):.1%})   no code emitted {nnc} ({nnc/len(rows):.1%})"
          f"   thinking leakage {ntl} ({ntl/len(rows):.1%})")
    for reg in C.REGIMES:
        s = [r for r in rows if r["regime"] == reg]
        t2 = sum(1 for r in s if r["task_implemented"] == 2) / len(s)
        print(f"  fully implemented, {reg:<12} {t2:.1%}"
              + ("   <- if far below baseline, the guardrails are costing functionality" if reg != "baseline" else ""))

    # cost
    log = C.RESULTS / "run_log.jsonl"
    if log.exists():
        tok = defaultdict(lambda: [0, 0])
        for line in log.read_text(encoding="utf-8").splitlines():
            try:
                e = json.loads(line)
            except Exception:
                continue
            u = e.get("usage") or {}
            m = (e.get("served_model") or "?")
            tok[m][0] += u.get("prompt_tokens", 0)
            tok[m][1] += u.get("completion_tokens", 0)
        print("\n  token usage")
        for m, (i, o) in sorted(tok.items()):
            print(f"    {m:<45} in {i:>9,}  out {o:>9,}")

    # -------------------------------------------------- outputs
    C.RESULTS.mkdir(parents=True, exist_ok=True)
    json.dump({"vir_grr": table1, "by_class": table2, "detectors": table3,
               "detector_provenance": det_meta,
               "judge_kappa": k, "pass_consistency": cons, "calibration": cal},
              open(C.RESULTS / "final_metrics.json", "w"), indent=2)

    with open(C.RESULTS / "artifacts.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["sample_id", "scenario_id", "track", "module", "model", "regime", "pass",
                    "expected_vulnerable", "verdict", "vuln", "unanimous", "task_implemented",
                    "refusal", "no_code", "code_chars",
                    "oss_detected", "vibesec_detected", "vibesec_full_detected"])
        for r in rows:
            d = r["det"]
            w.writerow([r["sample_id"], r["scenario_id"], r["track"], r["module"], r["model"],
                        r["regime"], r["pass"], r["expected_vulnerable"], r["verdict"], r["vuln"],
                        r["unanimous"], r["task_implemented"], r["refusal"], r["no_code"],
                        r["code_chars"],
                        d.get("oss_semgrep", {}).get("detected", ""),
                        d.get("vibesec_rules", {}).get("detected", ""),
                        d.get("vibesec_full", {}).get("detected", "")])

    with open(C.RESULTS / "table1.tex", "w", encoding="utf-8") as fh:
        fh.write("\\begin{tabular}{llrrrr}\n\\toprule\n")
        fh.write("Track & Model & Baseline VIR & Guardrailed VIR & GRR [95\\% CI] & $p$ \\\\\n\\midrule\n")
        for e in table1:
            fh.write(f"{e['track'].upper()} & {e['model'].replace('_',' ')} & "
                     f"{e['baseline_vir']*100:.1f}\\% & {e['guard_vir']*100:.1f}\\% & "
                     f"{e['grr']*100:.1f}\\% [{e['grr_ci'][0]*100:.0f}, {e['grr_ci'][1]*100:.0f}] & "
                     f"{e['mcnemar_p']:.3g} \\\\\n")
        fh.write("\\bottomrule\n\\end{tabular}\n")

    print(f"\nwrote results/final_metrics.json, results/artifacts.csv, results/table1.tex")


if __name__ == "__main__":
    main()
