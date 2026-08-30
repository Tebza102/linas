---
name: linas-release-safety
description: Protects Lina's launch-critical platform systems during public UI work. Use for any task near release, deployment, routing, authentication, Firebase, Vercel, forms, enquiries, orders, or shared public CSS/JS.
user-invocable: false
---

# Lina's Release Safety

Lina's is a Digital Business Platform. Public presentation work must not damage operational systems.

## Protected by default

Unless the approved Change Contract explicitly includes them, do not edit:

- Coming Soon/private-preview gate and middleware;
- Firebase configuration;
- Firestore rules, indexes, schema, or production data;
- authentication, roles, or permissions;
- enquiry/order APIs, persistence, validation, idempotency, reference generation, pricing authority, or audit trails;
- admin portal functionality;
- notification/email delivery;
- Vercel/deployment configuration, environment variables, domains, or DNS;
- package or lock files;
- unrelated public pages.

## Shared-file risk

Before editing a shared CSS/JS file:

1. prove why homepage-scoped code cannot achieve the objective safely;
2. identify every route that consumes the shared selector/function;
3. define regression checks for those routes;
4. prefer scoped selectors or additive mappings over global restyling.

## Release checks for public visual work

At minimum verify:

- intended route renders;
- required CTAs retain destinations;
- navigation/drawer works with keyboard and pointer;
- no horizontal overflow at approved widths;
- no new console errors or failed local asset requests;
- reduced-motion state works;
- protected routes smoke-test without visual/functional regression;
- Coming Soon/private-preview behaviour is unchanged;
- Git diff contains no protected configuration/backend files.

Do not create real production enquiries or orders solely to test a visual change. Use inspection, interception, preview/test infrastructure, or existing test procedures appropriate to the repository.
