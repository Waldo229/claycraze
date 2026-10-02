## 2026-10-02 - Complete homepage subtitle sentence

Jim approved updating and publishing the homepage subtitle:
Jim Alexander designs quiet, high-fired stoneware containers inspired by Asian
traditions for bonsai enthusiasts, floral designers, and interior decorators.
Replaced only the introductory paragraph in public/index.html. Exact reversible
source comparison passed; heading, images, links and layout remain unchanged.
Deployment/live verification pending; next step: check Actions and homepage.

Asterisk note 19f0ad3 deployed successfully in Actions run 37069206276;
live browser verified the exact asterisk and display-only sentence.

## 2026-10-02 - Asterisk on Trees display-only notice

Jim requested the asterisk note: * The current selection of trees is for display
only and is not for sale. Replaced only the notice text in public/trees/index.html;
used the HTML asterisk entity. Exact reversible source comparison passed.
The heading, subtitle, collaboration paragraph and artist cards remain unchanged.
Jim explicitly authorized publication. Deployment/live verification pending;
next step: check Actions and the live notice.

Previous notice 95af834 deployed successfully in Actions run 37067309204;
live browser verified The trees currently displayed are not for sale.

## 2026-10-02 - Shorten Trees display-only notice

Jim requested the exact sentence: The trees currently displayed are not for sale.
Replaced only the previous display-only sentence in public/trees/index.html.
Exact reversible source comparison passed. Heading, construction subtitle,
collaboration copy and artist cards/links remain unchanged. Jim explicitly authorized publication.
Deployment/live verification pending; next step: check Actions and live notice.

Heading commit 8df3cb7 deployed successfully in Actions run 37065448650;
live browser verified Trees in Conversation and UNDER CONSTRUCTION.

## 2026-10-02 - Trees in Conversation heading

Jim approved Trees in Conversation as the heading, with UNDER CONSTRUCTION
beneath it followed by the existing text. Updated the h1 and browser title in
public/trees/index.html; added the subtitle using the existing threshold-kicker
class. Exact source comparison confirms only title/subtitle edits. Collaboration
paragraph, display-only notice and artist cards/links remain unchanged.
Jim explicitly authorized publication. Deployment/live verification pending;
next step: check Actions and the live Trees page.

Prior collaboration c422e30 deployed successfully in Actions run 37061197978;
live verification confirmed the text with a fresh page URL.

## 2026-10-02 - Trees collaboration introduction

Jim approved the collaboration wording and requested it be written to the site.
Added the approved paragraph to public/trees/index.html above the existing
display-only notice. Under-construction heading, notice, artist cards and links
remain intact. Exact source comparison confirms only this paragraph was added.
No Merdi Bonsai reference was found in the current public HTML source.
No styles, assets, inventory or unrelated public content changed.
Deployment/live verification pending; next step: check Actions and Trees page.

Homepage heading commit 4e34cc4 deployed successfully in Actions run 37054568403;
live browser verification confirmed the approved heading.

## 2026-10-02 - Refine homepage heading

Jim approved replacing the homepage heading with "For trees, flowers, and
contemplative rooms." Removed "Quiet pots" from the h1 in public/index.html.
Verified the source contains the expected old h1 and the edit changes only
that heading. Approved subtitle and existing layout, images and links remain.
No CSS, assets, inventory, or unrelated public content changed.
Deployment/live verification pending; next step: check Actions and homepage.

Subtitle commit 0ddf045 deployed successfully in Actions run 37053495168.
Live browser verification confirmed the approved two-sentence subtitle.

## 2026-10-02 - Homepage pottery subtitle

Jim approved the refined homepage wording and requested it be written to the
site. Replaced only the subtitle paragraph in public/index.html with:
"Quiet, high-fired stoneware containers inspired by Asian traditions.
Individually crafted by Jim Alexander for bonsai enthusiasts, floral designers,
and interior decorators." The heading and GENE image/links remain unchanged.
Verified an exact paragraph-only replacement against current production source.
No data, pottery prices, assets, CSS or unrelated public content changed.
Deployment/live verification pending; next step: check Actions and homepage.

Local pickup notice 25c7f1e deployed successfully in Actions run 37050456978.
Live browser verification confirmed Hampton Roads, the Historic Triangle,
Williamsburg/Yorktown/Jamestown and no shipping, with existing notice intact.

## 2026-10-02 - Practice local viewing and pickup area

Jim requested amending the published Practice notice to specify Hampton Roads
and the Historic Triangle (Williamsburg, Yorktown and Jamestown), with no
shipping. Replaced only the first purchase-notice sentence with the reviewed
viewing/pickup wording. Email, payment, tax and no-commitment wording remain.
Verified the exact one-sentence source replacement. No inventory, data,
prices, payment processing, or unrelated public content changed.
Deployment/live verification pending; next step: check Actions and live notice.

Sales-tax amendment f9d5f3a deployed successfully in Actions run 37049618468.
Live browser verification confirmed the sales-tax sentence and existing notice.

## 2026-10-02 - Practice sales tax clarification

Jim requested amending the published purchase notice with "Prices do not
include applicable sales tax." Added that exact sentence before the viewing
disclaimer in public/practice.html. Existing notice, mailto link and layout
are preserved. Exact source review confirms the single sentence addition.
No inventory, prices, payment processing or tax calculation changed.
Deployment/live verification pending; next step is to check Actions and the
live Practice notice.

