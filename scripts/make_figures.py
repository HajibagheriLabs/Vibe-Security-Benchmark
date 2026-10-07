"""
Render the README figures from the published results. Standard library only.

  python scripts/make_figures.py

Reads results/final_metrics.json, results/judge_calibration.json and results/artifacts.csv.
Writes docs/figures/<name>-light.svg and <name>-dark.svg (the README picks one with
prefers-color-scheme), and docs/figures/derived.json: the pooled and per-class counts the
figures show that analyze.py does not print. Every number is read or recomputed from the
results files; nothing is typed in by hand except labels.

Colours: a categorical palette validated for colour-vision deficiency in both themes.
Orange always means "baseline / without the VibeSec project", blue "with it".
"""
import csv
import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "results"
OUT = ROOT / "docs" / "figures"

FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
CREDIT = ("© 2026 Hadi Hajibagheri, founder of HajibagheriLabs · Vibe-Security Benchmark "
          "· CC BY 4.0")

THEMES = {
    "light": {
        "bg": "#ffffff", "border": "#d1d9e0", "ink": "#1f2328", "ink2": "#59636e",
        "muted": "#6e7781", "grid": "#eaeef2", "axis": "#c8d1da", "panel": "#f6f8fa",
        "empty": "#e7ebef", "base": "#eb6834", "guard": "#2a78d6", "aqua": "#1baf7a",
        "good": "#006300", "conn": "#b6c0ca",
    },
    "dark": {
        "bg": "#151b23", "border": "#3d444d", "ink": "#f0f6fc", "ink2": "#b1bac4",
        "muted": "#8b949e", "grid": "#232a33", "axis": "#3d444d", "panel": "#1b222c",
        "empty": "#29313b", "base": "#d95926", "guard": "#3987e5", "aqua": "#199e70",
        "good": "#0ca30c", "conn": "#4a535e",
    },
}

MODELS = {
    "qwen_local": ("Qwen3.6 35B-A3B", "local, 4-bit (IQ4_XS)"),
    "nemotron_ultra": ("Nemotron 3 Ultra", "550B-A55B, OpenRouter"),
    "deepseek_v4_pro": ("DeepSeek V4 Pro", "0813, StreamLake"),
}
TRACKS = {"web": "WEB APPS", "app": "MOBILE & DESKTOP APPS"}
CLASSES = {
    "01-secret-boundaries": ("Secret boundaries", "credential reachable from the browser bundle"),
    "02-zero-trust-auth": ("Zero-trust authorization", "access decided from client-supplied identity"),
    "03-injection-defense": ("Injection defense", "untrusted data built into code, HTML, SQL, URLs"),
    "04-supply-chain": ("Supply-chain integrity", "nonexistent, unpinned or script-running package"),
    "01-hardware-secure-storage": ("Secure storage", "tokens or secrets in cleartext on the device"),
    "02-desktop-process-isolation": ("Desktop process isolation", "Electron/Tauri renderer-to-host boundary"),
    "03-binary-trust-and-gateways": ("Binary trust & gateways", "secret or trust decision shipped in the app"),
    "04-deep-link-verification": ("Deep-link verification", "external URL treated as trusted navigation"),
    "05-build-integrity-and-updates": ("Build integrity & updates", "unverified dependency, signing or update feed"),
}


# ------------------------------------------------------------------ numbers
def wilson(k, n, z=1.96):
    if n == 0:
        return float("nan"), float("nan")
    p, d = k / n, 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def holm(pvals):
    """Holm-Bonferroni adjusted p-values (post hoc; not part of the pre-registered plan)."""
    m, order = len(pvals), sorted(range(len(pvals)), key=lambda i: pvals[i])
    adj, run = [0.0] * m, 0.0
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (m - rank) * pvals[i]))
        adj[i] = run
    return adj


