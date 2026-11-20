# Unfold

> Going live? Follow **[DEPLOY.md](DEPLOY.md)**.

Turn the resume you already have into a portfolio site with its own link.

- **Next.js 16** (App Router). Note: in Next 16 `middleware.ts` is called `proxy.ts`.
- **Clerk** for sign-in.
- **Supabase** for the database and resume file storage, protected by row-level security.
- **AI** reads the resume and drafts a short case study for each role. It runs through one of:
  - Google Gemini (free tier)
  - OpenRouter
  - the Claude API

## Quick start: demo mode (no accounts needed)

To work on the UI without Clerk or Supabase:

```bash
npm install
echo NEXT_PUBLIC_DEMO_MODE=true > .env.local
npm run dev
```

In demo mode:
- There's no sign-in. `/dashboard` opens directly.
- Data is saved to `.unfold-demo.json`, and uploaded images and résumé files to `.unfold-demo-media/`, both in the project folder and ignored by git.
- The empty dashboard has **Or try a sample resume**, and there's a **Start over** button at the bottom.
- Uploads use the AI when a key is set (`GEMINI_API_KEY` etc.). Without one, they load the sample resume.
- Published portfolios open at `http://localhost:3000/s/<your-address>`.

Turn demo mode off, and finish the setup below, before deploying.

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the publishable and secret keys into `.env.local`.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and publishable key into `.env.local`.
3. **Connect Clerk to Supabase.** In Clerk, open the Supabase integration and turn it on. Then, in Supabase, go to Authentication → Sign In / Providers → Third-Party Auth, add Clerk and paste your Clerk domain. This makes Supabase accept Clerk session tokens, so `auth.jwt()->>'sub'` in the database is the Clerk user id.
4. **Create the schema.** Run the files in `supabase/migrations/` in order: `0001_init.sql`, `0002_templates.sql`, `0003_resume_details.sql`, then `0004_media_contact_analytics.sql`, either in the SQL editor or with `supabase db push`. They create:
   - the tables (portfolios, projects, resumes, page views, clicks, contact messages)
   - the access rules
   - a private `resumes` storage bucket and a public `media` bucket (photos, project images, résumé downloads)

### 4. AI key (pick one)

- **Google Gemini (free tier):** create a key in [Google AI Studio](https://aistudio.google.com) and set `GEMINI_API_KEY`.
  - The default model `gemini-flash-latest` reads PDFs directly.
  - The free tier is rate-limited.
  - Google may use free-tier content to improve its products, so switch to a paid tier before real users upload resumes.

- **OpenRouter (free to start):** create a key at [openrouter.ai](https://openrouter.ai) and set `OPENROUTER_API_KEY`.
  - The default model `openrouter/free` routes each request to a free model.
  - Free models have rate limits and vary in quality.
  - Some free providers may log prompts, so check their data policy before real users upload resumes.
- **Claude:** set `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com).
  - Paid per use, but it reads PDFs directly and gives the most reliable results.

### 5. GitHub import (optional)

Importing repositories works without a key, but GitHub allows only 60 requests an hour per server IP without one. On a shared host that runs out fast, so create a fine-grained token with no extra permissions at [github.com/settings/tokens](https://github.com/settings/tokens) and set `GITHUB_TOKEN`.

### 6. Run

```bash
npm run dev
```

| Page | Address |
| --- | --- |
| Landing page | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| A published portfolio | http://maya.localhost:3000 (the slug is shown in the dashboard) |
| The same portfolio, without subdomains | http://localhost:3000/s/maya |

## How it fits together

```
proxy.ts                 Clerk auth + routes <slug>.unfold.site and custom domains to /s/[site]
app/(marketing)/         Landing page (Landing.tsx markup, landing-init.ts behaviour, landing.css)
app/sign-in, sign-up     Clerk sign-in and sign-up pages
app/dashboard/           Upload, edit details and projects, appearance, GitHub import, publish (server actions in actions.ts)
app/dashboard/analytics  Views per day, traffic sources and clicks
app/dashboard/inbox      Messages from the contact form
app/editor/              Edit on the page: the live template with click-to-edit fields, template and appearance controls
app/api/resumes          POST a resume → stored in Supabase Storage → read by AI → portfolio + projects
app/api/media            Upload or remove the photo and project images (resized in the browser first)
app/api/contact          Contact form messages (rate-limited, with a spam trap)
app/api/views            Records page views (with the traffic source) and clicks on published portfolios
app/s/[site]/            The public portfolio site and its generated link-preview image (opengraph-image.tsx)
app/_templates/          The 6 free templates: Minimal, Dark, Interactive, Creative, Modern, Developer
app/templates/           Gallery of all templates (/templates) and a live preview of each (/templates/minimal …)
lib/data/                One data layer: supabase-store.ts (real) and demo-store.ts (local file), picked by DEMO mode
lib/github.ts            Reads a user's public GitHub contribution calendar for the Developer template
lib/github-repos.ts      Lists public repositories and turns chosen ones into project drafts (README excerpt, stars, language)
lib/theme.ts             Appearance options: accent colour (kept readable), font pairs, light/dark
lib/parse-resume.ts      Gemini, OpenRouter or Claude call, validated with a zod schema; never invents facts
lib/supabase/            Server clients (user client sends the Clerk token) and database types
supabase/migrations/     Schema, row-level security, storage bucket and policies
```

### Rules worth knowing

- **Users only touch their own rows.** Every table has row-level security keyed on the Clerk user id.
- **Visitors never read tables directly.** Public pages call `get_public_portfolio()`, which:
  - returns only published portfolios
  - includes only approved projects
  - includes the email only when the owner turned it on
- **Paid fields can't be changed from the browser.** `plan`, `custom_domain` and `show_badge` are only changed by your server using the Supabase service role, for example from a Stripe webhook.
- **Re-uploading a resume keeps the user's edits.** It only fills empty fields and adds projects with new titles.
- **Imports are drafts.** Projects from a resume or from GitHub only appear on the site after the owner approves them.
- **Visitors can send messages but never read them.** The contact form goes through `send_portfolio_message()`, which checks the portfolio is published with the form on, validates the message and rate-limits by a salted hash of the sender's IP.
- **Résumé downloads are opt-in.** Turning them on copies the latest upload into the public `media` bucket; turning them off deletes the copy.

## Deploying

The production setup is designed for Vercel:

1. Add the root domain (e.g. `unfold.site`) and a wildcard (`*.unfold.site`) to the project.
2. Set `NEXT_PUBLIC_ROOT_DOMAIN=unfold.site`.
3. Switch Clerk and Supabase to production keys.

## Not built yet

- Stripe checkout and the webhook that sets `profiles.plan`.
- Adding customer domains through the Vercel Domains API (Pro).
- Deleting an account and its files from the dashboard. The database cascade is ready.
- Email notifications for new contact messages (they wait in the dashboard inbox for now).

## Premium templates

Three templates use real depth (CSS 3D, no extra library): **Atelier** (classic), **Prism** (modern) and **Mono** (minimal).
They are marked `tier: "pro"` in `lib/templates.ts`. While there are no paid plans, `PREMIUM_OPEN = true` lets everyone use them;
set it to `false` once billing exists and gate on the user's plan. Run `supabase/migrations/0006_premium_templates.sql` before deploying.
