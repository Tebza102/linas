# Lina's Claude Code Agent & Skill Stack

**Installed:** 29 August 2026  
**Branch:** `release/2026-09-01-launch-prep`  
**Purpose:** Make approved Lina's public-design implementation repeatable, specialised, measurable, and resistant to visual drift or launch regressions.

This stack supplements `CLAUDE.md`, `docs/LINA-DESIGN-DNA.md`, and the project's Surgical Edit workflow. It does not change the public site by itself.

## Project skills

Project-local skills live under `.claude/skills/` and are checked into the repository so every Claude Code session working in this project can use the same procedures.

### `linas-surgical-edit`
Enforces inspection-first work, root-cause analysis, exact file allowlists, protected systems, acceptance criteria, tests, and Git diff checks.

### `linas-design-fidelity`
Enforces approved-mock fidelity, Design DNA compliance, static-first implementation, measurable geometry, controlled typography/spacing/assets, and restrained motion.

### `linas-release-safety`
Protects the Coming Soon gate, Firebase/Firestore, Vercel, auth, enquiries, orders, admin, notifications, packages, deployment configuration, and unrelated public routes during visual work.

### `linas-accessibility-motion`
Enforces keyboard/focus/touch usability, responsive behaviour, reduced motion, performance discipline, and non-blocking interaction.

## Project subagents

Project-local subagents live under `.claude/agents/`.

All installed project subagents use `model: inherit` deliberately. This avoids pinning the project to a model ID that becomes stale and makes each specialist inherit the model selected for the main Claude Code session.

### `linas-repo-scout`
Read-only architecture scout. Invoked first to locate the exact controlling files, dependency boundaries, shared selectors/functions, and smallest safe file allowlist.

### `linas-design-guardian`
Read-only creative director/design-system guardian. Compares implementation against the exact approved mock and Design DNA, prioritising measurable visual deltas and rejecting creative drift.

### `linas-ux-accessibility-reviewer`
Read-only UX/accessibility/responsive/motion/performance reviewer. Runs before implementation planning and again where appropriate after implementation.

### `linas-implementation-advisor`
Read-only implementation planner. After the Change Contract is approved, translates the target into an exact selector/DOM/asset patch plan. The main Claude session remains the only writer, which keeps the Surgical Edit allowlist easy to audit.

### `linas-visual-qa`
Read-only visual QA specialist. After each implementation stage, compares browser output to the approved reference at required widths and returns PASS only when material fidelity defects are cleared.

### `linas-release-guardian`
Read-only final diff/regression reviewer. Confirms changed files are limited to the approved allowlist and protected launch-critical systems remain untouched.

## Mandatory orchestration for the approved homepage implementation

For the current homepage implementation, the main Claude Code session must use this sequence:

1. `linas-repo-scout`
2. `linas-design-guardian` + `linas-ux-accessibility-reviewer` (parallel where supported)
3. Parent session consolidates findings into the Change Contract and stops for human approval
4. `linas-implementation-advisor` after the Change Contract is approved
5. Parent/main Claude session performs the approved edits only
6. `linas-visual-qa` after static match, responsive match, and final motion/interaction stage as applicable
7. `linas-release-guardian` before any commit/deploy recommendation

No specialist agent other than the main session writes implementation files. This prevents parallel-agent edit collisions and keeps the Git diff attributable to one controlled writer.

## Session loading note

If `.claude/agents/` or `.claude/skills/` did not exist when an already-running Claude Code session started, restart Claude Code after pulling these files so the new project directories are definitely discovered. Subsequent edits inside existing directories are normally detected by Claude Code.

## Capability check before implementation

Before the homepage implementation begins, confirm locally that:

- the expected `.claude/agents/*.md` files exist;
- the expected `.claude/skills/*/SKILL.md` files exist;
- project `CLAUDE.md` is loaded;
- the approved homepage mock exists at the exact path required by the Design DNA workflow;
- the Agent and Skill capabilities have not been disabled by local/managed settings;
- the session is on the approved launch-prep branch.

If a required specialist cannot be invoked, stop and report the missing capability rather than silently proceeding without that review layer.

## Scope boundary

This stack is governance and review infrastructure. Installing it does not authorise homepage changes, dependency changes, deployment, or modification of protected business-platform systems.