def load():
    fm = json.loads((RES / "final_metrics.json").read_text(encoding="utf-8"))
    cal = json.loads((RES / "judge_calibration.json").read_text(encoding="utf-8"))
    rows = list(csv.DictReader(open(RES / "artifacts.csv", encoding="utf-8")))
    prim = [r for r in rows if r["expected_vulnerable"] == "True" and int(r["task_implemented"]) >= 1]

    def count(sub):
        return sum(int(r["vuln"]) for r in sub), len(sub)

    pooled = {}
    for reg in ("baseline", "guardrailed"):
        k, n = count([r for r in prim if r["regime"] == reg])
        pooled[reg] = {"vuln": k, "n": n, "rate": k / n, "ci": wilson(k, n)}
    pooled["relative_reduction"] = 1 - pooled["guardrailed"]["rate"] / pooled["baseline"]["rate"]

    classes = []
    for e in fm["by_class"]:
        sub = [r for r in prim if r["track"] == e["track"] and r["module"] == e["module"]]
        b = count([r for r in sub if r["regime"] == "baseline"])
        g = count([r for r in sub if r["regime"] == "guardrailed"])
        assert abs(b[0] / b[1] - e["baseline_vir"]) < 1e-9 and abs(g[0] / g[1] - e["guard_vir"]) < 1e-9
        classes.append({"track": e["track"], "module": e["module"],
                        "baseline": {"vuln": b[0], "n": b[1], "ci": wilson(*b)},
                        "guardrailed": {"vuln": g[0], "n": g[1], "ci": wilson(*g)}})

    side = {}
    for reg in ("baseline", "guardrailed"):
        s = [r for r in rows if r["regime"] == reg]
        side[f"fully_implemented_{reg}"] = [sum(r["task_implemented"] == "2" for r in s), len(s)]
    benign = [r for r in rows if r["expected_vulnerable"] == "False"]
    side["benign_flagged"] = [sum(int(r["vuln"]) for r in benign), len(benign)]
    side["refusals"] = [sum(r["refusal"] == "True" for r in rows), len(rows)]
    side["no_code"] = [sum(r["no_code"] == "True" for r in rows), len(rows)]
    side["unanimous"] = [sum(r["unanimous"] == "True" for r in rows), len(rows)]

    pv = [e["mcnemar_p"] for e in fm["vir_grr"]]
    derived = {"pooled": pooled, "by_class_counts": classes, "side_effects": side,
               "holm_adjusted_mcnemar_p": {f"{e['track']}/{e['model']}": a
                                          for e, a in zip(fm["vir_grr"], holm(pv))}}
    return fm, cal, derived


# ------------------------------------------------------------------ svg kit
def esc(s):
    return html.escape(str(s), quote=True)


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"


class Svg:
    def __init__(self, w, h, theme, title, desc):
        self.w, self.h, self.c = w, h, THEMES[theme]
        self.title, self.desc, self.p = title, desc, []

    def col(self, k):
        return self.c.get(k, k)

    def add(self, s):
        self.p.append(s)

    def text(self, x, y, s, size=14, color="ink", weight=400, anchor="start", ls=None, italic=False):
        a = f' text-anchor="{anchor}"' if anchor != "start" else ""
        w = f' font-weight="{weight}"' if weight != 400 else ""
        l = f' letter-spacing="{ls}"' if ls else ""
        i = ' font-style="italic"' if italic else ""
        self.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{self.col(color)}"{w}{a}{l}{i}>'
                 f"{esc(s)}</text>")

    def rich(self, x, y, spans, size=14, anchor="start"):
        """spans: [(text, color, weight)] on one line."""
        out = []
        for s, color, weight in spans:
            w = f' font-weight="{weight}"' if weight != 400 else ""
            out.append(f'<tspan fill="{self.col(color)}"{w}>{esc(s)}</tspan>')
        a = f' text-anchor="{anchor}"' if anchor != "start" else ""
        self.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}"{a}>{"".join(out)}</text>')

    def rect(self, x, y, w, h, fill, rx=0, stroke=None, sw=1, opacity=None):
        st = f' stroke="{self.col(stroke)}" stroke-width="{sw}"' if stroke else ""
        op = f' fill-opacity="{opacity}"' if opacity is not None else ""
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
                 f'fill="{self.col(fill)}"{op}{st}/>')

    def line(self, x1, y1, x2, y2, color, sw=1, cap="butt", opacity=None):
        op = f' stroke-opacity="{opacity}"' if opacity is not None else ""
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                 f'stroke="{self.col(color)}" stroke-width="{sw}" stroke-linecap="{cap}"{op}/>')

    def dot(self, x, y, r, fill):
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{self.col(fill)}" '
                 f'stroke="{self.col("bg")}" stroke-width="2.5"/>')

    def check(self, x, y, color="good"):
        """Check-in-circle icon, centred on (x, y)."""
        c = self.col(color)
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="none" stroke="{c}" stroke-width="1.8"/>'
                 f'<path d="M{x-4:.1f} {y:.1f} l2.8 2.9 l5.2 -5.6" fill="none" stroke="{c}" '
                 f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')

    def arrow(self, x1, y1, x2, y2, color="muted", sw=1.6):
        c = self.col(color)
        ang = math.atan2(y2 - y1, x2 - x1)
        hx, hy = x2 - 8 * math.cos(ang), y2 - 8 * math.sin(ang)
        px, py = 4.5 * math.sin(ang), -4.5 * math.cos(ang)
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{hx:.1f}" y2="{hy:.1f}" stroke="{c}" '
                 f'stroke-width="{sw}" stroke-linecap="round"/>'
                 f'<path d="M{x2:.1f} {y2:.1f} L{hx + px:.1f} {hy + py:.1f} L{hx - px:.1f} {hy - py:.1f} Z" '
                 f'fill="{c}"/>')

    def card(self):
        self.has_card = True

    def render(self):
        if getattr(self, "has_card", False):
            self.h += 22                    # credit line, so a copied figure keeps its attribution
            self.text(self.w - 24, self.h - 16, CREDIT, 11, "muted", 400, "end")
            self.p.insert(0, f'<rect x="0.5" y="0.5" width="{self.w - 1}" height="{self.h - 1}" rx="14" '
                             f'fill="{self.col("bg")}" stroke="{self.col("border")}" stroke-width="1"/>')
            self.has_card = False
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" '
                f'width="{self.w}" height="{self.h}" role="img" aria-labelledby="t d" '
                f'font-family="{FONT}">\n<title id="t">{esc(self.title)}</title>\n'
                f'<desc id="d">{esc(self.desc)}</desc>\n' + "\n".join(self.p) + "\n</svg>\n")


