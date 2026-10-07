# Data dictionary

What every published file contains. All JSON is UTF-8. Artifact identifiers follow one pattern:

```
<SCENARIO>_<model>_<regime>_<pass>        e.g. WEB-08_qwen_local_guardrailed_pass_2
```

`<SCENARIO>` is `WEB-01` … `WEB-25`, `WEB-B1` … `WEB-B5`, `APP-01` … `APP-25`, `APP-B1` … `APP-B5`
(B = benign control); `<model>` is `qwen_local`, `nemotron_ultra` or `deepseek_v4_pro`;
`<regime>` is `baseline` or `guardrailed`; `<pass>` is `pass_1` or `pass_2`.

## Generated corpus

### `web/samples/*.json`, `app/samples/*.json` (717 files)

One raw model response with its full request and response metadata.

| Field | Meaning |
|---|---|
| `sample_id`, `scenario_id`, `track`, `module`, `cwe`, `lang` | identity of the task and its target class |
| `expected_vulnerable` | `true` for security scenarios, `false` for benign controls |
| `model`, `model_id`, `pinned_provider` | generator alias, endpoint model id, provider pin (`null` = none) |
| `regime`, `pass` | arm and sample number |
| `prompt` | the user prompt (identical in both arms) |
| `system_prompt_chars` | length of the system prompt actually sent |
| `raw_response` | the model's full answer, unedited |
| `attempts`, `seed` | transport attempts used; the per-sample seed sent |
| `sampling` | `temperature`, `top_p`, `top_k`, `max_tokens` |
| `api_meta` | `finish_reason`, `generation_id`, `provider` (served), `served_model`, `usage` (`prompt_tokens`, `completion_tokens`, `reasoning_tokens`, `cost`), `reasoning_field_present`, `reasoning_detected` |
| `timestamp` | Unix time of the response |

### `web/extracted/<id>/`, `app/extracted/<id>/` (717 folders)

The code files that the judges and Semgrep saw, plus `_manifest.json`:

| Field | Meaning |
|---|---|
| `file_list`, `n_files` | files extracted from the response |
| `code_chars`, `prose_chars` | characters of code kept and of prose dropped |
| `reasoning_chars_removed`, `thinking_leaked` | reasoning blocks stripped; whether any survived |
| `no_code`, `possible_refusal` | extraction flags |
| other fields | as in the sample |

## Results (`results/`)

| File | Contents |
|---|---|
| `corpus_provenance.json` | commit, clean/dirty state and SHA-256 of `AGENT_RULES.md` and `semgrep-rules.yml` for both projects, recorded when generation started |
| `corpus_hashes.csv` | `path, sha256` for every sample, last row `CORPUS_DIGEST` (hashed with CRLF line endings; see `scripts/verify_corpus.py`) |
| `preflight.json` | generator and judge endpoint checks: served provider, price verdict, which of `top_k` / `seed` / reasoning each honours, probe results, guardrail token counts |
| `preflight_judges.json` | the Stage B judge pre-flight |
| `run_log.jsonl` | one row per generation call: sample, model, provider, usage, `finish_reason`, `reasoning_detected` |
| `runner_state_<model>.json` | final state of each generator process |
| `failed/nemotron_ultra.json` | the 3 samples that could not be generated, with the last failure reason |
| `extraction_summary.json` | one manifest-like record per artifact |
| `judgments.json` | the corpus verdicts, keyed by artifact id (below) |
| `judge_failures.json`, `judge_state.json` | judging failures (none left) and final job state |
| `gold_judgments.json`, `gold_judge_failures.json`, `judge_state_gold.json` | the same for the 47 gold items: `GW…` web and `GA…` app pairs (`V` vulnerable, `S` safe), `GB…` benign, `RF-vuln-…` / `RF-reme-…` App-Vibe-Security's own vulnerable / remediated test fixtures |
| `judge_calibration.json` | per-judge and panel confusion matrices, sensitivity, specificity with Wilson CIs, κ, per-class accuracy, gate, round, judge configuration |
| `subagent_judge_index.json` | judge B exchange key → `{phase, item_id, judge}` |
| `registry_cache.json` | `"npm:<name>"` / `"pub:<name>"` → `true` (exists), `false` (does not), `null` (unverifiable) |
| `dependency_audit.json` | per artifact: `n_declared`, `nonexistent`, `unpinned`, `unverifiable`, `install_scripts`, `flagged` |
| `detections.json` | per artifact, for `oss_semgrep`, `vibesec_rules`, `vibesec_full`: `classes` found, `detected` (target class hit), `any_finding`; plus the dependency audit |
| `detection_findings.json` | every raw Semgrep finding: `sample_id`, `check_id`, `path`, `line`, `severity`, `classes`, `source` |
| `detection_meta.json` | Semgrep version, packs used and skipped with reasons and rule counts, project rules not loaded (none) |
| `audit_native.log` | output of App-Vibe-Security's `audit-native.mjs` over the app corpus (reference only, not scored) |
| `final_metrics.json` | every reported statistic: `vir_grr`, `by_class`, `detectors`, `detector_provenance`, `judge_kappa`, `pass_consistency`, `calibration` |
| `artifacts.csv` | one row per artifact (below): the easiest file to load into a spreadsheet or pandas |
| `table1.tex` | the headline table, LaTeX |

