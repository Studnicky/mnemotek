const FENCE = '```'

export const PR_TEMPLATE = {
  DEFAULT_CONTENT: `## Summary

<!-- What's changing, in 1-3 sentences. Present tense, verb-first. -->

## Type of Change

<!--
Pick the ONE alert that matches this change, delete the other five. The
alert type IS the signal — a reviewer should be able to gauge what kind of
change this is from color/icon alone, before reading a word of prose.
-->

> [!CAUTION]
> **Breaking change**

> [!IMPORTANT]
> **Bug fix**

> [!TIP]
> **New feature**

> [!NOTE]
> **Refactor**

> [!NOTE]
> **Documentation**

> [!NOTE]
> **CI/tooling**

## Why

<!--
What: what's actually changing (fixed, added, removed, updated).
Where: which part of the system this touches.
Why: the problem this solves or requirement it satisfies, and why now.
Not a restated summary — say what a reader can't get from the diff alone.
-->

## Risks & Review Notes

<!--
Pick the alert level that matches actual risk, delete the others, then say
what could break, what a reviewer should specifically check, and the
rollback path — don't just name the severity and stop there.
- [!CAUTION] — high risk: hard to reverse, touches auth/data/money/prod config
- [!WARNING] — moderate risk: needs a careful read, but recoverable
- [!NOTE] — low risk: routine, well-tested, easy rollback
-->

> [!NOTE]
> None.

## Testing

<!--
Describe the actual coverage, not just that it exists:
- Unit / integration / e2e — which of these, and why that mix is right for this change
- What's mocked vs what's real (a live DB? a real external API? an in-memory fake?)
- How it runs locally (exact command) and how it runs in CI (which job/workflow)
- What targets it exercises — APIs, databases, specific requirements/acceptance criteria
- Manual test steps, if any part of this can't be covered by automation
-->

- Unit tests added/updated
- Integration/e2e tests added/updated
- Manual testing completed

## Change Diagram

<!--
Optional. A mermaid diagram of what's changing — architecture, data/call
flow, before-vs-after. Wrapped in <details> so it doesn't dominate the PR
body; a reviewer opts in rather than scrolling past it. Most useful (and
encouraged, not required) when an AI agent authored this change, so a human
can verify the actual code flow without re-deriving it from the diff. Delete
this whole section if a diagram wouldn't add anything past the diff itself.
-->

<details>
<summary>Diagram</summary>

${FENCE}mermaid
flowchart LR
    A[Before] --> B[After]
${FENCE}

</details>

## Checklist

<!--
This is a gate, not a formality — don't check anything from habit.
1. Adversarial self-review: re-read your own diff as a reviewer actively
   trying to find a reason to reject it. Look for the thing you'd be
   embarrassed to have someone else find first. If you find something, fix
   it before continuing — don't check the box and hope.
2. Actually run the checks below; don't assume an earlier run still holds
   after later edits. For "Tests pass," paste the real command and its real
   result (pass/fail counts, exit status) — a bare assertion isn't evidence.
3. If this repo has a pre-push hook or CI gate that independently re-runs
   tests/lint, treat that as a backstop, not a substitute for doing this
   properly before you ever push.
-->

- Conventions followed
- Self-reviewed (adversarially — see above)
- Docs updated (if needed)
- Tests pass — \`<command>\` → \`<result>\`

## Related Issues

<!-- Link tickets/issues this closes or relates to: "Fixes #123", issue tracking keys
as real hyperlinks when possible. Omit if none. -->

<!--
Optional, encouraged when an AI agent authored this PR:
quippy one liner, in the voice of a scrappy, unimpressed street-level hacker
who's seen enough chrome and wetware not to be dazzled by either, commenting on
as a passing note or review responding to the fix/change delivered in this PR.
-->
`,
  KNOWN_LOCATIONS: [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'docs/PULL_REQUEST_TEMPLATE.md',
    'docs/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'pull_request_template.md'
  ],
  RELATIVE_PATH: '.github/PULL_REQUEST_TEMPLATE.md'
} as const