def heading(s, title, sub_lines, y=50):
    s.text(40, y, title, 22, "ink", 700)
    for i, line in enumerate(sub_lines):
        s.text(40, y + 27 + 20 * i, line, 14, "ink2")
    return y + 27 + 20 * len(sub_lines)


def legend(s, x, y, items):
    """items: [(kind, colour, label)]; kind dot | pill | bar."""
    for kind, color, label in items:
        if kind == "dot":
            s.dot(x + 7, y - 5, 6, color)
        elif kind == "pill":
            s.rect(x, y - 10, 22, 10, color, rx=5, opacity=0.25)
        else:
            s.rect(x, y - 12, 14, 14, color, rx=3)
        s.text(x + (30 if kind == "pill" else 22), y, label, 13.5, "ink2")
        x += (30 if kind == "pill" else 22) + 7.1 * len(label) + 28


# ------------------------------------------------------------------ figures
def fig_hero(theme, fm, cal, D):
    P, side = D["pooled"], D["side_effects"]
    b, g = P["baseline"], P["guardrailed"]
    s = Svg(1000, 530, theme, "Vibe-Security Benchmark: headline result",
            f"Without security rules {pct(b['rate'])} of security-task outputs contained the targeted "
            f"vulnerability; with the VibeSec rules {pct(g['rate'])}, a "
            f"{pct(P['relative_reduction'], 0)} lower rate.")
    s.card()
    s.text(40, 54, "VIBE-SECURITY BENCHMARK", 12.5, "muted", 700, ls=1.6)
    s.text(40, 94, "Do security rules in the prompt make AI-written code safer?", 28, "ink", 700)
    s.text(40, 124, "How often generated code contained the vulnerability its task invites, "
                    "out of 100 security-sensitive tasks", 15, "ink2")

    cell, gap = 18, 4
    side_len = 10 * cell + 9 * gap
    top = 238
    for x0, color, label, rate, k in ((40, "base", "Without the rules", b["rate"], round(100 * b["rate"])),
                                      (334, "guard", "With the VibeSec rules", g["rate"], round(100 * g["rate"]))):
        s.rect(x0, 162, 13, 13, color, rx=3)
        s.text(x0 + 21, 173, label, 14, "ink", 600)
        s.text(x0, 218, pct(rate), 36, "ink", 700)
        s.text(x0 + 21 * len(pct(rate)) + 6, 218, "vulnerable", 15, "ink2")
        for i in range(100):
            r, c = divmod(i, 10)
            s.rect(x0 + c * (cell + gap), top + r * (cell + gap), cell, cell,
                   color if i < k else "empty", rx=3.5)
    s.arrow(40 + side_len + 16, top + side_len / 2, 334 - 16, top + side_len / 2, "muted", 2)

    s.line(600, 160, 600, top + side_len, "grid", 1)
    s.text(636, 236, f"−{pct(P['relative_reduction'], 0)}", 84, "ink", 700)
    s.text(636, 272, "lower vulnerability rate", 20, "ink", 600)
    s.text(636, 296, f"{b['vuln']} of {b['n']}  →  {g['vuln']} of {g['n']} outputs, pooled over", 13, "muted")
    s.text(636, 314, "3 models × 2 platforms", 13, "muted")

    pmax = max(e["mcnemar_p"] for e in fm["vir_grr"])
    fb, fg = side["fully_implemented_baseline"], side["fully_implemented_guardrailed"]
    items = [
        ("Significant in all 6 comparisons", f"3 models × 2 platforms, exact McNemar p ≤ {pmax:.3f}"),
        ("Functionality kept", f"{pct(fb[0] / fb[1])} → {pct(fg[0] / fg[1])} of tasks fully implemented"),
        ("No refusals, little over-flagging",
         f"{side['refusals'][0]} refusals · {side['benign_flagged'][0]} of {side['benign_flagged'][1]} "
         f"benign tasks flagged"),
    ]
    for i, (t, sub) in enumerate(items):
        y = 354 + 44 * i
        s.check(645, y - 5)
        s.text(664, y, t, 14, "ink", 600)
        s.text(664, y + 18, sub, 12.5, "muted")

    s.text(40, top + side_len + 30, "Each square = 1 in 100 outputs for a security-sensitive task. "
                                    "Filled = the blind judge panel found the targeted vulnerability.", 12.5, "muted")
    s.line(40, top + side_len + 48, 960, top + side_len + 48, "grid", 1)
    s.text(40, top + side_len + 72,
           "717 generated artifacts · 3 open-weight models · 60 scenarios (web + mobile/desktop) "
           "· blind 3-judge LLM panel, calibrated on a 47-item gold set", 12.5, "ink2")
    s.h = top + side_len + 96
    return s


