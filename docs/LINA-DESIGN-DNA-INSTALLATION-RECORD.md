# Lina's Design DNA — Installation Record

This file records installation and governance changes to the Lina's public design system.

## DNA-001 — 29 August 2026 — Design DNA v1.0 installed

**Requested by:** Tebogo  
**Branch:** `release/2026-09-01-launch-prep`  
**Purpose:** Reduce visual drift between approved mockups and browser implementation, shorten design iteration cycles, and prevent coding agents from introducing unapproved or overly decorative interpretations.

### Installed files

1. `docs/LINA-DESIGN-DNA.md`
   - Establishes the public design north star.
   - Defines homepage composition, colour discipline, typography, grid/spacing, motion, photography, responsive behaviour, accessibility, implementation stages and protected systems.
   - Defines the approved homepage mock as a visual target rather than inspiration.

2. `assets/brand/approved/lina-design-tokens-v1.css`
   - Provides a machine-readable token source for new public visual work.
   - Includes colour, spacing, typography stacks, layout dimensions, radii, motion and accessibility tokens.
   - Deliberately **not imported globally during installation** to avoid changing launch-critical pages before a separately approved implementation pass.

3. `assets/mockups/approved/README.md`
   - Defines the approved-reference workflow.
   - Reserves `assets/mockups/approved/lina-homepage-approved-2026-08-29.png` for the exact final approved homepage mock.
   - Prohibits substituting older repository screenshots.

4. `CLAUDE.md`
   - Updated so coding agents must read the Design DNA before meaningful public visual work.
   - Adds static-first, reference-comparison and no-creative-drift rules.

### Canonical public colour decision

For new public UI work, the current Lina's red is standardised as:

```text
#B2373E
```

This formalises the current homepage visual direction and ends the working ambiguity between the older source-sampled `#A43129` foundation and the later homepage `#B2373E` direction. Original source logo files are preserved unchanged.

### Implementation boundary

This installation is **governance-only**. It does not redesign or restyle the existing public site. No current CSS/HTML/JS page is automatically changed by the installation.

The next homepage implementation must be a separate Surgical Edit task using this sequence:

```text
Inspect → Change Contract → Static visual match → Responsive match → Interaction → Motion → Visual QA → Git diff review
```

### Protected systems during installation

No change was authorised or required to:

- Coming Soon/private-preview gate
- Authentication
- Firebase configuration
- Firestore rules/indexes/schema
- Enquiry/order persistence
- Admin portal
- API routes
- Email/notification delivery
- Production environment variables
- Vercel/deployment configuration
- Package or lock files
- Existing public page implementation

### Known remaining action

The exact 29 August approved homepage mock is a binary image created outside the GitHub text-file connector. It must be copied into the repository at:

```text
assets/mockups/approved/lina-homepage-approved-2026-08-29.png
```

before the static browser-matching phase starts. This is an asset-transfer task only; it is not permission to redesign the mock.

### Verification record

Installation verification must confirm:

- Design DNA file exists on the launch-prep branch.
- Approved token file exists on the launch-prep branch.
- Approved mockup workflow README exists.
- `CLAUDE.md` points coding agents to the Design DNA.
- No production/public implementation file changed as part of the installation.

### Governance rule going forward

Any material change to Lina's public design language must update this record and, when it changes an approved design direction, also be recorded in `docs/LINA-DECISION-LOG.md`.