Previous Practice notice commit 3c9a2b0 deployed successfully in Actions run
37049197323. Live browser verification confirmed viewing by arrangement,
mailto:jim@claycraze.com, check/Square wording and the no-commitment disclaimer.

## 2026-10-02 - Practice viewing and payment notice

Jim authorized publishing the prepared Practice subtitle with its disclaimer.
Replaced only the introduction paragraph in public/practice.html with viewing
by arrangement, a mailto link for jim@claycraze.com, payment by check or credit
card (Square), and "Viewing is not a commitment to purchase." The heading,
Shih-te figure, directory and footer remain unchanged. Source checks confirmed
only the reviewed paragraph changed and the source blob still matches review.
Only HTML and work records changed; no pottery or Trees records changed.
Deployment/live verification pending. Next step: check Actions and the live
Practice introduction.

Trees notice follow-up: commit 839454d deployed successfully in Actions run
37046834750. Live browser verification confirmed "Under construction." and
"The current selection of trees is for display only and is not for sale."

## 2026-10-02 - Trees display-only notice

Jim approved committing and deploying the Trees introduction replacement.
public/trees/index.html now says "Under construction." followed by "The current
selection of trees is for display only and is not for sale." Existing artist
cards and links are preserved. Source checks confirmed both replacement texts
and both artist links; the source blob still matches the reviewed version.
Only this HTML and work records changed; no Trees or pottery data changed.
Deployment/live verification pending. Next step: check the production workflow
and live Trees introduction.

Slab correction follow-up: commit 7e16239 deployed successfully in Actions run
37042200223. Live browser checks confirmed both slab card links use the shared
piece.html route, both pots' top/bottom images load, and bottom thumbnail
selection updates the main image and full-size link.

## 2026-10-02 - Slab gallery shared renderer correction

Jim authorized committing and deploying this correction. Changed only
public/gallery/slabs.html and these work records. Replaced the standalone
slabs.js include with shape-gallery.js?v=1020, configured bonsai / SL, and
matched the practice-page body used by the other form galleries. Slab cards
now target /gallery/piece.html?id=... rather than /piece/...; the shared detail
page uses image_path_2 and image_path_3 for top and bottom thumbnails.

Verification: inspected all eight pottery gallery script configurations and
the shared card/detail source. Confirmed the replacement has the SL filter,
shared renderer and body, and no slabs.js include. The existing workflow
uploads public/gallery/ and public/js/. No pottery inventory changes.
Deployment and live verification are pending. Next step: verify the Actions
run and live slab links after advancing cc_admin_render.

## 2026-10-02 - Refresh cached Normal GENE image

Image-coverage deployment 5fa5619 succeeded (Actions run 37018239487).
The live PNG matched Git blob 0504f9e8a64b177ca7edf82c9020e4bea8eea701.
Jim's screenshot nevertheless showed the previous Normal image after SiteGround
cache clearing and browser refresh. Versioned the Normal image URL and the shared
script URL on Kiln Watch and its graph page so existing cached URLs are bypassed.
Temperature thresholds, freshness checks and other states are unchanged.

Adjusted the existing filename-existence test to ignore URL query parameters.
All 29 temperature tests passed, including both pages' transitions, failure,
recovery and expiry. Image filenames were checked against the repository tree;
local test image files were placeholders. Live deployment verification follows
this commit. Next step: verify the versioned page, script and PNG on SiteGround.

## 2026-10-02 - GENE Kiln Watch image deployment coverage

Jim requested pushing the replacement gene-kilnwatch-emoji.png to GitHub and
SiteGround. Image commit 03915a1 reached production branch cc_admin_render, but
the successful job omitted this file: only images/curated and images/system
are ordinarily uploaded. The live URL still returned the previous image.

Added exactly images/gene-kilnwatch-emoji.png to the supplemental manifest and
validator allowlist, increasing the approved count to 27. Updated the existing
coverage test to require that image. All 34 local guard/manifest tests passed,
including manifest-to-remote-preflight coverage. Existing workflow and guard
are unchanged. No public payload or protected inventory changed in this repair.

Next step: deploy this correction through the existing production workflow and
verify the live image matches the committed Git blob. Deployment verification
is pending at the time of this commit.

## Curatorial Studio production promotion (2026-09-21)

Jim separately authorized promoting the reviewed Curatorial Studio repair to
`cc_admin_render` after live verification established that the Render service
deploys from that branch rather than `agent-sandbox`. The isolated production
checkout began exactly at `a20fa142156c16b3c79dfbaa74ca2c908326e545`.

Applied only the five functional/test files from agent-sandbox repair `f023d86`:
`admin/curate.html`, `admin/js/curate.js`, `public/css/curate.css`, `server.js`,
and `tests/curate.test.js`. The production work records are updated here instead
of replacing them with agent-sandbox history. No pottery data, images, deployment
workflow, public gallery content, or unrelated site file is included.

Pre-push verification and the resulting production/Render deployment are recorded
below when complete. Until then, status is HOLD. No form submission or pottery
record write is authorized as part of verification.

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