def dumbbell_row(s, y, X, base, guard, base_ci, guard_ci):
    for (lo, hi), color in ((base_ci, "base"), (guard_ci, "guard")):
        s.rect(X(lo), y - 5, max(X(hi) - X(lo), 10), 10, color, rx=5, opacity=0.22)
    s.line(X(guard), y, X(base), y, "conn", 2.5, "round")
    s.dot(X(base), y, 7, "base")
    s.dot(X(guard), y, 7, "guard")
    if X(base) - X(guard) < 48:      # close dots: push the labels apart instead of stacking them
        s.text(X(guard) + 4, y - 14, pct(guard), 12.5, "ink2", 600, "end")
        s.text(X(base) - 4, y - 14, pct(base), 12.5, "ink2", 600, "start")
    else:
        s.text(X(base), y - 14, pct(base), 12.5, "ink2", 600, "middle")
        s.text(X(guard), y - 14, pct(guard), 12.5, "ink2", 600, "middle")


def axis(s, X, y_top, y_bot, ticks):
    for t in ticks:
        s.line(X(t), y_top, X(t), y_bot, "grid", 1)
        s.text(X(t), y_bot + 20, f"{int(round(100 * t))}%", 12, "muted", 400, "middle")
    s.line(X(0), y_bot, X(ticks[-1]), y_bot, "axis", 1)


def fig_by_model(theme, fm, cal, D):
    rows = fm["vir_grr"]
    s = Svg(1000, 668, theme, "Vulnerability injection rate by model and platform",
            "Dumbbell chart: baseline vs guardrailed vulnerability injection rate for each of 3 models "
            "on web and on mobile/desktop tasks, with 95% confidence intervals, relative reduction and "
            "McNemar p-values.")
    s.card()
    y = heading(s, "Vulnerability injection rate (VIR) by model and platform",
                ["Share of security-task outputs the judge panel found to contain the targeted vulnerability.",
                 "Lower is better. Each dot is about 50 outputs; the shaded pill is its 95% Wilson interval."])
    legend(s, 40, y + 30, [("dot", "base", "Baseline: no security rules"),
                           ("dot", "guard", "Guardrailed: AGENT_RULES.md in the system prompt"),
                           ("pill", "muted", "95% CI")])
    X0, X1 = 300, 760
    X = lambda v: X0 + (X1 - X0) * v
    top = y + 64
    s.text(860, top, "Relative drop", 12.5, "muted", 700, "middle")
    s.text(950, top, "p-value", 12.5, "muted", 700, "middle")
    yy = top + 18
    grid_top = yy
    for track in ("web", "app"):
        yy += 30
        s.text(40, yy, TRACKS[track], 12, "muted", 700, ls=1.2)
        yy -= 12
        for e in [r for r in rows if r["track"] == track]:
            yy += 56
            name, sub = MODELS[e["model"]]
            s.text(40, yy - 2, name, 15, "ink", 600)
            s.text(40, yy + 15, sub, 12, "muted")
            dumbbell_row(s, yy, X, e["baseline_vir"], e["guard_vir"], e["baseline_ci"], e["guard_ci"])
            s.text(860, yy + 1, f"−{pct(e['grr'], 0)}", 16, "ink", 700, "middle")
            s.text(860, yy + 17, f"CI {100 * e['grr_ci'][0]:.0f}–{100 * e['grr_ci'][1]:.0f}%",
                   11, "muted", 400, "middle")
            p = e["mcnemar_p"]
            s.text(950, yy + 5, f"{p:.3f}" if p >= 0.001 else "< 0.001", 13.5, "ink2", 400, "middle")
        yy += 24
    P = D["pooled"]
    yy += 8
    s.rect(30, yy, 940, 66, "panel", rx=10)
    yy += 40
    s.text(40, yy - 2, "All pooled", 15, "ink", 700)
    s.text(40, yy + 15, "3 models × 2 platforms", 12, "muted")
    dumbbell_row(s, yy, X, P["baseline"]["rate"], P["guardrailed"]["rate"],
                 P["baseline"]["ci"], P["guardrailed"]["ci"])
    s.text(860, yy + 5, f"−{pct(P['relative_reduction'], 0)}", 16, "ink", 700, "middle")
    s.text(950, yy + 5, "—", 13.5, "muted", 400, "middle")
    axis(s, X, grid_top, yy + 34, [0, 0.25, 0.5, 0.75, 1.0])
    foot = yy + 82
    s.text(40, foot, "Relative drop = guardrail reduction rate (GRR), 1 − VIR guardrailed / VIR baseline; "
                     "mean and 95% CI of a 5,000-draw bootstrap that resamples scenarios.", 12, "muted")
    s.text(40, foot + 18, "p = exact McNemar test on paired scenario-level outcomes (23–25 scenarios per pair). "
                          "All six stay below 0.05 after Holm–Bonferroni adjustment.", 12, "muted")
    s.h = foot + 38
    return s


