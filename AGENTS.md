<!-- BEGIN:nextjs-agent-rules -->
# AGENTS.md

## Project identity

This repository is an MVP SaaS web application called Inventory Optimizer.

The product detects inventory imbalance across locations and generates explainable daily recommendations for supply-chain users.

Primary users:
- Inventory planners
- Warehouse/store managers
- Merchandising and finance teams

The product must function as a daily decision tool, not just a dashboard.

## Current project state

Phase 1 — Project bootstrap: COMPLETE.
Phase 2 — Authentication: COMPLETE.
Next phase: Phase 3 — Database schema.

Project folder:
- inventory-optimizer-node

Current stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase for database, authentication, and storage
- shadcn/ui
- Papa Parse
- Vercel

Installed shadcn/ui components:
- button
- card
- input
- label
- table
- badge
- alert
- separator
- dropdown-menu
- dialog
- text area

Installed Supabase/auth packages:
- @supabase/supabase-js
- @supabase/ssr

Environment:
- .env.local exists
- NEXT_PUBLIC_SUPABASE_URL is configured as the base Supabase project URL only, without /rest/v1
- NEXT_PUBLIC_SUPABASE_ANON_KEY is configured

Do not print secrets or ask the user to paste secrets into chat.

## Current completed auth implementation

The following auth flow is working locally:
- Signup page exists.
- Login page exists.
- Email confirmation works.
- Auth callback works.
- Dashboard route is protected.
- Logout works.
- Route protection after logout works.
- User can log in again after logout.

Relevant files:
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts
- src/app/login/page.tsx
- src/app/signup/page.tsx
- src/app/auth/callback/route.ts
- src/app/dashboard/page.tsx

Important cleanup note:
- src/app/auth/confirm/route.ts may exist from an earlier attempt.
- It is no longer needed because the working route is src/app/auth/callback/route.ts.
- It can be deleted after confirming it is unused.

## Required working style

The user is not a developer.

When giving instructions to the user:
- Be extremely explicit.
- Use small steps.
- Explain every decision in plain English before giving code.
- Always choose one recommended approach.
- Optimize for the fastest path to a working MVP.
- Do not skip setup details.
- Do not assume the user understands technical terms.
- Do not proceed through multiple major phases without stopping for confirmation.
- Do not mention possible errors unless the user sends an error or screenshot.
- The user runs Terminal from the project folder, so do not include long cd commands unless needed.
- When referencing files, use project-relative paths only.

For every code step shown to the user, include:
1. Exact project-relative file path
2. Whether to create or edit the file
3. Whether to replace the entire file or append
4. Full paste-ready code
5. Exact terminal command to run, if needed
6. What the user should expect to see

## Coding rules

Use the existing stack. Do not change the framework.

Architecture rules:
- Keep a single Next.js codebase.
- Use Next.js route handlers instead of external APIs.
- Keep business logic modular inside src/lib.
- Use simple rule-based logic for the MVP.
- Every recommendation must be explainable.
- Prefer server components and server actions where they simplify the implementation.
- Use Supabase for database, authentication, and storage.
- Use shadcn/ui components that are already installed.
- Do not add new production dependencies unless clearly necessary.
- If adding a dependency is necessary, explain why before doing it.

Quality rules:
- Run npm run build after meaningful code changes.
- Keep TypeScript strict and clean.
- Avoid placeholder pseudocode in committed app code.
- Avoid large visual redesigns until core functionality is complete.
- Preserve the current dark visual direction unless explicitly asked to change it.
- The font is acceptable for now; do not spend time on letter spacing or polish until main functionality is complete.

## Current product roadmap

Phase 1 — Project bootstrap: COMPLETE
Phase 2 — Authentication: COMPLETE
Phase 3 — Database schema: NEXT
Phase 4 — CSV upload + import
Phase 5 — Risk scoring
Phase 6 — Recommendation engine
Phase 7 — Dashboard UI
Phase 8 — Export + demo data
Phase 9 — QA + deployment

## Phase 3 target

Create the Supabase database schema for the MVP.

Required entities:
- products
- locations
- inventory_snapshots
- demand_history
- risk_scores
- recommendations
- recommendation_audit_logs

The schema must support:
- Multi-user data isolation using Supabase auth user IDs.
- CSV-imported data.
- Risk detection for stockout and overstock.
- Transfer recommendations between locations.
- Reorder hold recommendations.
- Markdown timing suggestions.
- Service-level tradeoff insights.
- Explainable audit trail for every recommendation.

Use simple MVP-friendly tables. Do not over-engineer with complex enterprise modeling yet.

Recommended data ownership approach:
- Add user_id uuid not null references auth.users(id) to user-owned tables.
- Enable Row Level Security.
- Add policies so users can only select/insert/update/delete their own records.

Expected Phase 3 output:
- SQL migration/schema script to run in Supabase SQL Editor.
- Explanation of each table in plain English.
- Exact verification steps in Supabase.
- Then update the app only as needed after the schema exists.

## MVP domain model guidance

products:
- Represents SKUs/items.
- Should include SKU, name, category, unit cost, price, optional lead time, optional case pack.

locations:
- Represents warehouses, stores, or fulfillment nodes.
- Should include name, type, region or city, active status.

inventory_snapshots:
- Represents current or uploaded inventory position by product/location/date.
- Should include on-hand quantity, on-order quantity, reserved quantity, optional safety stock.

demand_history:
- Represents historical or forecasted demand by product/location/date.
- Should include quantity sold or forecast demand quantity.

risk_scores:
- Represents calculated stockout/overstock risk results.
- Should include product, location, risk type, risk score, severity, days of cover, explanation.

recommendations:
- Represents an action the user should consider.
- Types should include transfer, reorder_hold, markdown, service_level_tradeoff.
- Should include status, priority, expected impact, source/destination location where relevant.

recommendation_audit_logs:
- Represents the reasoning trail behind each recommendation.
- Must explain the inputs, rule triggered, calculation summary, and result.

## Useful commands

Run local dev server:
```bash
npm run dev

## Global working agreements

- Be explicit and practical.
- Prefer small, reviewable changes.
- Explain risky changes before making them.
- Run the relevant build or test command after code edits.
- Do not print secrets.
- Do not add production dependencies without a clear reason.


<!-- END:nextjs-agent-rules -->
