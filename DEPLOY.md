# Launch checklist

Work through this top to bottom. Each step says how to check it worked.

## 1. Accounts and keys
- [ ] **Rotate every key that was ever pasted into a chat** (Clerk secret, Supabase, OpenRouter, Gemini) and put the new ones only in `.env.local` and the host's environment settings.
- [ ] Clerk: create a **production** instance for your domain (development keys show a banner and have low limits).
- [ ] Supabase: Authentication → Sign In / Up → Third-party auth → add **Clerk** with your Clerk domain. In Clerk, enable the Supabase integration. Without this every upload fails with "We couldn't set up your account".
- [ ] Run migrations `0001` to `0006` in order in the Supabase SQL editor.
- [ ] AI key: `GEMINI_API_KEY`. The free tier works; Google may use free-tier content to improve its models, which the privacy page already tells users.

## 2. Domain
- [ ] Buy the domain and add it to the Vercel project, plus the wildcard `*.yourdomain` (portfolios live at `name.yourdomain`). Wildcards need the domain's nameservers pointed at Vercel.
- [ ] Set `NEXT_PUBLIC_ROOT_DOMAIN=yourdomain` (no protocol).
- [ ] Clerk → Domains: add the same domain. Check sign-in works on it.

## 3. Environment variables on the host
Required: the Clerk pair, the Supabase URL + publishable key, one AI key, `NEXT_PUBLIC_ROOT_DOMAIN`.
Must be **absent or false**: `NEXT_PUBLIC_DEMO_MODE` (demo mode has no sign-in and stores data in a local file).
Optional features, see `.env.example`: `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` + `EMAIL_FROM`, `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`, `ADMIN_USER_IDS`, `GITHUB_TOKEN`, `CONTACT_HASH_SALT`, `NEXT_PUBLIC_CONTACT_EMAIL`, `ERROR_WEBHOOK_URL`.

## 4. Test on the live URL, signed in as a new user
- [ ] Sign up → upload a real PDF → the dashboard fills in.
- [ ] Add a photo and a project image; approve a project; publish.
- [ ] Open `name.yourdomain`: the site loads, images show, the contact form sends, the message appears in Inbox (and by email if Resend is set).
- [ ] Paste the link into the LinkedIn Post Inspector: the preview image appears.
- [ ] Analytics shows the visit. Edit on page saves a change.
- [ ] Settings → connect a spare domain, then remove it.
- [ ] Settings → delete the test account; its site returns 404 and its files are gone from Supabase Storage.
- [ ] `/admin` opens for an id in `ADMIN_USER_IDS` and returns 404 for anyone else.

## 5. Before telling people
- [ ] Read `/privacy` and `/terms` and have someone qualified review them for your country. They describe how the product behaves, but they are not legal advice.
- [ ] Set `NEXT_PUBLIC_CONTACT_EMAIL` to an inbox you read.
- [ ] Push to GitHub: the CI workflow runs lint, type check, unit tests and a build on every push.
- [ ] Watch the host's logs for the first days; set `ERROR_WEBHOOK_URL` to get errors in Slack or Discord.

## Known limits
- Resume reading runs inside the upload request (up to 60 seconds). On hosts with a shorter limit, long PDFs can time out; raise the function limit or move parsing to a queue.
- Upload limits are 5 an hour and 20 a day per account; the contact form allows 5 messages an hour per sender.
- Free AI tiers are rate-limited. If uploads start failing at busy times, enable billing on the key.
