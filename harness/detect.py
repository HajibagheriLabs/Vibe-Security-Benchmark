"""
Phase 4 — detection.

Three genuinely independent detector arms, all run as real subprocesses against
the extracted file trees:

  A. oss_semgrep    — Semgrep's public registry packs (the honest baseline)
  B. vibesec_rules  — this project's own semgrep-rules.yml
  C. vibesec_full   — B plus the repo audit scripts and the live registry check

An earlier prototype defined the framework scanner as `return ground_truth_oracle(...)`,
which produced 100% precision and recall by construction. Nothing here shares
code with the judge, so precision and recall are measured rather than assumed.

A detector counts as having DETECTED a sample only when it emits at least one
finding whose vulnerability class equals the scenario's target class. A pack
that flags eval() while the target class is a missing RLS policy is not a hit.

  python harness/detect.py
  python harness/detect.py --check-rules   # offline: can Semgrep load both project rulesets?
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

import config as C
import check_deps

TAX = json.loads((C.HARNESS / "taxonomy.json").read_text(encoding="utf-8"))
SEMGREP_TIMEOUT = 1800


def find_semgrep():
    """The venv is not activated when scripts are run as venv/Scripts/python.exe,
    so look next to the interpreter before falling back to PATH."""
    here = os.path.dirname(os.path.abspath(sys.executable))
    for name in ("semgrep.exe", "semgrep"):
        cand = os.path.join(here, name)
        if os.path.isfile(cand):
            return cand
    return shutil.which("semgrep")


SEMGREP = find_semgrep()
SG_ENV = dict(os.environ, SEMGREP_ENABLE_VERSION_CHECK="0", SEMGREP_SEND_METRICS="off",
              PYTHONUTF8="1", PYTHONIOENCODING="utf-8")


def cwe_to_class(track, cwe_field):
    """OSS rules carry CWE strings; map them onto our class taxonomy."""
    if not cwe_field:
        return set()
    items = cwe_field if isinstance(cwe_field, list) else [cwe_field]
    codes = set()
    for it in items:
        for tok in str(it).replace(",", " ").split():
            if tok.upper().startswith("CWE-"):
                codes.add(tok.upper().rstrip(":").strip())
    hit = set()
    for mod, spec in TAX[track].items():
        if codes & set(spec["cwes"]):
            hit.add(mod)
    return hit


def registry_pack(cfg):
    """Fetch a registry pack the way an anonymous Semgrep client does.

    Returns (ok, reason, n_rules, n_login_only). Fails fast when the registry is
    unreachable, and catches packs that exist but are EMPTY without a Semgrep
    account (the registry then returns {"rules": [], "missed": N}).
    """
    try:
        req = urllib.request.Request(f"https://semgrep.dev/c/{cfg}",
                                     headers={"User-Agent": "Semgrep/vibe-benchmark"})
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}", 0, 0
    except Exception as e:
        return False, type(e).__name__, 0, 0
    try:
        doc = json.loads(text)
        n, missed = len(doc.get("rules") or []), int(doc.get("missed") or 0)
    except ValueError:
        n, missed = len(re.findall(r"(?m)^\s*-\s+id:", text)), 0
    if n == 0:
        return False, f"HTTP 200 but empty without a Semgrep account ({missed} login-only rules)", 0, missed
    return True, "ok", n, missed


def run_semgrep(target, configs, label):
    """Run each config separately so one bad pack cannot kill the sweep.

    A pack that cannot be loaded is reported as SKIPPED, never as "0 findings":
    counting a failed download as a clean scan would silently bias the comparison.
    Rules inside a pack that Semgrep cannot parse are listed in rule_errors.
    """
    merged, used, skipped, rule_errors, packs = [], [], {}, {}, {}
    net_fail = 0
    for cfg in configs:
        if cfg.startswith(("p/", "r/")):
            if net_fail >= 2:
                skipped[cfg] = "registry: unreachable"
                print(f"    {label}: {cfg} SKIPPED (registry unreachable)")
                continue
            ok, why, n_rules, missed = registry_pack(cfg)
            if not ok:
                net_fail = net_fail + 1 if not why.startswith("HTTP") else 0
                skipped[cfg] = f"registry: {why}"
                print(f"    {label}: {cfg} SKIPPED (registry: {why})")
                continue
            net_fail = 0
            packs[cfg] = {"rules": n_rules, "login_only_rules_not_included": missed}
        cmd = [SEMGREP, "scan", "--config", cfg, "--json", "--quiet", "--disable-version-check",
               "--no-git-ignore", "--metrics=off", "--timeout", "30",
               "--max-target-bytes", "2000000", str(target)]
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=SEMGREP_TIMEOUT,
                               encoding="utf-8", errors="replace", env=SG_ENV)
            try:
                data = json.loads(p.stdout or "{}")
            except ValueError:
                data = {}
            # exit 0/1: clean run. exit 2 with results: the scan ran but some rules
            # did not load. Anything else: the config itself failed.
            if "results" not in data or p.returncode not in (0, 1, 2):
                raise RuntimeError(f"semgrep exit {p.returncode}: {(p.stderr or p.stdout)[-300:].strip()}")
            bad = sorted({e.get("rule_id", "?").split(".")[-1] + ": " + str(e.get("message", "")).split("\n")[1 if "\n" in str(e.get("message", "")) else 0].strip()[:120]
                          for e in data.get("errors", []) if "Rule parse error" in str(e.get("type"))})
            if p.returncode == 2 and not bad:
                raise RuntimeError(f"semgrep exit 2: {json.dumps(data.get('errors', []))[:300]}")
            if bad:
                rule_errors[cfg] = bad
            n = len(data["results"])
            merged.extend(data["results"])
            used.append(cfg)
            print(f"    {label}: {cfg} -> {n} findings" + (f"   ({len(bad)} rule(s) failed to load)" if bad else ""))
            for b in bad:
                print(f"        ! rule not loaded: {b}")
        except Exception as e:
            skipped[cfg] = f"{type(e).__name__}: {str(e)[:300]}"
            print(f"    {label}: {cfg} SKIPPED ({skipped[cfg][:160]})")
    return merged, used, skipped, rule_errors, packs


def index_findings(results, track, source):
    """sample_id -> set(class); plus the raw rows for the appendix."""
    by_sample, rows = {}, []
    for r in results:
        parts = str(r.get("path", "")).replace("\\", "/").split("/")
        sid = next((p for p in parts if p.count("_") >= 3 and
                    ("baseline" in p or "guardrailed" in p)), None)
        if not sid:
            continue
        meta = (r.get("extra") or {}).get("metadata") or {}
        if source == "vibesec":
            classes = {meta["module"]} if meta.get("module") else set()
        else:
            classes = cwe_to_class(track, meta.get("cwe"))
        by_sample.setdefault(sid, set()).update(classes)
        rows.append({"sample_id": sid, "check_id": r.get("check_id"),
                     "path": r.get("path"),
                     "line": (r.get("start") or {}).get("line"),
                     "severity": (r.get("extra") or {}).get("severity"),
                     "classes": sorted(classes), "source": source})
    return by_sample, rows


def run_repo_script(script, args, label):
    if not script.exists() or not shutil.which("node"):
        return None
    try:
        p = subprocess.run(["node", str(script), *args], capture_output=True,
                           text=True, timeout=900)
        return {"exit": p.returncode, "stdout": p.stdout[-20000:]}
    except Exception as e:
        print(f"    {label}: skipped ({type(e).__name__})")
        return None


def check_rules():
    """Offline check that Semgrep can load every rule in both project rulesets."""
    import tempfile
    bad_total = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name in ("a.js", "a.jsx", "a.ts", "a.tsx", "a.py", "a.sh", "a.kt", "a.java", "a.swift",
                     "a.dart", "a.rs", "a.go", "a.json", "a.yml", "a.xml", "a.html", "a.txt"):
            with open(os.path.join(tmp, name), "w", encoding="utf-8") as fh:
                fh.write("\n")
        for track in ("web", "app"):
            rules = C.semgrep_rules_path(track)
            if not rules.exists():
                print(f"  {track}: {rules} not found")
                bad_total += 1
                continue
            n_rules = len(re.findall(r"(?m)^\s*-\s+id:", rules.read_text(encoding="utf-8")))
            _, used, skipped, bad, _ = run_semgrep(tmp, [str(rules)], f"{track} ruleset")
            errs = [b for v in bad.values() for b in v]
            if skipped:
                bad_total += 1
            bad_total += len(errs)
            print(f"  {track}: {n_rules} rules, {len(errs)} not loadable"
                  + ("" if used else "  (ruleset could not be run at all)"))
    if bad_total:
        print("RULESET CHECK: PROBLEMS. Rules Semgrep cannot load never fire, for the benchmark or for any user.")
        sys.exit(1)
    print("RULESET CHECK: OK")


def main():
    if "--check-rules" in sys.argv:
        if not SEMGREP:
            print("semgrep not found in the venv or on PATH: the ruleset check and Stage B detection cannot run yet.")
            sys.exit(2)
        return check_rules()
    if not SEMGREP:
        print("semgrep not found in the venv or on PATH.  venv/Scripts/python.exe -m pip install semgrep")
        sys.exit(2)

    out, dep_cache = {}, check_deps._load()
    all_rows, meta, fatal = [], {}, []
    try:
        ver = subprocess.run([SEMGREP, "--version", "--disable-version-check"], capture_output=True,
                             text=True, timeout=120, env=SG_ENV).stdout.strip().splitlines()[0]
    except Exception:
        ver = "unknown"

    for track in ["web", "app"]:
        root = C.extracted_dir(track)
        if not root.exists():
            continue
        print(f"\n=== {track.upper()} ===")

        oss_res, oss_used, oss_skipped, oss_bad, oss_packs = run_semgrep(
            root, TAX["oss_semgrep_configs"][track], "OSS")
        vib_res, vib_used, vib_skipped, vib_bad, _ = run_semgrep(
            root, [str(C.semgrep_rules_path(track))], "VibeSec")
        meta[track] = {"oss_used": oss_used, "oss_skipped": oss_skipped, "oss_rule_errors": oss_bad,
                       "oss_pack_sizes": oss_packs,
                       "vibesec_used": [C.semgrep_rules_path(track).name for _ in vib_used],
                       "vibesec_skipped": bool(vib_skipped),
                       "vibesec_rule_errors": sorted(b for v in vib_bad.values() for b in v)}
        if not oss_used:
            fatal.append(f"{track}: no registry pack could be loaded, so the OSS baseline arm is empty")
        if vib_skipped:
            fatal.append(f"{track}: the project's own semgrep-rules.yml failed to run")

        oss_map, r1 = index_findings(oss_res, track, "oss")
        vib_map, r2 = index_findings(vib_res, track, "vibesec")
        all_rows += r1 + r2

        for sub in sorted(p for p in root.iterdir() if p.is_dir()):
            man = sub / "_manifest.json"
            if not man.exists():
                continue
            m = json.loads(man.read_text(encoding="utf-8"))
            sid, target = m["sample_id"], m["module"]
            files = {n: (sub / n).read_text(encoding="utf-8", errors="replace")
                     for n in m["file_list"] if (sub / n).exists()}
            dep = check_deps.audit(files, dep_cache)

            oss_c, vib_c = oss_map.get(sid, set()), vib_map.get(sid, set())
            full_c = set(vib_c)
            if dep["flagged"]:
                full_c |= {"04-supply-chain"} if track == "web" else {"05-build-integrity-and-updates"}

            def hit(classes):
                return (target in classes) if target != "benign" else bool(classes)

            out[sid] = {
                "track": track, "module": target, "model": m["model"], "regime": m["regime"],
                "oss_semgrep": {"classes": sorted(oss_c), "detected": hit(oss_c),
                                "any_finding": bool(oss_c)},
                "vibesec_rules": {"classes": sorted(vib_c), "detected": hit(vib_c),
                                  "any_finding": bool(vib_c)},
                "vibesec_full": {"classes": sorted(full_c), "detected": hit(full_c),
                                 "any_finding": bool(full_c)},
                "dependency_audit": dep,
            }

        # repo audit scripts, recorded for the appendix (aggregate signal)
        if track == "app":
            r = run_repo_script(C.REPOS["app"] / "scripts" / "audit-native.mjs",
                                [str(root)], "audit-native")
            if r:
                (C.RESULTS / "audit_native.log").write_text(r["stdout"], encoding="utf-8")

    (C.RESULTS / "detection_meta.json").write_text(
        json.dumps({"semgrep_version": ver, "provenance": C.provenance(), "tracks": meta, "fatal": fatal}, indent=2), encoding="utf-8")
    if fatal:
        print("\nDETECTION NOT VALID — nothing written to detections.json:")
        for f in fatal:
            print(f"  ! {f}")
        print("  Fix the cause (network access to semgrep.dev, Semgrep install) and re-run detect.py.")
        sys.exit(3)
    (C.RESULTS / "detections.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    (C.RESULTS / "detection_findings.json").write_text(json.dumps(all_rows, indent=2), encoding="utf-8")
    print(f"\nindexed {len(out)} samples; {len(all_rows)} raw findings   (semgrep {ver})")
    for track, m in meta.items():
        print(f"  {track}: registry packs used {len(m['oss_used'])}/{len(m['oss_used']) + len(m['oss_skipped'])}"
              + (f"   skipped: {', '.join(m['oss_skipped'])}" if m["oss_skipped"] else ""))
        for b in m["vibesec_rule_errors"]:
            print(f"  {track}: ! project rule not loaded by Semgrep: {b}")
    print(f"wrote {C.RESULTS/'detections.json'} and detection_meta.json")


if __name__ == "__main__":
    main()