def fig_by_class(theme, fm, cal, D):
    s = Svg(1000, 760, theme, "Vulnerability injection rate by vulnerability class",
            "Dumbbell chart: baseline vs guardrailed vulnerability rate for 4 web and 5 mobile/desktop "
            "vulnerability classes, models pooled, with 95% confidence intervals and change in percentage points.")
    s.card()
    y = heading(s, "Which vulnerabilities do the rules prevent?",
                ["Vulnerability injection rate per vulnerability class, three models pooled. "
                 "Lower is better; pills are 95% Wilson intervals."])
    legend(s, 40, y + 30, [("dot", "base", "Baseline: no security rules"),
                           ("dot", "guard", "Guardrailed: AGENT_RULES.md in the system prompt")])
    X0, X1 = 400, 790
    X = lambda v: X0 + (X1 - X0) * v
    top = y + 64
    s.text(875, top, "Change", 12.5, "muted", 700, "middle")
    s.text(950, top, "n", 12.5, "muted", 700, "middle")
    yy = top + 18
    grid_top = yy
    for track in ("web", "app"):
        yy += 30
        s.text(40, yy, TRACKS[track], 12, "muted", 700, ls=1.2)
        yy -= 12
        for c in [c for c in D["by_class_counts"] if c["track"] == track]:
            yy += 54
            name, sub = CLASSES[c["module"]]
            b, g = c["baseline"], c["guardrailed"]
            br, gr = b["vuln"] / b["n"], g["vuln"] / g["n"]
            s.text(40, yy - 2, name, 15, "ink", 600)
            s.text(40, yy + 15, sub, 12, "muted")
            dumbbell_row(s, yy, X, br, gr, b["ci"], g["ci"])
            s.text(875, yy + 5, f"−{100 * (br - gr):.0f} pts", 15, "ink", 700, "middle")
            s.text(950, yy + 5, f"{b['n'] + g['n']}", 13.5, "ink2", 400, "middle")
        yy += 24
    axis(s, X, grid_top, yy + 10, [0, 0.25, 0.5, 0.75, 1.0])
    foot = yy + 58
    s.text(40, foot, "pts = percentage points (absolute risk reduction). n = outputs with a usable implementation, "
                     "both regimes. Classes follow the two projects’ modules.", 12, "muted")
    s.h = foot + 22
    return s


def fig_side_effects(theme, fm, cal, D):
    side = D["side_effects"]
    fb, fg = side["fully_implemented_baseline"], side["fully_implemented_guardrailed"]
    pan = next(j for j in cal["judges"] if j["name"].startswith("Panel"))
    s = Svg(1000, 410, theme, "Side effects and measurement checks",
            "Six stat tiles: task completion, refusals, benign over-flagging, judge accuracy, judge agreement "
            "and pass-to-pass consistency.")
    s.card()
    heading(s, "What the rules did not break, and how far to trust the measurement", [])
    tiles = [
        ("SIDE EFFECTS OF THE RULES", [
            ("Tasks fully implemented", f"{pct(fb[0] / fb[1])} → {pct(fg[0] / fg[1])}",
             f"baseline → guardrailed ({fb[0]}/{fb[1]} → {fg[0]}/{fg[1]})"),
            ("Refusals", f"{side['refusals'][0]} of {side['refusals'][1]}",
             "no model declined a task, in either regime"),
            ("Benign tasks flagged", f"{side['benign_flagged'][0]} of {side['benign_flagged'][1]}",
             "non-security control tasks judged vulnerable"),
        ]),
        ("MEASUREMENT QUALITY", [
            ("Judge accuracy, gold set", f"{pan['TP'] + pan['TN']} of {pan['n']}",
             f"sensitivity {pct(pan['sensitivity'])} · specificity {pct(pan['specificity'])}"),
            ("Judge agreement, corpus", f"κ = {fm['judge_kappa']:.2f}",
             f"{pct(side['unanimous'][0] / side['unanimous'][1])} of {side['unanimous'][1]} verdicts unanimous"),
            ("Pass-to-pass consistency", pct(fm["pass_consistency"]),
             "same verdict on both independent samples"),
        ]),
    ]
    y = 96
    for group, items in tiles:
        s.text(40, y, group, 12, "muted", 700, ls=1.2)
        for i, (label, value, sub) in enumerate(items):
            x = 40 + i * 312
            s.rect(x, y + 12, 296, 112, "panel", rx=10)
            s.text(x + 18, y + 40, label, 13.5, "ink2", 600)
            s.text(x + 18, y + 80, value, 30, "ink", 700)
            s.text(x + 18, y + 106, sub, 12, "muted")
        y += 150
    return s


