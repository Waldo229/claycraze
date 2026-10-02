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

# ClaycrazE / GENE Change Log

Record only verified work. Keep entries short and factual.

## 2026-10-02 - Normal GENE image cache refresh

- Verified previous coverage deployment succeeded and live PNG matched GitHub.
- Versioned the Normal image and both pages' shared script URLs after Jim's
  screenshot showed the old cached image despite cache clearing.
- Adjusted filename lookup in existing test; all 29 temperature tests passed.
- Temperature and evidence behavior unchanged; deployment verification pending.

## 2026-10-02 - GENE Kiln Watch image deployment coverage

- Corrected the omitted production image by adding its exact path to the
  supplemental manifest and validator (27 approved files).
- Updated the existing coverage assertion; all 34 guard/manifest tests passed.
- Workflow, remote guard, public payloads and protected inventory unchanged.
- Production deployment and live-image verification pending this commit.

## 2026-09-21 - Curatorial Studio production promotion

- Jim authorized promoting only the reviewed form-readiness repair to
  `cc_admin_render`; isolated checkout began at production `a20fa142`.
- Applied the exact five functional/test files from `f023d86`; production work
  records were updated separately. No pottery data or unrelated payload included.
- Pre-push and live deployment results follow after verification. Status: HOLD.

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
## 2026-09-20 - Offering GENE homepage image

- Added public/offering_gene.jpg from images/offering_gene.png, preserving the
  original dimensions; changed only the image source and alt text in index.html.
- Preserved existing links, CSS, classes, navigation, and all other page content.
- Verified 1440px/390px Chrome previews, full composition, aspect ratio, no
  overflow or homepage console errors, and mouse/keyboard link destinations.
- git diff --check passed. Review evidence: .local-gene-review/offering-preview-20260920/.
- Jim approved the preview and authorized the four-file commit and push only to
  agent-sandbox. No merge or deployment authorized or performed.

## 2026-09-20 - Offering GENE deployment coverage

- Added the exact root offering_gene.jpg path to the supplemental manifest and
  strict validator allowlist (26 files); updated the existing coverage test.
- Workflow and public files unchanged; both landing HTML and JPEG now covered
  by the existing production job. Destinations and data protections preserved.
- YAML/Bash/Python syntax, manifest validation, and git diff --check passed;
  29 existing tests passed, one Windows native-symlink fixture skipped.
- Jim approved the five-file correction commit and push only to agent-sandbox.
  No merge or deployment authorized or performed.

## 2026-09-20 - Offering GENE production promotion blocked

- Promoted approved commits in order; pushed once to cc_admin_render at
  e27a1ce753a217fef98345de9ba7061e9128be73 after exact-scope and test checks.
- Deployment run 35552896254 failed in read-only preflight before uploads.
  Existing guard rejects the root JPEG; reproduced locally. No repair or retry.
- Live 1440px/390px checks passed for the existing page and links, with no overflow
  or homepage console errors. Previous HTML remains live; new JPEG returns 404.
- NOT READY. Required follow-up: narrowly scoped preflight allowance and regression
  test for offering_gene.jpg, then separately authorized deployment.

## 2026-09-20 - Exact Offering GENE remote preflight allowance

- Preserved the local production-failure records. Added only the literal root
  offering_gene.jpg exception to the existing remote preflight target rule.
- Added exact-file acceptance, rejection, file-safety, and manifest-to-preflight
  regression tests; retained data, path, symlink, and cleanup protections.
- 33 tests passed; one Windows native-symlink skip. Seven mocked workflow scenarios,
  YAML/Bash/Python syntax, Python 3.6 guard grammar, manifest validation, and
  git diff --check passed. Workflow, destinations, and public content unchanged.
- Jim approved the four-file commit, including preserved work records, and push
  only to agent-sandbox. No promotion, retry, or deployment authorized or performed.
