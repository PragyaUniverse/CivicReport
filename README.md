# CivicReport

A community platform for reporting local civic issues such as potholes, garbage, water leaks, power faults, broken streetlights and sewage problems. Citizens report and upvote issues, follow their progress, and administrators triage and resolve them.

## Features

- **Report issues** by category (pothole, garbage, water leak, electricity, streetlight, sewage, other), with voice recording support
- **Public feed** of reported issues with upvotes and issue detail pages
- **Status tracking**: reported, in progress, resolved, rejected, with a status update history
- **Notifications** when an issue you follow changes
- **Citizen dashboard and profile**
- **Admin tools**: issue management, analytics charts, and announcements shown as a site-wide banner
- **Feedback form** for users
- **Multilingual UI** (English and Hindi) with a language switcher
- **Authentication and role-based access** (citizen and admin roles)

## Tech stack

- React 18, TypeScript, Vite
- Tailwind CSS and shadcn/ui (Radix UI)
- React Router, TanStack Query, React Hook Form
- Recharts for analytics
- Supabase (Postgres, auth, row-level security)
- Vitest for tests

## Getting started

Prerequisites: Node.js 18+ and a Supabase project.

```bash
git clone https://github.com/PragyaUniverse/CivicReport.git
cd CivicReport
npm install
```

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase anon/publishable key>
VITE_SUPABASE_PROJECT_ID=<your Supabase project ID>
```

Apply the database schema from `supabase/migrations/` to your Supabase project (for example with the Supabase CLI: `supabase db push`), then start the dev server:

```bash
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once with Vitest |

## Routes

| Path | Page |
| --- | --- |
| `/` | Issue feed |
| `/report` | Report a new issue |
| `/issue/:id` | Issue details |
| `/auth` | Sign in / sign up |
| `/profile` | User profile |
| `/dashboard` | User dashboard |
| `/admin` | Admin issue management |
| `/admin/analytics` | Admin analytics |
| `/admin/announcements` | Admin announcements |

## Project structure

```
src/
  components/     Shared UI (issue cards, layout, voice recorder, notifications) and shadcn/ui primitives
  contexts/       Auth context
  hooks/          Reusable hooks
  integrations/   Supabase client and generated types
  lib/            Categories, i18n strings, utilities
  pages/          Route-level pages
supabase/
  migrations/     Database schema (profiles, user_roles, issues, upvotes, status_updates, announcements, notifications, feedback)
```