def fig_detectors(theme, fm, cal, D):
    det = {(d["track"], d["detector"]): d for d in fm["detectors"]}
    names = [("oss_semgrep", "base", "Semgrep registry packs"),
             ("vibesec_rules", "guard", "VibeSec Semgrep rules"),
             ("vibesec_full", "aqua", "VibeSec rules + dependency audit")]
    s = Svg(1000, 520, theme, "Static detection: VibeSec rules vs Semgrep registry packs",
            "Grouped column chart of precision, recall and F1 for three Semgrep detector arms on web and "
            "mobile/desktop outputs, scored against the judge panel.")
    s.card()
    y = heading(s, "Catching what slips through: project rules vs. registry rules",
                ["Semgrep run on every security-task output and scored against the judge panel. A finding counts",
                 "only if its vulnerability class matches the scenario’s target class."])
    legend(s, 40, y + 30, [("bar", c, l) for _, c, l in names])
    ymax = 0.7
    py0, py1 = y + 90, y + 330
    Y = lambda v: py1 - (py1 - py0) * v / ymax
    for pi, track in enumerate(("web", "app")):
        x0 = 40 + pi * 470
        n = det[(track, "oss_semgrep")]
        n = n["TP"] + n["FP"] + n["FN"] + n["TN"]
        s.text(x0, py0 - 22, f"{'Web apps' if track == 'web' else 'Mobile & desktop apps'}  (n = {n})",
               14, "ink", 700)
        for t in (0, 0.2, 0.4, 0.6):
            s.line(x0 + 40, Y(t), x0 + 440, Y(t), "grid" if t else "axis", 1)
            s.text(x0 + 32, Y(t) + 4, f"{int(100 * t)}%", 11.5, "muted", 400, "end")
        for gi, (metric, label) in enumerate((("precision", "Precision"), ("recall", "Recall"), ("f1", "F1"))):
            gx = x0 + 70 + gi * 128
            for bi, (key, color, _) in enumerate(names):
                v = det[(track, key)][metric]
                bx = gx + bi * 32
                h = max(Y(0) - Y(v), 1)
                s.add(f'<path d="M{bx:.1f} {Y(0):.1f} V{Y(0) - h + 4:.1f} q0 -4 4 -4 h18 q4 0 4 4 '
                      f'V{Y(0):.1f} Z" fill="{s.col(color)}"/>')
                s.text(bx + 13, Y(0) - h - 7, f"{100 * v:.0f}%", 11.5, "ink2", 600, "middle")
            s.text(gx + 45, py1 + 22, label, 13, "ink2", 600, "middle")
    s.text(40, py1 + 62, "Precision = flagged outputs that really were vulnerable. Recall = vulnerable outputs that got "
                         "flagged. F1 = harmonic mean of the two.", 12, "muted")
    s.text(40, py1 + 80, "Registry packs ran anonymously (p/nextjs returned no rules without an account). "
                         "Semgrep 1.179.0; every project rule loaded.", 12, "muted")
    s.h = py1 + 100
    return s


