## Curatorial Studio form repair (2026-09-21)

Reproduced the live Render failure after a cold start. The page requested
`/gallery-data/all` while the asynchronous SiteGround restore was still running;
the route returned HTTP 200 with an empty array, so the Existing Piece picker
remained empty even after all 27 records reached Render. The upper status beside
Save Piece was also never updated. Generate Description and Suggest Price were
empty functions, while Wine Label and Lao-tzu Line were not bound at all.

Implemented locally on `agent-sandbox` with no commit, push, deployment, or
canonical pottery write. `/gallery-data/all` now returns a named HTTP 503 readiness
response with Retry-After until registration is complete. The curator retries that
specific response for up to 30 seconds and displays the restore progress in both
status locations. Both Save buttons now share mode labels and disabled-during-save
state; mode buttons expose their pressed state; successful ID generation is
reported; clearing the form also clears stale assist fields, dimensions, identifier,
and preview; JPEG validation and preview alt text were restored. Shape definitions
now include Face Jug, Ikebana, and Sculpture. All four drafting controls produce
reviewable output. Donated is available as a normal status; Archive remains visible
but disabled because the server correctly requires a separate protected workflow.
CSS/JS cache versions were advanced narrowly.

Verification: live browser reproduction confirmed the cold-start empty-picker race
and the permanently stale upper status. Four new curator regression tests passed,
including a 503-then-success restore sequence, synchronized status/mode controls,
all drafting actions, and the server readiness gate. The full Node test suite passed
33/33. Client and server JavaScript syntax, deployment Python syntax, and
`git diff --check` passed. A full local Express/SQLite process test was unavailable:
the workspace provides Node 24 while the project requires Node 20, and sqlite3's
native install failed under the mismatched runtime. No repository file was changed
by that failed install because `node_modules` is ignored.

Status: READY WITH LIMITATIONS. Next safe step: review the local diff, then—only
with Jim's authorization—commit and push `agent-sandbox` so Render can deploy the
test service. After deployment, cold-start the Render service and verify that the
picker waits and then shows all canonical records before testing a non-destructive
edit. Production is untouched.

---

## Homepage destinations sandbox deployment (2026-09-20)

Verified agent-sandbox at 8a2b364c7cb38985440e32adb1f15aa0d8ace0d7 with
clean tracked worktree/index. Normal push succeeded; HEAD, origin/agent-sandbox,
and the live remote branch SHA matched. Uploaded only public/index.html and
public/css/styles.css via established SCP to sandbox.claycraze.com/public_html.
No work records or review artifacts were uploaded. Production was untouched.

Local, remote-file, and cache-busted HTTPS SHA-256 match for each file:
index.html: c0612cbe19c1a0a6f20c1be6a3b61915e16d981cb45877ddab5a0ccfe58b5010
css/styles.css: d45e46cbf806d94403a7b3ee1462e790e8e6652aaa4a79a13f3ecba5ff3ad8b5
Targeted sandbox purges made ordinary /index.html and CSS (including ?v=3040)
current. LIMITATION: bare / still returns old cached HTML with SHA-256
 e9b15a76cf0ebda71d38deee5416e11fd015846ebcd49542f2a84c8bbd8b37ec
without the caption and with stylesheet version 3038. Cache-busted / returns
the correct new index. Repeated targeted root purges returned OK but did not
clear that stale response. No broad purge or file cache-bypass edits were made.

Live /index.html checks at 1440px and 390px passed mouse and keyboard Enter
navigation: image to /welcome.html and caption to /gene_reveals.html. Both
links have visible focus; CSS 3040 loads; no overflow or JavaScript exceptions.
Resting screenshots are pixel-identical to the pre-correction baseline.
Evidence: .local-gene-review/home-destinations-live-20260920/ and
.local-gene-review/home-destinations-deploy-results.json. Final verification
JSON reflects the retry; both CSS and index were purged during the first run.
Status: READY WITH LIMITATIONS. Next safe step: investigate the bare-root
sandbox cache with SiteGround; do not expand purge scope without authorization.
These deployment records remain local and unstaged. No additional commit.

