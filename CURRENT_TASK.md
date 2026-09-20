# Places notice review (2026-09-20)

Stale Places notices were removed; only the 14th Winter Silhouette Bonsai Show
remains. As confirmed by Jim, official event information was verified against
the official event website on September 20, 2026, before the local review.
HTML and link corrections were incorporated into the supplied clean copy;
the local review subsequently confirmed them.

The local review confirmed stylesheet /css/styles.css?v=3039, the displayed
Verified September 20, 2026 date, valid Winter Bonsai external-link markup,
balanced and correctly nested HTML, and no Markdown escapes. Python HTMLParser
validation and git diff --check passed. No further page edits were needed.

Completed Places cleanup commit: edcc40ab5f82a87d0c865143f1379f43cf890027
(Remove stale Places notices), containing only public/places.html.
No push or deployment has occurred for this task.

Next safe step: commit these two work records separately as
Record Places notice cleanup, then report the documentation commit and status.
No push or deployment is authorized.

---

# Current Task: GENE Reveals Entry Links (2026-09-20)

Implemented locally on `agent-sandbox`; no commit, push, merge, or deployment.
The pre-existing tracked edit to `public/gene_reveals.html` was left untouched.

- `public/index.html`: retargeted the existing image link to `/gene_reveals.html`,
  added its descriptive accessible name and the linked `GENE Reveals` caption,
  and advanced the stylesheet cache version from 3038 to 3039.
- `public/css/styles.css`: added narrowly scoped caption positioning and visible
  keyboard focus. The caption uses existing colors and font family in the existing
  gap so image/copy geometry and surrounding spacing remain unchanged.
- `public/gene-project.html`: changed only the button label to `GENE Reveals`.
- `CURRENT_TASK.md` and `CHANGELOG.md`: recorded this work as required by AGENTS.md.

Chrome previews at 1440px and 390px passed image loading, actual image/caption/button
clicks, visible keyboard focus, and horizontal-overflow checks. Homepage image and
copy bounding boxes exactly match the HEAD baseline at both widths. Global navigation,
image source/alt text, and Theory/Practice structure are unchanged. `git diff --check`
passed. Screenshots and exact diff are in `.local-gene-review/home-reveals-20260920/`.
Next step: Jim's visual review; no publishing action is authorized by this task.

---

# Current Task: Production Integration and Deployment Hardening

## Scope and status

Work is confined to `claycraze_production_integration` on `integration/production-sync`.
Jim authorized committing the verified pending merge and fast-forwarding/pushing
only `agent-sandbox`. This record captures validation immediately before that
authorized commit; the completion SHA and push result are reported separately.
No production-branch push, PR, or deployment is authorized.
The former GENE state-progression brief is stale for this task; no repair of that
fault is claimed. Both CURRENT_TASK files are retained. AGENTS.md is unchanged.

## Findings and corrections

The initial deployment correction required Python 3.9+, validated Trees too late,
and left failed candidates behind. Hardening now targets Python 3.6 APIs and grammar,
performs read-only checks before payload uploads, and cleans the exact candidate.
Lossless decimal comparison also prevents a non-Test change from being hidden by
floating-point rounding. Path checks reject traversal, symlinks, hard links, and
protected inventory paths before content access.

## Operation order

1. Validate the exact 25 supplemental sources and existing ordinary static sources
   locally. Reject unsafe, missing, redirected, hard-linked, or protected paths.
2. Check `python3`, its minimum version, the production root, writable/searchable
   target parents (or the nearest existing parent for a new directory), readable
   current Trees JSON, and exact obsolete-file target safety without remote mutation.
3. Upload only `.trees-candidate-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}.json` in
   the data directory, then validate it against current Trees records before static
   uploads. Reject an already-existing candidate during preflight.
4. Run existing ordinary uploads and the 25-file supplemental manifest upload.
5. Revalidate current and candidate Trees records, preserve current permissions,
   atomically replace Trees JSON, remove the four approved obsolete files, and
   remove the Test directory non-recursively only if empty.
