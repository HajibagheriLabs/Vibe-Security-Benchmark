"""
Phase 2 — extraction.

Turns each raw model response into a real file tree so that Semgrep and the judge
see CODE ONLY, never the model's prose.

Why this matters: guardrailed answers routinely contain "never write
AsyncStorage.setItem for tokens" as explanatory text, and reasoning models emit
<think> blocks. Any analysis run over the raw response labels those as
vulnerabilities, which biases the treatment arm in exactly the direction that
destroys the result. An earlier prototype's evaluate.py regexed the raw string.

  python harness/extract.py
"""
import argparse
import json
import re
import shutil

import config as C

THINK_TAGS = ["think", "thinking", "reasoning", "reflection", "scratchpad"]

EXT = {
    "typescript": ".ts", "ts": ".ts", "tsx": ".tsx", "typescriptreact": ".tsx",
    "javascript": ".js", "js": ".js", "jsx": ".jsx", "javascriptreact": ".jsx",
    "mjs": ".mjs", "cjs": ".cjs", "node": ".js",
    "json": ".json", "jsonc": ".json",
    "sql": ".sql", "postgresql": ".sql", "plpgsql": ".sql",
    "dart": ".dart", "flutter": ".dart",
    "kotlin": ".kt", "kt": ".kt", "java": ".java", "swift": ".swift",
    "objc": ".m", "objectivec": ".m",
    "xml": ".xml", "plist": ".plist", "html": ".html",
    "gradle": ".gradle", "groovy": ".gradle", "kts": ".gradle.kts",
    "yaml": ".yaml", "yml": ".yaml", "toml": ".toml",
    "rust": ".rs", "rs": ".rs", "python": ".py", "py": ".py",
    "bash": ".sh", "sh": ".sh", "shell": ".sh", "powershell": ".ps1",
    "ini": ".ini", "env": ".env", "text": ".txt", "": ".txt",
}

REFUSAL_MARKERS = [
    "i can't help", "i cannot help", "i can't assist", "i cannot assist",
    "i won't provide", "i will not provide", "i'm unable to help",
    "i can't provide", "i cannot provide", "against my guidelines",
]

FILE_EXTS = r"ts|tsx|js|jsx|mjs|cjs|json|sql|dart|kt|kts|java|swift|m|xml|plist|html|gradle|ya?ml|toml|rs|py|sh|ps1|npmrc|env|lock"
# (?!\w): the extension must end the name, so package.json / App.tsx are not cut to .js / .ts
FNAME_RE = re.compile(
    r"(?:^|[\s`*\"'(\[])((?:[\w.@\-]+/)*[\w.\-]+\.(?:" + FILE_EXTS + r")(?!\w))",
    re.IGNORECASE,
)
# A line that is nothing but a file path (optionally marked up). Used only for
# responses with no fenced block at all.
PATH_LINE_RE = re.compile(
    r"^\s*[#/*`\s]*((?:[\w.@\-]+/)*(?:[\w.\-]+\.(?:" + FILE_EXTS + r")|\.env(?:\.[\w\-]+)?|\.npmrc))[`*:\s]*$",
    re.IGNORECASE,
)
BARE_FILES = {".npmrc", ".env", ".env.example", "pubspec.yaml", "package.json",
              "androidmanifest.xml", "info.plist", "build.gradle", "main.js",
              "preload.js", "tauri.conf.json", "network_security_config.xml"}


def strip_reasoning(text):
    """Remove thinking blocks. Returns (clean_text, chars_removed)."""
    before = len(text)
    for tag in THINK_TAGS:
        text = re.sub(rf"<{tag}>.*?</{tag}>", "", text, flags=re.S | re.I)
        text = re.sub(rf"<\|{tag}\|>.*?<\|/{tag}\|>", "", text, flags=re.S | re.I)
    # unterminated opening tag: drop everything up to the first fence after it
    for tag in THINK_TAGS:
        m = re.search(rf"<{tag}>", text, re.I)
        if m:
            nxt = text.find("```", m.end())
            text = text[:m.start()] + (text[nxt:] if nxt != -1 else "")
    return text, before - len(text)


def find_fences(text):
    """Scan fenced blocks, honouring fences of 3+ backticks/tildes."""
    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        m = re.match(r"^\s{0,3}(`{3,}|~{3,})[ \t]*([\w+#.\-]*)", lines[i])
        if not m:
            i += 1
            continue
        marker, lang, body, j = m.group(1)[0], (m.group(2) or "").lower(), [], i + 1
        need = len(m.group(1))
        while j < len(lines):
            e = re.match(rf"^\s{{0,3}}{re.escape(marker)}{{{need},}}\s*$", lines[j])
            if e:
                break
            body.append(lines[j])
            j += 1
        out.append({"lang": lang, "code": "\n".join(body),
                    "lead": "\n".join(lines[max(0, i - 4):i])})
        i = j + 1
    return out


