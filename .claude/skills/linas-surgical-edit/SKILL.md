---
name: linas-surgical-edit
description: Enforces the Lina's Surgical Edit Standard for any implementation, visual change, bug fix, or refactor. Use whenever files may be changed.
user-invocable: false
---

# Lina's Surgical Edit Standard

Apply this procedure before and during any write operation in the Lina's repository.

## Required sequence

1. Inspect the current repository state before editing.
2. Define the exact objective in one sentence.
3. Identify the root cause; do not treat symptoms as causes.
4. Produce the smallest exact file allowlist needed for the objective.
5. Name protected files, routes, systems, and behaviours that must remain unchanged.
6. Define measurable acceptance criteria before implementation.
7. Implement the smallest safe change only after the Change Contract is approved.
8. Stop before editing any file outside the approved allowlist and request scope expansion.
9. Avoid unrelated refactoring, formatting churn, dependency changes, framework changes, and opportunistic cleanup.
10. Verify the changed behaviour and the protected behaviour.
11. Review `git diff --name-only`, `git diff --stat`, and `git diff` before declaring completion.

## Hard rules

- Do not guess which file to change when inspection can establish it.
- Do not rewrite working architecture to make a local change easier.
- Do not silently broaden scope.
- Do not install packages unless the approved Change Contract explicitly requires and justifies them.
- Do not deploy, merge, rebase, reset, or alter production configuration unless the user explicitly authorises that separate operation.
- A visual task is not permission to touch backend, admin, Firebase, Vercel, authentication, enquiry/order persistence, or the Coming Soon/private-preview gate.

## Completion evidence

Every implementation report must state:

- objective achieved;
- files actually changed;
- files requested but not changed;
- tests/checks run and results;
- visual comparison evidence where applicable;
- protected systems checked;
- final diff scope;
- remaining risks or human decisions.
