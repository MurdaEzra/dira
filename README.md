# DIRA

DIRA is an accessible city map and route planner for people with mobility and sensory access needs. This repository owns the application code, database schema, migrations, and deployment setup. Supabase remains the configured data backend; Lovable-specific runtime services have been removed.

## Run locally

1. Install Node.js 22.9 or newer and npm.
2. Copy `.env.example` to `.env` and fill in your own values.
3. Install dependencies with `npm install`.
4. Run `npm run dev` and open the local URL printed by Vite.

`npm run build` runs the production build and TypeScript check. `npm test` runs the test suite. `npm start` serves the built Node application.

## Services and configuration

- **Supabase:** create or select a project you own. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser. Set the matching server variables and `SUPABASE_SERVICE_ROLE_KEY` only in the server environment. The service-role key must never use a `VITE_` prefix.
- **Database:** `drizzle/schema.ts` and `drizzle/migrations/` are the source of truth. Set `SUPABASE_DB_URL` to the direct Postgres connection string when running migrations. Use `npm run db:generate`, review the migration, then run `npm run db:migrate`.
- **Google sign-in:** enable Google under Supabase Authentication providers and register your app’s `/sign-in` URL in Supabase’s allowed redirect URLs. Keep the Google client secret in Supabase, not in this repository.
- **Photo checks:** set `OPENAI_API_KEY` on the server. `OPENAI_VISION_MODEL` is optional and defaults to `gpt-4.1-mini`. If the key is missing or the service is unavailable, photos are not uploaded unless the privacy-blur check succeeds.
- **Accessible routing:** set `OPENROUTESERVICE_API_KEY` on the server to use OpenRouteService. Approximate routes remain available if it is not configured.

## Admin access

The admin dashboard uses the `user_roles` table and server-only Supabase service-role client. Grant the role to a trusted account from the Supabase SQL editor after that account has signed in:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('YOUR_EMAIL@example.com')
on conflict (user_id, role) do nothing;
```

Set the service-role key in your server host before using admin actions. Do not expose it to browser code.

## Hosting

TanStack Start builds with Nitro's Node server preset. Deploy the repository to a Node host you control, set its environment variables, run `npm run build`, then `npm start`.

The external Lovable project/GitHub association is managed by Lovable and cannot be removed from this local repository. Disconnect that integration in the Lovable project settings if you want the editor to stop syncing this repository.

### Do this from your end(ezra)
The app still points at its currently configured Supabase project. I can’t unlink the external Lovable/GitHub association or move that backend from this workspace; those are account-side actions. To take full ownership, disconnect the repository in Lovable’s project settings, then set credentials for a Supabase project and Node host you control using the setup in [README.md](/C:/Users/Sylvia Anyango/Desktop/DIRA/dira/README.md). The new self-hosted photo check also needs your own OPENAI_API_KEY set on the server.