def find_path_sections(text):
    """Fallback for responses without fences: each path-only line starts a file
    that runs until the next one. Text before the first path line is dropped."""
    out, cur = [], None
    for line in text.split("\n"):
        m = PATH_LINE_RE.match(line)
        if m:
            env = m.group(1).split("/")[-1].lower().startswith(".env")
            cur = {"lang": "env" if env else "", "lines": [], "lead": m.group(1)}
            out.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
    return [{"lang": b["lang"], "code": "\n".join(b["lines"]).strip("\n"), "lead": b["lead"]}
            for b in out]


def content_name(block):
    """Manifests that detectors match BY FILENAME must be named correctly."""
    c, lang = block["code"], block["lang"]
    if lang in ("json", "jsonc", "") and '"dependencies"' in c and '"name"' in c:
        return "package.json"
    if lang in ("yaml", "yml") and "dependencies:" in c and ("flutter:" in c or "sdk:" in c):
        return "pubspec.yaml"
    if "<manifest" in c and "android" in c.lower():
        return "AndroidManifest.xml"
    if "<network-security-config" in c:
        return "res/xml/network_security_config.xml"
    if "<!DOCTYPE plist" in c or "<plist" in c:
        return "Info.plist"
    if "signingConfigs" in c or ("android {" in c and "buildTypes" in c):
        return "app/build.gradle"
    if "registry=" in c or "ignore-scripts" in c:
        return ".npmrc"
    if lang in ("json", "") and '"tauri"' in c:
        return "tauri.conf.json"
    return None


def guess_name(block, idx, default_lang):
    """Filename from the lead-in lines, then a header comment, then content, else generic."""
    for source in (block["lead"], "\n".join(block["code"].split("\n")[:3])):
        for cand in FNAME_RE.findall(source or ""):
            base = cand.split("/")[-1].lower()
            if base in BARE_FILES or "." in base:
                return cand.lstrip("./")
    cn = content_name(block)
    if cn:
        return cn
    lang = block["lang"] or default_lang
    return f"snippet_{idx:02d}{EXT.get(lang, EXT.get(default_lang, '.txt'))}"


def process(artifact):
    raw = artifact["raw_response"]
    clean, removed = strip_reasoning(raw)
    blocks = find_fences(clean) or find_path_sections(clean)
    prose =re.sub(r"```.*?```", " ", clean, flags=re.S).strip()

    files, seen = {}, {}
    for i, b in enumerate(blocks, 1):
        if not b["code"].strip():
            continue
        name = guess_name(b, i, artifact["lang"])
        name = re.sub(r"[^\w./\-]", "_", name).lstrip("/")
        if name in seen:                      # same file emitted twice -> keep both
            seen[name] += 1
            stem, _, ext = name.rpartition(".")
            name = f"{stem}_{seen[name]}.{ext}"
        else:
            seen[name] = 0
        files[name] = b["code"]

    low = prose.lower()[:1500]
    return {
        "files": files,
        "n_files": len(files),
        "code_chars": sum(len(v) for v in files.values()),
        "prose_chars": len(prose),
        "reasoning_chars_removed": removed,
        "thinking_leaked": (removed > 0
                            or artifact["api_meta"].get("reasoning_field_present", False)
                            or artifact["api_meta"].get("reasoning_detected", False)),
        "no_code": len(files) == 0,
        "possible_refusal": len(files) == 0 and any(m in low for m in REFUSAL_MARKERS),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true")
    C.set_smoke(ap.parse_args().smoke)
    summary = []
    for track in ["web", "app"]:
        src, dst = C.samples_dir(track), C.extracted_dir(track)
        if not src.exists():
            continue
        if dst.exists():
            shutil.rmtree(dst)
        dst.mkdir(parents=True, exist_ok=True)
        for f in sorted(src.glob("*.json")):
            a = json.loads(f.read_text(encoding="utf-8"))
            r = process(a)
            d = dst / a["sample_id"]
            d.mkdir(parents=True, exist_ok=True)
            for name, code in r["files"].items():
                p = d / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(code, encoding="utf-8")
            meta = {k: a[k] for k in ("sample_id", "scenario_id", "track", "module", "cwe",
                                      "lang", "expected_vulnerable", "model", "regime",
                                      "pass", "prompt")}
            meta.update({k: r[k] for k in r if k != "files"})
            meta["file_list"] = list(r["files"])
            (d / "_manifest.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
            summary.append(meta)

    C.RESULTS.mkdir(parents=True, exist_ok=True)
    (C.RESULTS / "extraction_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8")

    n = len(summary)
    if not n:
        print("No artifacts found. Run runner.py first.")
        return
    nc = sum(s["no_code"] for s in summary)
    rf = sum(s["possible_refusal"] for s in summary)
    tl = sum(s["thinking_leaked"] for s in summary)
    print(f"\nextracted {n} artifacts")
    print(f"  no code emitted     : {nc} ({nc/n:.1%})")
    print(f"  possible refusals   : {rf} ({rf/n:.1%})")
    print(f"  thinking leakage    : {tl} ({tl/n:.1%})   <- must be ~0; if not, see RUNBOOK.md, stop conditions")
    print(f"  mean files/artifact : {sum(s['n_files'] for s in summary)/n:.2f}")
    print(f"\nwrote {C.RESULTS/'extraction_summary.json'}")


if __name__ == "__main__":
    main()
