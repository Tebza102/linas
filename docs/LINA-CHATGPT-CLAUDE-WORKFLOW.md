# ChatGPT ↔ Claude Project Workflow

## ChatGPT project role
Use the ChatGPT Lina project to hold strategy, client context, decisions, reviews, meeting preparation and updates to this control pack. Upload the same Master Brief and operational files to the ChatGPT project.

ChatGPT should:
- Control product strategy and scope.
- Convert client feedback into approved decisions.
- Review Claude reports and test evidence.
- Produce client-facing copy, presentation logic and marketing strategy.
- Keep the project plan, decision log and inputs register current.

## Claude Code role
Copy this complete pack into the repository. Claude Code should:
- Read `CLAUDE.md` and the documents before working.
- Audit the actual repository.
- Implement only approved scope.
- Test and verify the build.
- Update logs/registers after each session.

## Recommended repository placement
```text
project-root/
  CLAUDE.md
  docs/
    LINA-MASTER-PRODUCT-DELIVERY-BRIEF.md
    LINA-PROJECT-PLAN.md
    LINA-DECISION-LOG.md
    LINA-CLIENT-INPUTS-REGISTER.md
    LINA-TEST-AND-RELEASE-CHECKLIST.md
    LINA-ASSET-REGISTER.md
    LINA-CHATGPT-CLAUDE-WORKFLOW.md
  assets/
    source/
      brand/
      menu/
      social/
      documents/
    brand/
      working/
      approved/
    menu/
      working/
      approved/
    social/
      working/
      approved/
    mockups/
      working/
      approved/
```

## Session handoff format
At the end of each Claude session, return:
1. Work completed.
2. Current working state.
3. Tests/build run and results.
4. Files changed.
5. Risks or defects.
6. Client inputs needed.
7. Decisions required.
8. Next exact action.
9. Reusable components/modules created.

Paste that report into the ChatGPT project so the strategy and project records can be updated.
