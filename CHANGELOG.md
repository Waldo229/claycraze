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

## 2026-09-20 - Places notice review

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

# ClaycrazE / GENE Change Log

Record only verified work. Keep entries short and factual.

## 2026-09-20 - GENE Reveals entry links (local, uncommitted)

- Linked the existing homepage image and a restrained caption to GENE Reveals;
  preserved useful alt text and added an explicit accessible link name.
- Relabeled the GENE Project button, preserving its existing destination.
- Added scoped caption/focus styles and bumped only Home's stylesheet cache version.
- Verified desktop 1440px and mobile 390px rendering, loaded images, real link clicks,
  visible keyboard focus, no horizontal overflow, and unchanged homepage geometry.
- Diff check passed; existing GENE Reveals page edits preserved. No commit, push,
  merge, or deployment performed.

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
