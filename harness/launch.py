"""
Launch long-running jobs as DETACHED background processes that survive the
terminal closing. Logs go to results/logs/
(smoke/results/logs/ for smoke). Watch progress with harness/status.py.

  python harness/launch.py smoke          # 3 generators in parallel, smoke set
  python harness/launch.py generate       # 3 generators in parallel, full run
  python harness/launch.py retry          # --retry-failed for each generator
  python harness/launch.py retry --models qwen_local
  python harness/launch.py judge-gold [--fresh]
  python harness/launch.py judge          # refused until calibrate_judge.py reports GATE PASSED
  python harness/launch.py judge-retry

Refuses to start a job whose previous process is still alive, so it is always
safe to re-run after a crash.
"""
import argparse
import json
import os
import subprocess
import sys
import time

import config as C
from status import alive

JOBS = ["smoke", "generate", "retry", "judge-gold", "judge", "judge-retry"]

# Windows process-creation flags
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200
CREATE_BREAKAWAY_FROM_JOB = 0x01000000


def running(state_file):
    if not state_file.exists():
        return False
    try:
        s = json.loads(state_file.read_text(encoding="utf-8"))
    except Exception:
        return False
    return s.get("status") == "running" and alive(s.get("pid")) is True


def spawn(name, args, log_dir, state_file):
    stamp = time.strftime("%Y%m%d-%H%M%S")
    out = open(log_dir / f"{name}.{stamp}.out.log", "w", encoding="utf-8")
    err = open(log_dir / f"{name}.{stamp}.err.log", "w", encoding="utf-8")
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    cmd = [sys.executable, "-u"] + args
    kw = dict(cwd=str(C.BASE_DIR), env=env, stdout=out, stderr=err, stdin=subprocess.DEVNULL)
    note = ""
    if os.name == "nt":
        try:
            p = subprocess.Popen(cmd, creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
                                 | CREATE_BREAKAWAY_FROM_JOB, **kw)
        except OSError:
            # The calling job does not allow breakaway. The process still runs,
            # but may stop if the session that launched it ends.
            p = subprocess.Popen(cmd, creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, **kw)
            note = "  (could not break away from the parent job: keep this session open)"
    else:
        p = subprocess.Popen(cmd, start_new_session=True, **kw)
    # provisional heartbeat so an immediate second launch is refused; the job
    # overwrites it with its own state as soon as it starts
    state_file.write_text(json.dumps({"tag": state_file.stem.replace("runner_state_", ""), "status": "running", "pid": p.pid,
                                      "updated": time.time(), "provisional": True}), encoding="utf-8")
    print(f"started {name:<24} pid={p.pid:<7} log={out.name}{note}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("job", choices=JOBS)
    ap.add_argument("--models", nargs="+", choices=list(C.MODELS), default=list(C.MODELS))
    ap.add_argument("--fresh", action="store_true", help="judge-gold: start a new calibration round")
    ap.add_argument("--accept-gate", action="store_true",
                    help="judge: run although the calibration gate failed (user approval required)")
    a = ap.parse_args()

    if not C.OPENROUTER_KEY:
        print("OPENROUTER_API_KEY is not set in this environment")
        sys.exit(2)
    C.set_smoke(a.job == "smoke")
    log_dir = C.RESULTS / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    if a.job in ("smoke", "generate", "retry"):
        for m in a.models:
            if running(C.RESULTS / f"runner_state_{m}.json"):
                print(f"skip {m}: its runner is still alive")
                continue
            args = ["harness/runner.py", "--only-model", m]
            if a.job == "smoke":
                args.append("--smoke")
            if a.job == "retry":
                args.append("--retry-failed")
            spawn(f"{a.job}-{m}", args, log_dir, C.RESULTS / f"runner_state_{m}.json")
    else:
        if a.job in ("judge", "judge-retry") and not a.accept_gate:
            cal = C.RESULTS / "judge_calibration.json"
            try:
                passed = json.loads(cal.read_text(encoding="utf-8")).get("gate_passed") is True
            except Exception:
                passed = False
            if not passed:
                print("refused: the calibration gate has not passed for the current round.\n"
                      "  Run launch.py judge-gold, then calibrate_judge.py. If the user decides to\n"
                      "  proceed anyway, log the deviation and add --accept-gate.")
                sys.exit(1)
        hb = C.RESULTS / ("judge_state_gold.json" if a.job == "judge-gold" else "judge_state.json")
        if running(hb):
            print(f"skip: {a.job} is still running")
            return
        args = {"judge-gold": ["harness/judge.py", "--gold"], "judge": ["harness/judge.py"],
                "judge-retry": ["harness/judge.py", "--retry-failed"]}[a.job]
        if a.job == "judge-gold" and a.fresh:
            args.append("--fresh")
        spawn(a.job, args, log_dir, hb)
    print(f"monitor: python harness/status.py{' --smoke' if a.job == 'smoke' else ''}")


if __name__ == "__main__":
    main()