---

## Homepage GENE destinations (2026-09-20)

Separated the homepage image and caption into sibling links in
public/index.html: the image opens /welcome.html with the accessible name
Enter the ClaycrazE welcome page; GENE Reveals opens /gene_reveals.html.
The image source, alt text, and dimensions are unchanged. Stylesheet reference
advanced from 3039 to 3040. public/css/styles.css positions the caption from
.home-gene-feature, keeps the image link block-level, preserves its focus
outline, and gives the caption gold hover/focus color, an underline on
interaction, and a visible keyboard-focus outline.

Chrome previews at 1440px and 390px passed actual mouse clicks and keyboard
Enter navigation for both links, visible keyboard focus, caption hover,
image loading, no horizontal overflow, and no JavaScript exceptions.
Image, caption, and copy geometry match the previous version exactly;
resting before/after screenshots are pixel-identical at both widths.
git diff --check passed. Evidence is in
.local-gene-review/home-destinations-20260920/.

The completed Places sandbox deployment records were preserved and committed
separately as 71662e6 (Record Places sandbox deployment).
Homepage commit scope: public/index.html, public/css/styles.css,
CURRENT_TASK.md, and CHANGELOG.md. No push or deployment.
Next safe step: Jim reviews the committed local change before authorizing
any push or deployment. Older work-record entries remain unchanged.

---

## Places sandbox deployment (2026-09-20)

Deployed only public/places.html using the established selective SCP connection
to /home/customer/www/sandbox.claycraze.com/public_html/places.html.
Preflight: agent-sandbox at 00194e91ef5c9cce719ca188f69b229a5c4ed80c;
tracked worktree and index clean; page matches approved commit
edcc40ab5f82a87d0c865143f1379f43cf890027.
Local, remote-file, cache-busted HTTPS, and ordinary HTTPS SHA-256 all match:
c860b68b56ccfb0380ebf291e5673d6efde8bfd90809d0571ea77feb5e0f440f
Ordinary URL was current; no cache purge was needed.

Desktop 1440px and mobile 390px checks and screenshot review confirmed only the
14th Winter Silhouette notice, Verified September 20, 2026, stylesheet version
3039 loaded, and no horizontal overflow. The official show link opened on click
and returned HTTP 200. No JavaScript exceptions observed. Browser console check
has one limitation: /favicon.ico returns HTTP 404. No extra file was uploaded
to address it. Status: READY WITH LIMITATIONS.

Evidence: .local-gene-review/places-deploy-20260920.json and
.local-gene-review/places-live-20260920/ (screenshots and browser results).
Production was untouched. No commit, push, merge, or rebase was performed.
Work-record updates remain local and unstaged; they were not uploaded.
Next safe step: Jim reviews the sandbox and decides whether to authorize a
separate favicon repair. No further deployment is authorized by this task.

---

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
## Offering GENE homepage preview (2026-09-20)

Verified claycraze_agent_sandbox on agent-sandbox with clean tracked files before
editing. Found the supplied image at images/offering_gene.png and converted it
to public/offering_gene.jpg at its original 1240 x 1269 dimensions (JPEG quality
95). Changed only the homepage image src and requested alt text in public/index.html.
Existing welcome and GENE Reveals links, classes, CSS, navigation, and other
content are preserved. This entry and CHANGELOG.md record the completed review.

Chrome previews at 1440px and 390px passed: complete supplied composition visible
(eclipse, halo, pot, hands, robe, boots), preserved aspect ratio, no unexpected
cropping or horizontal overflow, no homepage console errors or JS exceptions.
Actual mouse clicks and keyboard Tab/Enter reached /welcome.html and
/gene_reveals.html with visible keyboard focus. Unchanged CSS renders the new
portrait image slightly taller than the former square image (368.41px desktop,
266.08px mobile). git diff --check passed.