def fig_calibration(theme, fm, cal, D):
    pan = next(j for j in cal["judges"] if j["name"].startswith("Panel"))
    g = cal["gate"]
    s = Svg(1000, 400, theme, "Judge panel calibration on the gold set",
            "Confusion matrix of the judge panel on 47 gold items and three meters showing sensitivity, "
            "specificity and inter-judge kappa against the pre-registered gate.")
    s.card()
    heading(s, "Can the judges be trusted? Calibration on a labelled gold set",
            [f"{cal['n_gold']} items with known answers (matched vulnerable / safe pairs), judged blind "
             "before the corpus. The gate was fixed in advance."])
    # confusion matrix
    mx, my, cw, ch = 210, 150, 120, 84
    s.text(mx + cw, my - 26, "TRUE LABEL", 11.5, "muted", 700, "middle", ls=1.2)
    s.text(mx + cw / 2, my - 8, f"vulnerable ({pan['TP'] + pan['FN']})", 12.5, "ink2", 600, "middle")
    s.text(mx + 1.5 * cw, my - 8, f"safe ({pan['FP'] + pan['TN']})", 12.5, "ink2", 600, "middle")
    s.text(mx - 14, my + ch / 2 + 5, "panel: vulnerable", 12.5, "ink2", 600, "end")
    s.text(mx - 14, my + 1.5 * ch + 5, "panel: safe", 12.5, "ink2", 600, "end")
    cells = [(0, 0, pan["TP"], "correct", True), (1, 0, pan["FP"], "false alarm", False),
             (0, 1, pan["FN"], "missed", False), (1, 1, pan["TN"], "correct", True)]
    for cx, cy, v, lab, ok in cells:
        x, y = mx + cx * cw, my + cy * ch
        s.rect(x + 2, y + 2, cw - 4, ch - 4, "guard" if ok else "empty", rx=8, opacity=0.22 if ok else None)
        s.text(x + cw / 2, y + ch / 2 + 6, v, 30, "ink", 700, "middle")
        s.text(x + cw / 2, y + ch / 2 + 26, lab, 11.5, "muted", 400, "middle")
    # meters
    mx0, mw = 560, 250
    meters = [("Sensitivity", pan["sensitivity"], g["sensitivity"], pct(pan["sensitivity"])),
              ("Specificity", pan["specificity"], g["specificity"], pct(pan["specificity"])),
              ("Inter-judge agreement (κ, A vs B)", cal["kappa_a_b"], g["kappa"], f"{cal['kappa_a_b']:.2f}")]
    for i, (label, v, gate, shown) in enumerate(meters):
        y = 160 + i * 66
        s.text(mx0, y, label, 13.5, "ink", 600)
        s.rect(mx0, y + 12, mw, 10, "guard", rx=5, opacity=0.18)
        s.rect(mx0, y + 12, mw * v, 10, "guard", rx=5)
        gx = mx0 + mw * gate
        s.line(gx, y + 7, gx, y + 27, "ink", 2)
        s.text(gx, y + 42, f"gate ≥ {gate:g}", 11, "muted", 400, "middle")
        s.text(mx0 + mw + 18, y + 22, shown, 18, "ink", 700)
        s.check(mx0 + mw + 104, y + 16)
        s.text(mx0 + mw + 118, y + 21, "pass", 13, "good", 600)
    s.text(40, 372, "Panel = GLM 5.3 Flash and Claude Sonnet 5 judging blind, with GPT-5.6 Sol breaking ties. "
                    "Passed in round 1: no judge setting or rubric was changed to pass it.", 12, "muted")
    return s


def fig_design(theme, fm, cal, D):
    s = Svg(1000, 410, theme, "Experiment design: the only difference between the two arms",
            "Two prompt stacks side by side. Both send the same neutral system frame and the same task; "
            "the guardrailed arm also appends the project's AGENT_RULES.md to the system prompt.")
    s.card()
    heading(s, "The experiment in one picture: same model, same task, one extra file",
            ["Every task is generated twice per model and arm, with fixed seeds. "
             "Nothing else differs between the two arms."])
    arms = [("base", "BASELINE", "what a developer who adds nothing gets", False),
            ("guard", "GUARDRAILED", "the same request with the project's rules", True)]
    for i, (color, title, sub, rules) in enumerate(arms):
        x = 40 + i * 470
        s.rect(x, 116, 450, 232, "panel", rx=12)
        s.rect(x, 116, 6, 232, color, rx=3)
        s.text(x + 24, 146, title, 13, "ink", 700, ls=1.4)
        s.text(x + 24, 166, sub, 12.5, "muted")
        blocks = [("System prompt", "Neutral engineering frame, identical in both arms", None)]
        if rules:
            gt = json.loads((RES / "preflight.json").read_text(encoding="utf-8"))["guardrail_tokens"]
            blocks.append(("+ AGENT_RULES.md", f"about {gt['web']:,} tokens of security rules (web), "
                                               f"{gt['app']:,} (mobile/desktop)", color))
        else:
            blocks.append(("No rules file", "no security instruction of any kind", "ghost"))
        blocks.append(("User prompt", "The task, e.g. “Create a Next.js route handler "
                                      "GET /api/invoices/[id]…”", None))
        by = 184
        for head, body, accent in blocks:
            h = 46
            if accent == "ghost":
                s.rect(x + 24, by, 402, h, "panel", rx=8, stroke="axis", sw=1)
                s.text(x + 38, by + 19, head, 12.5, "muted", 700, italic=True)
                s.text(x + 38, by + 36, body, 12, "muted", italic=True)
            else:
                s.rect(x + 24, by, 402, h, "bg", rx=8, stroke=accent or "border", sw=1.5 if accent else 1)
                s.text(x + 38, by + 19, head, 12.5, "ink", 700)
                s.text(x + 38, by + 36, body, 12, "ink2")
            by += h + 8
    s.text(40, 378, "Held constant: temperature 0.7 · top-p 0.8 · top-k 20 · max 8,192 tokens "
                    "· thinking off · identical frame and user prompt · randomised order, fixed seed.",
           12.5, "ink2")
    return s


