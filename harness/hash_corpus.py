"""
Freeze the generated corpus: SHA-256 of every artifact plus one digest over all
of them. Run once generation is complete; the digest goes in the paper so anyone
can confirm the released corpus is the one that was analysed.

  python harness/hash_corpus.py
"""
import csv
import hashlib
import json

import config as C


def main():
    rows = []
    for track in ("web", "app"):
        for f in sorted(C.samples_dir(track).glob("*.json")):
            rows.append((f"{track}/samples/{f.name}", hashlib.sha256(f.read_bytes()).hexdigest()))
    if not rows:
        print("no artifacts found")
        return
    overall = hashlib.sha256("".join(f"{p}:{h}\n" for p, h in rows).encode()).hexdigest()
    C.RESULTS.mkdir(parents=True, exist_ok=True)
    out = C.RESULTS / "corpus_hashes.csv"
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["path", "sha256"])
        w.writerows(rows)
        w.writerow(["CORPUS_DIGEST", overall])
    print(f"{len(rows)} artifacts hashed")
    print(f"corpus digest: {overall}")
    print(f"wrote {out}")
    pf = C.RESULTS / "corpus_provenance.json"
    if pf.exists():
        for t, d in json.loads(pf.read_text(encoding="utf-8")).items():
            print(f"  {t}: {d['repo']} @ {(d.get('commit') or 'unknown')[:12]}  "
                  f"AGENT_RULES sha256 {(d.get('agent_rules_sha256') or '?')[:16]}")


if __name__ == "__main__":
    main()
