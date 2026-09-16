# Current Task: Repair GENE State Progression

## Reported fault

GENE remains in one visible state instead of changing as kiln temperature rises.

## Expected behavior

GENE should select and display the appropriate approved state image as fresh, valid temperature evidence crosses the existing configured thresholds:

`Normal / Cool GENE → Chili GENE → Safety Engineer GENE → Atomic GENE → higher-temperature state(s)`

## Investigation

Trace the complete path before changing code:

1. Identify the live state-data source and confirm that temperature/state values change.
2. Locate the canonical thresholds and state-selection function.
3. Verify that state names produced by the data match the names expected by the page.
4. Verify every image filename, path, capitalization, and deployed asset.
5. Check browser caching or polling logic that may leave an old image displayed.
6. Confirm stale or invalid evidence cannot hold GENE in an incorrect state.

## Constraints

- Do not modify the introductory prototype pages.
- Do not modify Ikebana or unrelated GENE features.
- Do not invent new thresholds.
- Do not commit, deploy, or publish without Jim's explicit approval.

## Acceptance test

Using controlled sample data, demonstrate that each configured threshold selects the correct state image and that the display returns to the correct cooler state when appropriate. Report the exact cause of the fault and every file changed.

## Status

Not started. Source repository has not yet been opened in this workspace.

## Findings

None yet.

## Files changed

None yet.

## Next step

Open the ClaycrazE repository in Codex, read `AGENTS.md`, and perform the investigation above.
