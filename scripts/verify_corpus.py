"""
Confirm that the published corpus is the one that was analysed. Read-only.

  python scripts/verify_corpus.py

Recomputes the SHA-256 of every sample under web/samples/ and app/samples/, and the corpus
digest, exactly as harness/hash_corpus.py does, then compares both with
results/corpus_hashes.csv. The run wrote its samples on Windows, so the recorded hashes are
over CRLF line endings. Git stores the files with LF, so this script normalises every file
to CRLF before hashing: the check passes on any operating system and any git line-ending
setting. Exit code 0 = verified, 1 = mismatch.
"""
import csv
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    with open(ROOT / "results" / "corpus_hashes.csv", encoding="utf-8", newline="") as fh:
        recorded = dict(csv.reader(fh))
    expected_digest = recorded.pop("CORPUS_DIGEST")
    recorded.pop("path")                                    # header row

    rows, differ = [], []
    for track in ("web", "app"):
        for f in sorted((ROOT / track / "samples").glob("*.json")):
            data = f.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
            path, digest = f"{track}/samples/{f.name}", hashlib.sha256(data).hexdigest()
            rows.append((path, digest))
            if recorded.get(path) != digest:
                differ.append(path)
    missing = sorted(set(recorded) - {p for p, _ in rows})
    corpus = hashlib.sha256("".join(f"{p}:{h}\n" for p, h in rows).encode()).hexdigest()

    print(f"samples hashed     {len(rows)}  (recorded {len(recorded)})")
    print(f"differing samples  {len(differ)}   missing samples {len(missing)}")
    print(f"corpus digest      {corpus}")
    print(f"recorded digest    {expected_digest}")
    for p in (differ + missing)[:10]:
        print(f"  ! {p}")
    ok = not differ and not missing and corpus == expected_digest
    print("CORPUS VERIFIED" if ok else "CORPUS DOES NOT MATCH")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
