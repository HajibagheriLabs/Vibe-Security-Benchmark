# One-time Windows setup. The two projects under test are cloned NEXT TO this folder:
#
#   <parent>\
#     Web-Vibe-Security\
#     App-Vibe-Security\
#     Vibe-Security-Benchmark\     <- this repository
#
#   powershell -ExecutionPolicy Bypass -File .\Vibe-Security-Benchmark\setup.ps1

$ErrorActionPreference = "Stop"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Commits of the two projects the published corpus was generated against
# (results/corpus_provenance.json). Fresh clones are checked out at these commits.
$Pinned = @{
  "Web-Vibe-Security" = "ae818f151d58dd7ad3cddd5cf8c6a98d46bc39d6"
  "App-Vibe-Security" = "74b75a94d384eec2547b400343adad11b62dcc4d"
}

$Bench = $PSScriptRoot
Set-Location (Split-Path -Parent $Bench)
foreach ($repo in $Pinned.Keys) {
  if (-not (Test-Path $repo)) {
    git clone "https://github.com/HajibagheriLabs/$repo.git"
    git -C $repo checkout --quiet $Pinned[$repo]
  }
  $head = (git -C $repo rev-parse HEAD).Trim()
  if ($head -ne $Pinned[$repo]) {
    Write-Host "NOTE: $repo is at $head, not the benchmarked commit $($Pinned[$repo])." -ForegroundColor Yellow
  }
}

Set-Location $Bench
if (-not (Test-Path "venv")) { python -m venv venv }
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\python.exe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }

# Semgrep is only needed in Stage B (detect.py). A failure here must not block Stage A.
& .\venv\Scripts\python.exe -m pip install "semgrep>=1.80.0"
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARNING: semgrep did not install. Stage A is unaffected; see 'Semgrep won't run on Windows' in RUNBOOK.md." -ForegroundColor Yellow
} else {
  # Offline check that Semgrep can load both project rulesets
  & .\venv\Scripts\python.exe harness\detect.py --check-rules
}

# Smoke-test the install without touching any API
& .\venv\Scripts\python.exe harness\cost_estimate.py | Select-Object -Last 9

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
if (-not $env:OPENROUTER_API_KEY) {
  Write-Host 'Set your key once:  setx OPENROUTER_API_KEY "sk-or-v1-..."   then open a NEW terminal.'
}
Write-Host "Next: start llama-server (RUNBOOK.md, step 3), then follow RUNBOOK.md from Stage A."