### `judgments.json`

| Field | Meaning |
|---|---|
| `judge_a`, `judge_b`, `judge_c` | each judge's full answer: `verdict`, `confidence`, `evidence` (`file`, `line`, `snippet`, `why`), `controls_present`, `other_classes_observed`, `declared_packages`, `task_implemented`, `refusal`, `_meta` (served provider, token usage, exchange key for judge B). `judge_c` (tiebreak) exists only when A and B disagreed |
| `final_verdict` | `vulnerable`, `not_vulnerable` or `not_applicable` |
| `unanimous` | `true` when A and B agreed |
| `task_implemented` | minimum of A and B: 0 none, 1 partial, 2 usable |
| `refusal` | `true` only if both A and B saw a refusal |
| `declared_packages` | union of the packages A and B saw in manifests |
| `n_files`, `code_chars`, `gold_label` | size of what was judged; `gold_label` is `null` outside the gold set |

### `artifacts.csv`

`sample_id, scenario_id, track, module, model, regime, pass, expected_vulnerable, verdict, vuln,
unanimous, task_implemented, refusal, no_code, code_chars, oss_detected, vibesec_detected,
vibesec_full_detected`. `vuln` is 1 when `verdict` is `vulnerable`. The primary population is
`expected_vulnerable == True` and `task_implemented >= 1`.

## Other files

| File | Contents |
|---|---|
| `goldset/goldset.json` | the 47 calibration items: `id`, `track`, `module`, `label`, `prompt`, `files` (filename → code) |
| `subagent_judge/<key>.prompt.md` | the exact user prompt judge B received (key = first 20 hex digits of `sha256("<judge model>:<phase>:<item id>")`) |
| `subagent_judge/<key>.response.json` | judge B's answer, as written by the judge |
| `spend_ledger.jsonl` | every model call of the project, generator and judge, smoke and full: time, phase, model, served provider, tokens, cost |
| `docs/figures/derived.json` | pooled and per-class counts with Wilson CIs, side-effect counts and Holm-adjusted McNemar *p*-values, written by `scripts/make_figures.py` |
| `harness/scenarios_*.json` | the 60 task prompts with class, CWE and language |
| `harness/rubrics/rubrics.json` | per-class judging rubric: `title`, `vulnerable_if`, `not_vulnerable_if`, `notes` |
| `harness/taxonomy.json` | class names, one-line definitions and CWE sets; registry pack lists |
| `harness/prompts/judge_system.md` | the judges' system prompt |
| `harness/agents/judge-b.md` | judge B's agent definition (its body is the judges' system prompt) |