6. The guard cleans its candidate on failure and success. A workflow EXIT trap also
   requests exact-path cleanup after upload, validation, static-upload, or apply
   failures; INT/TERM trigger exit. Cleanup failure makes the workflow fail.

## Files changed by this red-team pass

- `.github/workflows/deploy.yml`: preflight, early candidate validation, final
  revalidation, and exact-candidate cleanup trap. Existing trigger, credentials,
  production root, ordinary upload commands, and protected-data scope are retained.
- `.github/deploy/guard-trees.py`: Python 3.6-compatible path/unlink operations;
  preflight, validation and cleanup modes; path protections; lossless JSON comparison.
- `.github/deploy/validate-manifest.py`: explicit approved allowlist and safe local
  static-source inventory for remote target checks; data excluded from static uploads.
- `.github/deploy/test_guard.py`: expanded local guard, preflight, cleanup, manifest,
  traversal, protected-path, precision, and hard-link fixtures.
- `CURRENT_TASK.md`, `CURRENT_TASK(1).md`, `CHANGELOG.md`: updated work records.
- The 25-line supplemental manifest is unchanged.

## Verification

- PyYAML parsing and Bash syntax checks passed for every workflow shell block.
- Python syntax passed, including Python 3.6 grammar for the remote guard. Fixtures
  ran on Python 3.12.10; no Python 3.6 executable is installed, so runtime execution
  on that version has not been claimed.
- 30 guard/manifest tests: 29 passed, one native-symlink test skipped because Windows
  lacks symlink privileges. A separate mocked symlink-rejection test passed.
- Seven Bash workflow fixtures passed with SSH, SCP and rsync replaced by local
  functions: success, preflight failure, candidate-upload failure, validation failure,
  static-upload failure, apply failure, and cleanup failure. No network commands ran.
- Actionlint and ShellCheck are unavailable in PowerShell and Git Bash PATH; neither
  is claimed to have passed.
- Exactly 25 approved supplemental sources exist. All 69 changed public payloads
  remain covered: 43 existing + 25 supplemental + 1 guarded Trees update.
- Exactly four obsolete-file cleanup targets match Git's public deletions. The
  run-specific temporary candidate is separate transient-file cleanup.
- Protected pottery inventory was not read, copied, hashed, moved, deleted, or
  overwritten. It is excluded from uploads and rejected by the path validators.
- No credential logging, broad new data/image/tree sync, deletion flag, recursive
  removal, or wildcard deletion was introduced. No public payload was edited.
- Staged and unstaged diff checks passed.

## Residual risks and next safe step

Jim authorized the integration commit and agent-sandbox push after review.
The separately authorized read-only production preflight confirmed Python 3.14.7,
accessible/writable target parents, no symlinks in checked paths, and Trees JSON
matching the reviewed eight-record baseline. Only images/brand is a missing target
directory; its existing parent is writable. The two stale JSON backups are absent;
the Test page and photograph exist. Protected pottery inventory was not inspected.
Disk capacity and actual publisher coordination remain unverified. Read-only permission checks cannot
guarantee later writes. Revalidation detects intervening Trees changes, but a
noncooperating publisher can still race between the final read and atomic rename.
Static files and obsolete-file removals are not a whole-site transaction and have
no rollback. Connection loss, permission changes, or forced runner termination can
prevent cleanup; the exact candidate may then require separately authorized review.
Existing SSH host-key settings were preserved, not strengthened by this task.
Review artifacts and parser dependencies in `.local-deploy-review/` stay untracked.
No production writes, site uploads, remote deletions, cache changes, or deployment
occurred. Pre-commit checks reconfirmed the intended two parents, exact approved
staging scope, all 69 payloads covered, inventory protection, syntax and fixture
checks, and staged/unstaged diff checks. Existing validator limitations remain
listed above. A production-branch push or deployment requires separate approval.
