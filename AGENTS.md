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
Phase 3 — Database schema: COMPLETE.
Phase 4 — CSV upload + import: COMPLETE.
Phase 5 — Risk scoring: COMPLETE.
Phase 6 — Recommendation engine: COMPLETE.
Next phase: Phase 7 — Dashboard UI.

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
- Use small steps. One step at a time. do not proceed to the next step until the user say so.
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
Phase 3 — Database schema: COMPLETE
Phase 4 — CSV upload + import: COMPLETE
Phase 5 — Risk scoring: COMPLETE
Phase 6 — Recommendation engine: COMPLETE
Phase 7 — Dashboard UI: NEXT
Phase 8 — Export + demo data
Phase 9 — QA + deployment

## Current completed database implementation

Phase 3 created and verified the Supabase Postgres schema for the MVP.

Created tables:
- products
- locations
- inventory_snapshots
- demand_history
- risk_scores
- recommendations
- recommendation_audit_logs

Important schema decisions:
- Each user-owned table has user_id uuid not null references auth.users(id).
- Row Level Security is enabled on all 7 MVP tables.
- Each table has an owner policy using auth.uid() = user_id.
- Primary keys use generated UUIDs.
- Products and locations are manually or CSV-imported source data.
- Inventory snapshots and demand history are designed for future CSV imports.
- Risk scores, recommendations, and audit logs are designed to be generated by the app after imports.
- Recommendations support transfer, reorder_hold, markdown, and service_level_tradeoff types.
- Recommendation audit logs store the rule, inputs, calculation summary, and result summary for explainability.
- No organizations, teams, roles, or enterprise permissions were added for the MVP.

## Current completed CSV import implementation

Phase 4 created and verified the MVP CSV upload and import flow.

Implemented imports:
- products
- locations
- inventory_snapshots
- demand_history

Important CSV import decisions:
- CSV files do not need to use exact Supabase column names.
- The app detects common English column aliases and shows a mapping preview before import.
- Non-English or unrecognized headers are shown as needing manual mapping in the preview flow.
- Technical database fields such as id, user_id, created_at, and updated_at are not included in user CSV files.
- The dashboard enforces import order: products, locations, inventory snapshots, then demand history.
- Later import steps stay locked until earlier required data exists for the logged-in user.
- Products are upserted by user_id and sku.
- Locations are upserted by user_id and name.
- Inventory snapshots use CSV SKU and location name to find product_id and location_id before saving.
- Demand history uses CSV SKU and location name to find product_id and location_id before saving.
- Active buttons use a hand cursor when clickable.
- No new production dependencies were added for Phase 4.

## Current completed risk scoring implementation

Phase 5 created and verified the MVP risk scoring flow.

Implemented risk types:
- stockout
- overstock

Important risk scoring decisions:
- Risk scores are calculated from imported inventory snapshots and demand history.
- The app uses the latest inventory snapshot for each product/location pair.
- Stockout risk uses available inventory, incoming inventory, reserved inventory, safety stock, average demand, lead time, and reorder buffer.
- Overstock risk uses available inventory, incoming inventory, safety stock, average demand, and an MVP coverage target.
- Default lead time is 14 days when a product does not provide lead_time_days.
- Reorder buffer is 7 days.
- MVP overstock coverage target is 60 days.
- Risk severity levels are low, medium, high, and critical.
- Results are saved into risk_scores with explanation and inputs_summary values.
- The dashboard can calculate risk scores and show the latest saved scores.
- The dashboard displays product, SKU, location, risk type, score, severity, days of cover, and explanation.
- Risk scoring rules are documented in docs/risk-scoring-rules.md.
- No new production dependencies were added for Phase 5.

## Current completed recommendation implementation

Phase 6 created and verified the MVP recommendation engine.

Implemented recommendation types:
- transfer
- reorder_hold
- markdown
- service_level_tradeoff

Important recommendation decisions:
- Recommendations are generated from the latest saved risk scores and latest inventory snapshots.
- Recommendations are saved into recommendations.
- Each recommendation gets a matching row in recommendation_audit_logs.
- The dashboard can generate recommendations and show the latest saved recommendations.
- The dashboard displays product, SKU, action, source/destination locations, quantity, days, priority, and explanation.
- Recommendation quantities and days are whole numbers.
- Recommendation wording is intentionally MVP-level and should be fine-tuned after the core MVP is complete.
- No new production dependencies were added for Phase 6.

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
