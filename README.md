# JBB TableTracker

A mobile-first Progressive Web App (PWA) built for billiard and snooker table manufacturing factories. Replaces informal, unstructured WhatsApp group communication with centralized digital production records, atomic table claiming, task accountability, mandatory photo proof of work, strict dispatch gatekeeping, and public QR certificate generation.

---

## Key Highlights

- **Role-Based Experience**: Tailored dashboards for **Administrator**, **Salesperson**, and **Factory Supervisor**.
- **Visibility Principle**: Assignments govern *accountability*, not visibility. All authorized factory supervisors can see all tables and tasks in their factory.
- **Atomic Table Claiming**: Guaranteed single-claim race condition prevention (first supervisor wins; duplicate attempts rejected at the database level).
- **Mandatory Proof of Work**: A task cannot be marked completed without photographic evidence.
- **Strict Dispatch Gatekeeping**: Backend production gate rejects dispatch if any build task is incomplete, in progress, blocked, or missing photographic evidence.
- **Mandatory Final Checkpoint**: Every table automatically receives a non-removable `Dispatch & Packing` task requiring driver details, Nags count, and packed loading truck photo.
- **Public QR Production History**: Completed tables receive a unique cryptographically random token opening a sanitized, mobile-optimized production history certificate.
- **Apple-Inspired Design Language**: System-font stack, semantic row-level tinting (Neutral for Not Started, Blue for In Progress, Red for Blocked, Green for Completed), accessible contrast, zero emojis, zero notification dots, zero decorative clutter.
- **Theme Support**: Device (default, system-following), Light, and Dark mode with persistent user preference.
- **PWA Ready**: Web app manifest, standalone display mode, service worker caching, and offline status banner.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS with custom semantic design tokens |
| **Icons** | Lucide React (restrained, clean system icons) |
| **Database** | PostgreSQL (Supabase) + Local Transactional Store |
| **Security** | Row Level Security (RLS) policies, atomic functions |
| **Validation** | Zod schemas |
| **QR Generation** | QRCode canvas/data-URL generator |
| **PWA** | Web App Manifest & Service Worker |
| **Deployment** | Vercel |

---

## Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd "JBB TableTracker"
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Default configuration runs out of the box with zero setup in resilient development mode.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (or on a mobile device on your local network).

---

## Automated Test Suite

A comprehensive test runner verifies all 10 acceptance scenarios (Scenarios A through J from the PRD):

```bash
npx tsx tests/business-rules.test.ts
```

### Verified Test Scenarios

- [x] **Scenario A (Table Creation)**: Salesperson creates table, uploads reference photo, creates checklist rows. System auto-appends mandatory `Dispatch & Packing` task.
- [x] **Scenario B (Atomic Claiming)**: Concurrent claim race condition prevention; first supervisor becomes lead supervisor, second claim rejected atomically.
- [x] **Scenario C (Task Assignment)**: Lead supervisor and admin assign tasks; unauthorized takeover by other supervisors rejected; supervisors can claim unassigned tasks for themselves.
- [x] **Scenario D (Proof of Work)**: Task start records timestamp; completion **strictly requires** photo upload.
- [x] **Scenario E (Reporting Problems)**: Problem report requires mandatory reason; task status becomes Blocked; table status prioritizes Needs Attention; alert sent to admin and lead supervisor. Resolving problem resumes task to previous workable state.
- [x] **Scenario F (Salesperson Task Editing)**: Salesperson edits uncompleted task instructions; audit trail captures before/after; assigned or factory supervisors notified. Editing completed task directly is prohibited.
- [x] **Scenario G (Dispatch Restriction)**: Backend gate rejects dispatch attempts when any build task is incomplete, in progress, blocked, or missing completion evidence.
- [x] **Scenario H (Final Dispatch)**: Driver name, driver phone, Nags count, and loaded truck photo verified; table marked Completed / Dispatched; unique QR token generated.
- [x] **Scenario I (Public QR Security)**: Public route `/qr/[token]` displays sanitized production history, completion timestamps, supervisor names, and photos. **Driver phone number and private internal remarks are never exposed.**
- [x] **Scenario J (Task Reopening)**: Admin reopens task with mandatory reason; table drops out of Completed status; existing QR access token is revoked until re-dispatched.

---

## Supabase Production Setup

To connect to a live Supabase project:

1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings -> API** and copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key -> `SUPABASE_SERVICE_ROLE_KEY`
3. In the **SQL Editor**, execute the migration scripts in order:
   - `supabase/migrations/001_initial_schema.sql` (Tables, constraints, atomic claim & dispatch functions)
   - `supabase/migrations/002_rls_policies.sql` (Row Level Security policies & sanitized public QR access function)
   - `supabase/migrations/003_storage_and_seed.sql` (Storage buckets for photos and initial factory/user seed)
4. Update `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

---

## Deploy to Vercel

1. Push repository to GitHub or GitLab.
2. In the Vercel dashboard, click **Add New -> Project** and import the repository.
3. Configure the Environment Variables matching `.env.example`.
4. Deploy! Next.js App Router will build and optimize production pages automatically.

---

## Design Compliance Checklist

- [x] No emojis anywhere in the interface
- [x] No notification dots (clean count badges and dedicated notifications panel)
- [x] No eyebrow labels or redundant subheadings
- [x] No oversized cards or decorative hero sections
- [x] Restrained semantic row tinting (Neutral, Blue, Red, Green)
- [x] Minimum 44px mobile touch targets
- [x] Apple system font stack and spacing hierarchy
- [x] Camera capture integration (`capture="environment"`)