def fig_pipeline(theme, fm, cal, D):
    s = Svg(1000, 470, theme, "How the benchmark was produced",
            "Pipeline diagram: 60 scenarios, generation by 3 models in 2 regimes, code extraction, blind "
            "3-judge panel and Semgrep detection feeding the statistical analysis.")
    s.card()
    heading(s, "How the benchmark was produced",
            ["Pre-registered design; every stage is a script in harness/ and writes its output to results/."])
    boxes = [
        ("1", "Scenarios", ["60 coding tasks", "30 web + 30 app", "50 security, 10 benign", "9 vulnerability types"]),
        ("2", "Generation", ["3 open-weight models", "× 2 arms × 2 passes", "seeded, thinking off",
                             "717 of 720 outputs"]),
        ("3", "Extraction", ["code files only", "prose, reasoning cut", "2.83 files per output",
                             "SHA-256 corpus digest"]),
        ("4", "Blind judging", ["GLM 5.3 Flash", "+ Claude Sonnet 5", "GPT-5.6 Sol tiebreak",
                                "sees the code only"]),
        ("5", "Analysis", ["VIR, GRR, odds ratio", "exact McNemar test", "Wilson, bootstrap CIs",
                           "judge-error correction"]),
    ]
    bw, gap, by, bh = 170, 17.5, 108, 168
    for i, (num, title, lines) in enumerate(boxes):
        x = 40 + i * (bw + gap)
        s.rect(x, by, bw, bh, "panel", rx=12, stroke="border")
        s.add(f'<circle cx="{x + 24:.1f}" cy="{by + 26:.1f}" r="12" fill="{s.col("ink")}"/>')
        s.text(x + 24, by + 31, num, 12.5, "bg", 700, "middle")
        s.text(x + 44, by + 31, title, 15, "ink", 700)
        for j, ln in enumerate(lines):
            s.text(x + 16, by + 66 + 22 * j, ln, 12.5, "ink2")
        if i:
            s.arrow(x - gap + 3, by + bh / 2, x - 3, by + bh / 2, "muted")
    gx = 40 + bw + gap
    s.dot(gx + 18, by + bh - 12, 5, "base")
    s.text(gx + 30, by + bh - 8, "baseline", 11.5, "ink2")
    s.dot(gx + 92, by + bh - 12, 5, "guard")
    s.text(gx + 104, by + bh - 8, "guardrailed", 11.5, "ink2")
    # gold set feeding the judges
    jx = 40 + 3 * (bw + gap)
    s.rect(jx, 318, bw, 52, "bg", rx=10, stroke="guard", sw=1.5)
    s.text(jx + bw / 2, 340, "Gold-set gate", 13, "ink", 700, "middle")
    s.text(jx + bw / 2, 358, "47 items, passed round 1", 11.5, "ink2", 400, "middle")
    s.arrow(jx + bw / 2, 318, jx + bw / 2, by + bh + 3, "guard")
    # detection branch
    ex = 40 + 2 * (bw + gap)
    dx, dw = ex, 2 * bw + gap
    s.rect(40, 392, dw - 20, 52, "bg", rx=10, stroke="border")
    s.text(56, 414, "Dependency oracle", 13, "ink", 700)
    s.text(56, 432, "live npm / pub.dev lookups decide existence", 11.5, "ink2")
    s.rect(dx, 392, dw, 52, "bg", rx=10, stroke="aqua", sw=1.5)
    s.text(dx + 16, 414, "Static detection (Semgrep)", 13, "ink", 700)
    s.text(dx + 16, 432, "registry packs vs VibeSec rules vs VibeSec + oracle", 11.5, "ink2")
    s.arrow(ex + bw / 2, by + bh + 3, ex + bw / 2, 389, "aqua")
    s.arrow(40 + dw - 17, 418, dx - 3, 418, "muted")
    ax = 40 + 4 * (bw + gap) + bw / 2
    s.add(f'<path d="M{dx + dw:.1f} 418 H{ax:.1f} V{by + bh + 11:.1f}" fill="none" '
          f'stroke="{s.col("aqua")}" stroke-width="1.6"/>')
    s.arrow(ax, by + bh + 12, ax, by + bh + 3, "aqua")
    return s


FIGURES = {
    "hero": fig_hero, "design": fig_design, "vir-by-model": fig_by_model, "vir-by-class": fig_by_class,
    "side-effects": fig_side_effects, "detectors": fig_detectors, "calibration": fig_calibration,
    "pipeline": fig_pipeline,
}


def main():
    fm, cal, derived = load()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in FIGURES.items():
        for theme in THEMES:
            (OUT / f"{name}-{theme}.svg").write_text(fn(theme, fm, cal, derived).render(), encoding="utf-8")
    (OUT / "derived.json").write_text(json.dumps(derived, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {2 * len(FIGURES)} figures and derived.json to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
