# Project Fable

Project Fable is a mobile-first social pet-collecting PWA. The checked-in app is a complete local vertical slice: adopt and care for a Fable, complete dailies, play two touch games, collect and craft items, shop a fixed-price market, customize a pet, and join public chat.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables the app intentionally runs in local preview mode and persists to `localStorage`. With Supabase environment variables it switches to real sessions and shared database state. Never put a Supabase secret or service-role key in a `VITE_` variable.

```bash
npm run test
npm run build
npm run test:component
```

The Cypress binary is optional during dependency installation in constrained environments; run `npx cypress install` before component tests if it is not already cached.

## Run the full Supabase stack locally

The `supabase` directory contains the initial schema, RLS policies, seed catalog, chat rules, append-only currency ledger, escrowed market model, and atomic RPCs. With the Supabase CLI installed:

Docker is required by the Supabase CLI:

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

Create `.env.local` using the API URL and publishable/anon key printed by `supabase status`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_LOCAL_ANON_KEY
```

The beta is invite-only. In local Studio (`http://127.0.0.1:54323`), run this once in the SQL editor to create a development invitation:

```sql
insert into public.invite_codes(code_hash,label)
values(encode(extensions.digest(lower('LOCAL-FABLE'),'sha256'),'hex'),'Local development');
```

Start the app, choose “Use an invite,” and enter `LOCAL-FABLE`. Local Auth captures confirmation emails through the Supabase development mail viewer.

## Backend architecture

Trusted mutations use database functions. The browser must not directly edit wallets, ledger entries, inventory, messages, game rewards, or marketplace settlement. All mutating requests should carry a fresh UUID idempotency key when the corresponding RPC accepts one.

The seed creates four species, twelve palettes, 120 item definitions, four chat channels, daily tasks, and three starter recipes. Auth creates a profile and 500-Dewdrop wallet after email signup.

The React provider automatically selects its backend:

- No Supabase variables: isolated demo data in `localStorage`.
- Supabase variables present: restored Auth session, server snapshot hydration, RPC-only mutations, and Realtime refreshes for chat, notifications, friendships, and market changes.

## Link a hosted Supabase project

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --include-seed
```

In Supabase Authentication → Hooks, confirm the **Before User Created** hook points to `public.hook_require_invite`. Configure the Site URL and allowed redirect URLs for localhost, Netlify previews, and the production domain.

Bootstrap the first invitation through the hosted SQL editor using the same hashed insert shown above. After your first account is confirmed, promote it once:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR_EMAIL');
```

That account can generate subsequent one-use invitations from its profile screen.

## Asset format

Authored assets live under `public` and are served by the frontend CDN. Database records use stable `asset_key` values rather than URLs. Pet artwork should use a shared square canvas and these reusable anchors:

- `background`: full canvas
- `head`: centered at 50% × 17%
- `neck`: centered at 50% × 65%
- `held`: centered at 83% × 76%

`public/bramblewick-town.png`, `public/app-icon.png`, and `public/og.png` are generated temporary concept art and must be replaced or formally approved before the invite beta. No user image uploads are accepted in V1.

## Operations and safety

- Public messages are readable for 30 days; DMs are readable for 90 days.
- Public and DM writes go through security-definer RPCs enforcing authentication, friendship/block rules, mute/ban status, link stripping, length limits, and rate limiting.
- Moderators use `reports` and append-only `moderation_actions`; analytics must never ingest message bodies.
- Review Supabase database, egress, realtime, and connection usage weekly. Pause new invitations at 70% of any free-tier quota.
- The free Supabase plan does not provide production-grade automatic backups. Before inviting testers, schedule an encrypted weekly `pg_dump`, keep two copies outside the repository, and perform a restore drill.
- Account deletion should first anonymize retained moderation evidence, then delete the auth user so cascading foreign keys remove ordinary player data.

## Deployment

`netlify.toml` builds the Vite app to `dist` and routes SPA requests to `index.html`. Deploy previews may use a separate Supabase project; production and preview credentials must not be mixed.

Set these variables in Netlify before deploying:

```bash
npx netlify env:set VITE_SUPABASE_URL "https://YOUR_PROJECT.supabase.co"
npx netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "YOUR_PUBLISHABLE_KEY"
npx netlify deploy
```

After validating the preview, deploy with `npx netlify deploy --prod` and add the resulting production URL to Supabase Auth redirect settings.

## V1 boundaries

Combat, guilds, auctions, direct gifting/trades, personal shops, breeding, housing, image uploads, real-money purchases, push notifications, and full fitted outfits are intentionally deferred.
