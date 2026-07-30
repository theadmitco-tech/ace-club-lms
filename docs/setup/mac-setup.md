# Ace Club LMS — Mac Setup

This is the living setup guide for running the LMS locally on a Mac.

## Current local setup

- Repository: `/Users/tanishagarg/Developer/ace-club-lms`
- Node.js and npm are installed with the official macOS installer.
- `/usr/local/bin` is added to `~/.zprofile`.
- Dependencies are installed in the Git-ignored `node_modules/` folder.
- Local development uses the separate `ace-club-lms-staging` Supabase project.
- Staging project reference: `eyphkkginlgoaxflauog`
- Production project reference: `owmlxsnzogfapotmjrqk`

Never use the production service-role key for local development.

## Terminal verification

Open a new Terminal window and run:

```bash
node --version
npm --version
```

If either command is missing:

```bash
export PATH="/usr/local/bin:$PATH"
```

The persistent PATH entry belongs in `~/.zprofile`:

```bash
export PATH="/usr/local/bin:$PATH"
```

## Install dependencies

Run after a fresh clone or when `package-lock.json` changes:

```bash
cd /Users/tanishagarg/Developer/ace-club-lms
npm ci
```

Do not run `npm audit fix --force`. Review reported vulnerabilities before changing dependency versions.

## Local environment

The local file is:

`/Users/tanishagarg/Developer/ace-club-lms/.env.local`

It is ignored by Git. It currently requires:

```text
NEXT_PUBLIC_SUPABASE_URL=https://eyphkkginlgoaxflauog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Despite the historical `ANON_KEY` variable name, use the staging Supabase publishable key. Do not commit `.env.local`, paste its values into tickets or chats, or add a service-role key until the privileged API routes have server-side authorization.

## Start and stop the app

Start:

```bash
cd /Users/tanishagarg/Developer/ace-club-lms
npm run dev -- --hostname 127.0.0.1
```

Open:

`http://localhost:3000`

Stop the server by clicking its Terminal window and pressing `Control+C`. The server owns that Terminal until it is stopped, so other commands entered while it runs will not execute.

## Validation

With the development server stopped:

```bash
npm run lint
npm run build
```

Record failures in `docs/phase-1/manual-verification-checklist.md`.

## Environment ownership

- Local: `.env.local`, using staging values only.
- Vercel Development/Preview: staging Supabase values.
- Vercel Production: production Supabase values.
- Git: `.env.example` with names only; never secret values.
- Password manager: recovery copy for privileged credentials.

The loose Desktop environment files should be removed only after Vercel, local staging, and the password-manager copy are verified.
