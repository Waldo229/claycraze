# ClaycrazE / GENE Change Log

Record only verified work. Keep entries short and factual.

## Unreleased - production integration review

### Deployment coverage

- Added the exact 25-file supplemental manifest, source validator, guarded Trees
  update, and local tests. All 69 changed public payloads are covered.
- Limited obsolete-file cleanup to four approved paths and non-recursive removal
  of the Test directory only if empty. Protected inventory remains excluded.
- Retained incoming AGENTS.md and both task files; reconciled their stale GENE
  repair scope without claiming that unrelated fault was investigated or fixed.

### Red-team hardening

- Targeted Python 3.6-compatible remote APIs and grammar instead of 3.9+ APIs.
- Added non-mutating runtime, root, target-parent permissions, path-safety, and
  current-Trees JSON preflight before uploads. Validate the uploaded candidate
  before static payloads, then revalidate immediately before atomic replacement.
- Added exact run-specific candidate cleanup in the guard and workflow EXIT trap.
- Enforced the explicit manifest allowlist; rejected traversal, symlinks, hard links,
  and protected paths; preserved decimal precision when comparing JSON records.
- Preserved workflow trigger, credentials, target, ordinary upload commands, and
  protected-data scope. No public payload content was edited.

### Verified locally

- YAML, Bash syntax, Python syntax and Python 3.6 grammar checks passed.
- 29 guard/manifest tests passed; one native-symlink test skipped due to Windows
  privileges. Mocked symlink rejection passed. Seven stubbed Bash workflow success
  and failure scenarios passed without network access.
- Exact 25-file manifest, all 69 payloads, exact four obsolete-file targets,
  inventory exclusion, and staged/unstaged diff checks passed.
- Actionlint and ShellCheck unavailable. Python 3.6 execution not tested; installed
  Python 3.12.10 ran fixtures. Authorized read-only production preflight confirmed
  Python 3.14.7, writable target parents, no checked symlinks, and the unchanged
  eight-record Trees baseline. Protected pottery inventory was not inspected.

### Integration and deployment status

- Jim authorized the verified integration merge commit and only an agent-sandbox
  fast-forward/push. This entry records pre-commit validation; completion SHA and
  push results are reported separately. Only the nine approved files are staged.
- No production writes, site uploads, remote deletions, cache changes, or deployment
  performed. Production-branch pushes, PRs, and deployment remain outside scope.
- No whole-site rollback is provided. Publisher races and later I/O failures remain
  possible; connection loss or forced termination can prevent exact-candidate
  cleanup. Any later deployment requires review and publisher coordination.