Evidence: .local-gene-review/offering-preview-20260920/ (screenshots, results,
and exact.diff). Status: READY. Jim approved the preview and authorized committing
these four files and pushing only agent-sandbox. Next safe step: complete that
commit and push, then report the verified commit hash. No merge or deployment
is authorized or performed.

---

## Offering GENE deployment coverage correction (2026-09-20)

Verified agent-sandbox with clean tracked files before editing. The existing
production workflow omitted the root JPEG referenced by the approved homepage.
Added only offering_gene.jpg to .github/deploy/supplemental-public.txt and its
strict allowlist in validate-manifest.py, updating the approved count to 26.
Updated the existing manifest test count and asserted coverage of both index.html
and offering_gene.jpg. Workflow, destinations, exclusions, data guards, and all
public content are unchanged. CHANGELOG.md records this completed local repair.

Validation: manifest/source validation passed; YAML parsing and bash -n for all
three workflow run blocks passed; Python validator syntax passed. Existing tests:
29 passed, one native-symlink fixture skipped for Windows privilege limitations;
mocked symlink rejection passed. Initial sandbox fixture permissions required
rerunning the tests outside the sandbox. git diff --check passed.

Both files are covered by the same production deployment job: index.html via
public/*.html and offering_gene.jpg via the relative supplemental manifest,
targeting /home/customer/www/claycraze.com/public_html. Existing sequential upload
behavior is preserved; deployment is not atomic. No protected pottery data read
or modified. Jim approved this correction and authorized committing these five
files and pushing only agent-sandbox. Status: READY. Next safe step: complete the
commit and push, then report the hash and tracked worktree status. No merge or
deployment is authorized or performed. Evidence: .local-gene-review/offering-coverage.diff.

## Offering GENE production promotion - deployment blocked (2026-09-20)

Jim authorized promoting only 600dcd0 then 6418520. Verified remote production
cc_admin_render at f1700e0442e062e6089c75cd5a93cbc76033cfa2 and its existing
production workflow. Applied both commits cleanly in .local-offering-production:
272452e21c46723863a3d0bf1b4902e22fd3e354 then
e27a1ce753a217fef98345de9ba7061e9128be73. Exact seven-file diff contained only
approved HTML, JPEG, manifest, validator, tests, and work records. Payload and
coverage files matched the approved source; no unrelated content changed.

Pre-push checks: 29 guard/manifest tests passed; one Windows native-symlink skip;
seven mocked shell fixtures passed; YAML, all three Bash blocks, Python validator
syntax, manifest/source validation, and git diff --check passed. One normal push
to cc_admin_render succeeded. Run 35552896254 failed during read-only remote
preflight, before uploads. No retry, manual upload, or additional push occurred.

Cause: guard-trees.py preflight permits root HTML and named subdirectories but
rejects offering_gene.jpg as Invalid static target. Reproduced locally against
the production candidate. Earlier coverage checks missed this separate guard.
No guard repair was made. Production data was not changed by the failed run.

Live verification at 1440px and 390px: previous Ultimate GENE image still loads
with correct proportions; welcome, GENE Reveals, Theory, and Practice links pass
mouse/keyboard checks; no horizontal overflow, homepage console errors, or JS
exceptions. Root and index.html hashes match prior production; JPEG URL is 404;
CSS matches production. Offering GENE is NOT deployed. Status: NOT READY.

Next safe step: Jim reviews an exact offering_gene.jpg preflight allowance and
regression test before a separately authorized repair/redeployment. Evidence:
.local-gene-review/offering-production.diff, offering-deployment-failure.log,
offering-live-hashes.json, and offering-production-live-20260920/results.json.
These task and changelog updates remain local and uncommitted on agent-sandbox.

## Offering GENE exact remote-preflight correction (2026-09-20)

Prepared on agent-sandbox; preserved the uncommitted production-failure records
above and in CHANGELOG.md. The failing rule in guard-trees.py preflight accepted
root *.html or existing css/js/gallery/images/trees prefixes, but not the approved
root JPEG. Added only the exact relative == "offering_gene.jpg" exception. No
arbitrary JPEG allowance or additional directory access was introduced.

Changed guard-trees.py and its existing test_guard.py suite. Tests cover absent
and existing root offering_gene.jpg without mutation, reading only fixture Trees
data; rejection of other.jpg, filename/case variants, new directory paths,
traversal, and protected pottery-data paths before reading; existing directory
and hard-link rejection; and passing every validated manifest fixture source
through the actual remote preflight. Manifest rejection cases now include other
root JPEGs. Existing path, symlink, cleanup, and data protections remain intact.

Results: 34 guard/manifest tests, 33 passed and one native-symlink skip due to
Windows privilege limitations; mocked symlink rejection passed. All seven local
mocked workflow scenarios passed. YAML parsing, all three Bash run-block syntax
checks, all deployment Python syntax, guard Python 3.6 grammar, 26-file manifest
validation, and git diff --check passed. Python 3.6 runtime was not exercised.
Workflow, destinations, manifest, source validator, and public files are unchanged.
No real production data read or changed; no remote preflight, workflow retry,
commit, push, or deployment executed for this correction.

Status: READY. Jim approved committing the guard correction, tests, and preserved
work records and pushing only agent-sandbox. Next safe step: complete that commit
and push, then report its hash and tracked worktree status. The previously failed
live deployment remains NOT READY; promotion, retry, and deployment are not
authorized. Review evidence: .local-gene-review/offering-guard-exact.diff.

## Offering GENE production retry completed with root-cache limitation (2026-09-20)

Verified remote cc_admin_render exactly e27a1ce753a217fef98345de9ba7061e9128be73
before promotion and immediately before pushing. Applied only e0a2e95 to the
isolated production checkout, producing a20fa142156c16b3c79dfbaa74ca2c908326e545.
The earlier two commits were not reapplied. Diff contained exactly guard-trees.py,
test_guard.py, CURRENT_TASK.md, and CHANGELOG.md; guard/tests matched approval.

All relevant local checks passed: 33 guard/manifest tests and one Windows native
symlink skip, seven mocked deployment scenarios, YAML/Bash/Python syntax, Python
3.6 guard grammar, manifest/source validation, and git diff --check. One push to
cc_admin_render triggered run 35553911695, which completed successfully.
Production remote tip matches a20fa142156c16b3c79dfbaa74ca2c908326e545.

Remote HTML and JPEG hashes match the production Git blobs. Ordinary JPEG and
index.html return 200 and match; CSS is unchanged. Initial stale index.html cache
was cleared by the established targeted SiteGround purge. Bare / remains stale
with the previous homepage hash despite targeted root purge responses returning
OK. A ^/$ attempt was normalized by SiteGround to /^/$; the corrected /$ request
also left root stale. No broad cache purge or page behavior changes were made.
Cache-busted / returns the correct production HTML. Local checkout HTML uses CRLF;
Git-blob/remote/HTTPS LF hashes, rather than checkout bytes, are authoritative.

Live /index.html at 1440px and 390px passes: full new image composition, original
1240:1269 proportions, no overflow, mouse and keyboard links to welcome, GENE
Reveals, Theory, Practice, and brand/home; clean homepage console and no JS
exceptions. Bare / was also checked at both widths: old image remains, while its
links, proportions, overflow, and console checks pass. New root image check fails.

Status: READY WITH LIMITATIONS. Deployment succeeded; bare-root cache still needs
resolution. Next safe step: investigate the exact root-cache behavior with
SiteGround before expanding purge scope. No second push or workflow retry made.
Evidence: .local-gene-review/offering-retry-deployment.json,
offering-retry-live-hashes.json, offering-retry-cache-results.json,
offering-production-retry-index-20260920/, and
offering-production-retry-root-status-20260920/. Jim authorized preserving these
two work records in a documentation-only commit and push to agent-sandbox.
No promotion or additional production deployment is authorized; records were not
uploaded to the website.
